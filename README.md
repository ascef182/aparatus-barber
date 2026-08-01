# Bladiq

Bladiq is a multi-tenant booking and payments platform for independent beauty businesses in the DACH market. It gives barbershops, hair salons, nail studios, and beauty salons a branded booking page, operational calendar, customer portal, deposits, reminders, and German compliance foundations in German, English, and Portuguese.

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

## Current direction

The launch wedge is Beauty DACH, initially with 3–5 assisted design partners in Berlin. Construction, electrician, medical, and dental categories remain in the database for compatibility but are not accepted by public onboarding. See [Product strategy](PRODUCT.md) and [current roadmap](docs/ROADMAP-2026-08-01.md).
