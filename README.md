# Bladiq

[![CI](https://github.com/ascef182/aparatus-barber/actions/workflows/ci.yml/badge.svg)](https://github.com/ascef182/aparatus-barber/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ascef182/aparatus-barber/actions/workflows/codeql.yml/badge.svg)](https://github.com/ascef182/aparatus-barber/actions/workflows/codeql.yml)
[![Last commit](https://img.shields.io/github/last-commit/ascef182/aparatus-barber)](https://github.com/ascef182/aparatus-barber/commits)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_6-2D3748?logo=prisma&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe_Connect-635BFF?logo=stripe&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-DC382D?logo=redis&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better_Auth-000000?logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm_11-F69220?logo=pnpm&logoColor=white)

Bladiq is a multi-tenant booking and payments platform for independent beauty businesses in Brazil. It gives barbershops, hair salons, nail studios, and beauty salons a branded booking page, operational calendar, customer portal, deposits, reminders, and LGPD-aligned compliance foundations in Portuguese, English, and German.

## Why this codebase is worth a look

- **Multi-tenant isolation enforced in three independent layers**: a Prisma client that fails closed without tenant/platform context, PostgreSQL Row-Level Security as a second boundary, and composite foreign keys that make cross-tenant relationships structurally impossible, not just "trust the `WHERE` clause."
- **Real payments integration**: Stripe Billing for platform subscriptions *and* Stripe Connect for tenant payouts, with signature-verified, idempotent webhooks as the only write path (`app/api/stripe/*/webhook`).
- **Production-grade test pyramid**: Vitest unit/integration (including dedicated RLS-policy and tenant-isolation suites run against a real ephemeral Postgres via Testcontainers) plus Playwright e2e. See [Testing](#testing).
- **CI that actually gates merges**: dependency audit, lint, typecheck, Prisma migration-drift check, production build, and the full test suite all run on every PR (`.github/workflows/ci.yml`), with CodeQL static analysis on top.
- **Shipped, not a toy**: structured Pino logging, Sentry error taxonomy with PII scrubbing, a BullMQ worker for async notifications, i18n in 3 languages, and a documented release/rollback/incident process (see [Documentation index](#documentation-index)).

## Contents

- [Why this codebase is worth a look](#why-this-codebase-is-worth-a-look)
- [Product surfaces](#product-surfaces)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Commands](#commands)
- [Testing](#testing)
- [Documentation index](#documentation-index)
- [Current direction](#current-direction)

## Product surfaces

- Tenant storefront on `{slug}.bladiq.com` with availability and Stripe Connect checkout.
- Owner/staff dashboard for agenda, services, staff, customers, messages, coupons, billing, and settings.
- Customer account for bookings, profile, messages, and claimed coupons.
- Discovery directory on `app.bladiq.com` and indexable city pages.
- Platform administration, audit trail, GDPR export/erasure, notification worker, and operational health checks.

The repository does **not** currently ship an AI receptionist. AI dependencies and the legacy chatbot claim were removed until customer demand and a safe operational design justify that product.

## Architecture

- Next.js 16 / React 19 / TypeScript
- PostgreSQL / Prisma with application scoping plus PostgreSQL RLS
- Better Auth with organizations, RBAC, Google OAuth, and TOTP MFA
- Stripe Billing and Stripe Connect
- Redis / BullMQ / Resend for asynchronous notifications
- Sentry and structured Pino logs
- next-intl for `de`, `en`, and `pt`

Tenant-owned models carry `organizationId`. The scoped Prisma client fails closed without tenant/platform context, PostgreSQL RLS provides a second boundary, and composite foreign keys prevent cross-tenant relationships. See [Architecture](docs/ARCHITECTURE.md) and [Security Policy](SECURITY.md).

## Project structure

```
app/            Next.js routes: (marketing), (protected) dashboard, api/, t/ tenant storefront, superadmin/
lib/            Domain logic: auth, billing, scheduling, notifications, rate-limit, rules, Prisma client
worker/         Standalone BullMQ worker process (reminders, transactional notifications)
prisma/         Schema and migrations
tests/          Vitest unit/integration + Playwright e2e, plus RLS/tenant-isolation/security suites
scripts/        Operational scripts (env doctor, superadmin bootstrap, retention jobs, dev hosts)
docs/           Architecture, deployment, environment, roadmap, and release documentation
i18n/, messages/  next-intl locales (de, en, pt)
```

## Local development

Requirements: Node.js 22.13+, pnpm 11.18+, PostgreSQL 16, and Redis 7.

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm release:migrate
pnpm env:doctor
pnpm dev
```

`pnpm db:up` starts only PostgreSQL and Redis, so it can be used with the host Next.js process without a port conflict. Use `pnpm stack:up` instead when you want web, worker, migrations, PostgreSQL, and Redis entirely in Docker; do not run `pnpm dev` at the same time.

Stripe webhooks (billing subscriptions, Connect onboarding) only update the database
through `app/api/stripe/billing/webhook/route.ts` and `app/api/stripe/connect/webhook/route.ts`.
There is no other sync path. Locally, those events only reach your machine through the
Stripe CLI: run `stripe listen --forward-to localhost:3000/api/stripe/billing/webhook`
(a second `stripe listen` instance for `/api/stripe/connect/webhook` if you're testing
Connect) and put the printed `whsec_...` into `STRIPE_BILLING_WEBHOOK_SECRET`/
`STRIPE_CONNECT_WEBHOOK_SECRET` in `.env`. Without it running, a subscription or Connect
onboarding can complete on Stripe's side and the local database will never reflect it.

Use `lvh.me:3000` for cross-subdomain development. Run `pnpm worker` in a second terminal when testing reminders and transactional notifications; it loads the same `.env` as the web process. The production runtime uses `RUNTIME_DATABASE_URL` with the restricted `app_runtime` role; `DATABASE_URL` is reserved for migrations.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm release:migrate
pnpm worker
pnpm env:doctor
```

Migrations are a release step and are deliberately not run by `next build`. Production must configure Cloudflare/proxy IP trust, Stripe webhooks, Resend, Cloudinary, Sentry/logging, backup drills, and the internal health secret before beta traffic.

See the [deployment runbook](docs/DEPLOYMENT.md) for local workflows, provider callbacks, runtime-role password rotation, staging, and the production release gate.

## Testing

- `pnpm test`: Vitest unit and integration suites in `tests/`, including Prisma RLS policy checks (`tests/rls-policy.test.ts`) and cross-tenant isolation (`tests/tenant-isolation.test.ts`).
- `pnpm test:unit`: unit-only subset via `vitest.unit.config.ts`, no database required.
- `pnpm test:e2e`: Playwright flows in `tests/e2e/` against a running app; requires `pnpm db:up` (or `pnpm stack:up`) and a seeded/dev database.
- `tests/security/` and `tests/proxy.test.ts` cover auth boundaries and the trusted-proxy IP logic described in [Security Policy](SECURITY.md).
- CI runs lint, typecheck, tests, and CodeQL. See `.github/workflows/ci.yml` and `.github/workflows/codeql.yml`.

## Documentation index

| Doc | Covers |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tenant isolation model, Prisma scoping, RLS |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local workflows, provider callbacks, staging, release gate |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Required environment variables per runtime |
| [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) / [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md) | Pre-release gates |
| [docs/ROLLBACK.md](docs/ROLLBACK.md) | Rollback procedure |
| [docs/INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md) | Incident handling |
| [docs/backup-restore.md](docs/backup-restore.md) | Backup/restore drills |
| [docs/data-retention-policy.md](docs/data-retention-policy.md) | GDPR/LGPD retention and purge jobs |
| [docs/PERFORMANCE_BASELINE.md](docs/PERFORMANCE_BASELINE.md) | Performance baselines |
| [docs/ROADMAP-2026-08-01.md](docs/ROADMAP-2026-08-01.md) | Current roadmap |
| [SECURITY.md](SECURITY.md) | Security invariants, reporting, release gate |
| [PRODUCT.md](PRODUCT.md) | Audience, commercial model, boundaries, success measures |

## Current direction

The launch wedge is Beauty Brazil, initially with 3-5 assisted design partners (specific city/region not yet fixed; see open decisions in `docs/marketing/plan.md`). Construction, electrician, medical, and dental categories remain in the database for compatibility but are not accepted by public onboarding. See [Product strategy](PRODUCT.md) and [current roadmap](docs/ROADMAP-2026-08-01.md).
