# Bladiq — Release Readiness Baseline

**Sprint:** 0 — Baseline
**Date:** 2026-09-25
**Purpose:** establish the exact current state of the codebase before any hardening work begins. This document is not a release decision — it is evidence. See `docs/RELEASE_READINESS_REPORT.md` (created at the end of the program) for the final READY / NOT READY call.

---

## 1. Repository state

| | |
|---|---|
| Path | `/Users/pam/Documents/bladiq/aparatus-barber` (git worktree) |
| Current branch | `phase-b-hardening` |
| Current commit | `dc9b81e43a087207f62607fa580781d273722835` |
| Tracking | `origin/phase-b-hardening` (in sync for all tracked files) |
| Relationship to `main` | 575 files changed, +74168/-5194 — a long-lived feature branch with substantial prior committed work (Pix payments, BR market localization/LGPD compliance, booking reference photos, CI/CD, a large test suite, docs). This diff predates this program; `phase-b-hardening` HEAD is the working baseline, not `main`. |
| Sibling worktree | `aparatus-barber-depbot` on an unrelated dependabot branch — out of scope |

### Last 10 commits (current branch)

```
dc9b81e fix(seo): corrige meta description global que ainda citava "German legal compliance"
e8dce49 fix(deps): atualiza Next.js e overrides pra fechar 7 vulnerabilidades altas/críticas
133931d Merge branch 'main' into phase-b-hardening
f58d45f fix(booking): corrige drift de FK e colisão de horário achados ao validar migração
77965c3 feat(booking): cliente pode anexar fotos de referência ao agendar
192625a docs(legal): fecha lacuna de retenção GoBD + pacote de revisão jurídica + mapeamento BR
9c6ae4b feat(payments): habilita Pix no depósito de reserva via Stripe Connect
2853e00 fix(pricing): corrige erro factual (Trinks não cobra comissão) e recalibra preço BRL
84a044a feat(legal): substitui compliance alemã (Impressum/GoBD/GDPR) por LGPD
5cad6b2 feat(tenant): troca defaults de mercado EU→BR (moeda, timezone, país, locale)
```

### Uncommitted changes (the "incident remediation WIP")

**Modified (tracked, unstaged):**
- `lib/prisma.ts` — adds `connectionTimeoutMillis: 10_000`, `max: 20` (pool size), `transactionOptions: { maxWait: 10_000, timeout: 10_000 }`, with comments citing the production incident (`ETIMEDOUT` in prod SSR) and `P2028` transaction-timeout contention from the RLS mini-transaction pattern.
- `lib/rate-limit.ts` — adds `connectTimeout: 10_000`, `maxRetriesPerRequest: 1`, `retryStrategy: (times) => Math.min(times * 200, 5000)`.
- `app/(protected)/dashboard/layout.tsx` — migrated to call `getDashboardContext(requestHeaders)` instead of resolving session/org/membership inline.
- `app/(protected)/dashboard/agenda/page.tsx`, `app/(protected)/dashboard/settings/page.tsx` — migrated to `getDashboardContext`.
- `instrumentation.ts` — modified (supports the new error boundary's Sentry reporting).
- `messages/de.json`, `messages/en.json`, `messages/pt.json` — modified (locale strings for the new error boundary).

**Untracked (new files):**
- `app/(protected)/dashboard/error.tsx` — client component error boundary. Reports to Sentry via `captureException` in a `useEffect`; renders a retry button; does not expose stack trace, DB hostname, or secrets in the UI.
- `lib/services/dashboard-context-service.ts` — `React.cache()`-wrapped `getDashboardContext(headers)`, keyed by the request `Headers` instance, dedupes session + org + membership resolution within one request.

**Untracked but unrelated to this program (leave untouched):**
- `BLADICQ_ARCHITECTURE_DISCOVERY.md`, `docs/marketing/*` (6 files), `.claude/` — leftovers from a prior architecture-audit / marketing session, not part of the hardening work.

### Incident-condition status (informational — validation is Sprint 1's job, not Sprint 0's)

| # | Condition from the incident audit | Current status |
|---|---|---|
| 1 | `lib/prisma.ts` missing `connectionTimeoutMillis` | Fixed in uncommitted WIP. **Not yet validated** against driver docs / real timeout scenarios — Sprint 1. |
| 2 | `lib/rate-limit.ts` missing `connectTimeout` | Fixed in uncommitted WIP. **Not yet validated** against Redis-down/slow scenarios — Sprint 1. |
| 3 | No dashboard `error.tsx` | Fixed in uncommitted WIP (untracked file exists, implemented). |
| 4 | Duplicated session/org/membership resolution (layout + every page) | **Partially fixed.** `dashboard-context-service.ts` exists and is wired into `layout.tsx` + 2 of 11 pages (`agenda`, `settings`). **9 pages still resolve independently**: `dashboard/page.tsx` (overview), `billing`, `coupons`, `customers`, `messages`, `messages/[conversationId]`, `profile`, `services`, `staff`. Full migration is Sprint 1 scope. |

None of items 1–3 are committed or test-covered yet — they sit as uncommitted working-tree edits.

---

## 2. Tooling

| | |
|---|---|
| Node | v26.10.0 |
| pnpm | 11.18.0 (matches `package.json` `packageManager: pnpm@11.18.0` exactly) |
| `engines.node` | `>=22.13` |
| Lockfile | `pnpm-lock.yaml` present, `lockfileVersion: '9.0'`, consistent with installed pnpm |

### Key dependency versions

| Package | Version |
|---|---|
| next | 16.3.6 |
| react / react-dom | 19.2.0 |
| typescript | ^5 (unpinned) |
| better-auth | 1.6.23 |
| prisma / @prisma/client | 6.18.0 |
| @prisma/adapter-pg | ^6.19.0 |
| stripe | 22.1.0 |
| resend | ^6.17.2 |
| @sentry/nextjs / @sentry/node | ^10.65.0 |
| next-safe-action | 8.0.11 |
| next-intl | ^4.13.2 |
| bullmq | ^5.80.2 |
| ioredis | ^5.11.1 |
| vitest (dev) | ^4.1.10 |
| @playwright/test (dev) | ^1.61.1 |
| @testcontainers/postgresql (dev) | ^12.0.4 |

Note: `CLOUDINARY_*` env vars are declared in `.env.example` but the `cloudinary` npm package is **not** a dependency — media upload goes through a custom path (`app/api/media/upload/route.ts`, `lib/media-security.ts`), not the Cloudinary SDK. Documented, not a defect.

---

## 3. Baseline command results

Local infra (`pnpm db:up` → Postgres 16 + Redis 7 via `docker compose up -d postgres redis`) was brought up successfully and both containers reported `healthy` immediately (pre-existing data volume). Docker 29.6.2 confirmed available.

| Command | Result | Detail |
|---|---|---|
| `pnpm typecheck` | ✅ PASS | `next typegen && tsc --noEmit` — clean, zero errors. |
| `pnpm lint` | ✅ PASS (application code) / ⚠️ pre-existing gap | 0 problems in any application file (`app/`, `lib/`, `tests/`, etc.). **629 errors + 77 warnings**, all `@typescript-eslint/no-require-imports`, are confined entirely to `.claude/scripts/**` and `.claude/skills/**` — Claude Code's own tooling directory, not app code. `eslint.config.*`'s `globalIgnores` does not exclude `.claude/**`, so these legacy CommonJS scripts get linted against a TypeScript-project ruleset they were never meant to satisfy. Pre-existing config gap, unrelated to this program; **not fixed in Sprint 0** (out of scope — no app code impact). |
| `pnpm test:unit` | ✅ PASS | 6 test files, 19/19 tests passed. (One test intentionally logs a `StripeInvalidRequestError` as part of exercising the Stripe-Tax-unsupported-country fallback path — expected, not a failure.) |
| `pnpm test` (integration) | ✅ PASS | 34 test files, **218/218 tests passed**. Runs against its own ephemeral Testcontainers Postgres (ran all 30 Prisma migrations cleanly), independent of the `db:up` containers. Covers tenant isolation, IDOR, RBAC, RLS, MFA, Stripe webhooks, rate limiting, auth bypass, booking flows, etc. |
| `pnpm build` | ✅ PASS | Exit code 0, `✓ Compiled successfully`. Two non-blocking Next.js static-analysis warnings: "Dynamic filesystem access causes tracing of the whole project," triggered by the generated Prisma client's use of `process.cwd()` (`generated/prisma/index.js`, `generated/prisma/runtime/client.js`), flowing into 3 import traces (`api/stripe/connect/webhook`, `account/bookings` page via `organization-service.ts`, `api/auth/[...all]`). Known Next.js/Prisma interaction, not a build error — worth a look in Sprint 6 (performance/deploy size) but not blocking. |
| `pnpm test:e2e` | ❌ **FAIL** — root cause identified, pre-existing | 1/1 test failed: `tests/e2e/guest-booking-payment.spec.ts`. **Root cause:** `playwright.config.ts`'s default `baseURL` (`http://lvh.me:${PORT}`, i.e. the marketing root domain) does not point at the seeded tenant subdomain (`e2e-test.lvh.me`, which `pnpm dev:hosts` already provisions in `/etc/hosts`). The spec's `page.goto("/")` loads the marketing landing page, which has no "Book" button, so `page.getByRole("button", { name: "Book" }).click()` times out after 60s waiting for an element that will never appear on that host. `PLAYWRIGHT_BASE_URL` is not set anywhere (`.env`, `.env.example`) and the `test:e2e` script doesn't pass one either. A second, downstream blocker exists but was never reached: `E2E_STRIPE_CONNECT_ACCOUNT_ID` is not set in `.env`, so the fixture falls back to a placeholder (`acct_e2e_test_placeholder`) that — per the test's own code comment — causes the real `stripe.checkout.sessions.create` call to fail Stripe-side once the flow gets that far. The spec's own header comment states this suite deliberately **does not run in CI today** ("não roda em CI hoje, é verificação manual antes de deploy") — this is a pre-existing gap in manual-verification tooling, not a regression introduced by the current WIP. **Not fixed in Sprint 0** — flagged for Sprint 8 (E2E) since fixing the baseURL/fixture plumbing is in-scope there, not as a Sprint 0 side-fix. |

---

## 4. Known warnings (documented, non-blocking, not fixed in Sprint 0)

1. `.claude/**` lint errors — eslint config scope gap (see §3).
2. Next.js build-time tracing warnings on the generated Prisma client (`process.cwd()` usage) — see §3.
3. Duplicate `REDIS_URL=redis://localhost:6379` line in `.env` — cosmetic (identical value both times, last one wins), no functional impact.
4. `CLOUDINARY_*` env vars declared without a corresponding npm dependency — documented in §2, likely a custom/REST integration rather than the SDK.
5. E2E suite (`tests/e2e/guest-booking-payment.spec.ts`) has two compounding pre-existing gaps (baseURL/tenant-host mismatch, missing `E2E_STRIPE_CONNECT_ACCOUNT_ID`) that keep it from ever exercising the Stripe Checkout redirect it's meant to verify — see §3.

## 5. Known production incidents driving this program

See the prior Production Incident Audit: missing Postgres `connectionTimeoutMillis`, missing Redis `connectTimeout`, no dashboard error boundary, duplicated session/org/membership resolution causing N+1 queries across the dashboard. Status of each: see §1 "Incident-condition status" table above.

## 6. Test/CI infrastructure already in place (don't rebuild — extend)

- CI: `.github/workflows/ci.yml`, `.github/workflows/codeql.yml` already exist.
- 39 files under `tests/` already provide meaningful coverage of tenant isolation, IDOR, RBAC, RLS, MFA, host/proxy resolution, Stripe webhooks, rate limiting, auth bypass, and booking flows — later sprints should build on this, not assume gaps that don't exist.
- Health checks already exist: `app/api/health/route.ts` (public liveness) and `app/api/internal/health/route.ts` (authenticated, checks Postgres/Redis/BullMQ queue depth).
- Docs that already exist: `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`, `docs/LAUNCH-READINESS.md`, `docs/backup-restore.md`, `docs/data-retention-policy.md`. Docs that do **not** yet exist: `docs/RELEASE_READINESS.md` (this file, now created), `docs/ROLLBACK.md`, `docs/INCIDENT_RESPONSE.md`, `docs/RELEASE_CHECKLIST.md`, `docs/ENVIRONMENT.md`, `docs/RELEASE_READINESS_REPORT.md`.

## 7. Two known, documented architectural gaps flagged for later sprints (not addressed here)

- `proxy.ts` does pure Host-header→path routing with no `x-forwarded-host` handling — production Host-header trust depends entirely on reverse-proxy configuration (`TRUSTED_PROXY_IP_HEADER`), unverifiable from the repo alone. Sprint 2 candidate.
- Sentry has zero `beforeSend`/PII-scrubbing hooks across all 4 init points (`sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`, `worker/index.ts`) — confirmed by direct grep, zero matches. Sprint 5 candidate.

---

## BASELINE = PASS

Every command was attempted; nothing was skipped or masked. Core gate commands — `typecheck`, `lint` (application code), `test:unit`, `test` (integration, 218/218), `build` — all pass cleanly. The one failing command, `test:e2e`, has a fully diagnosed, pre-existing root cause unrelated to the incident WIP (it predates this program and doesn't run in CI today); it's documented above and carried forward as a named item for Sprint 8, not silently dropped.

No code was modified in Sprint 0. The uncommitted incident-remediation WIP (`lib/prisma.ts`, `lib/rate-limit.ts`, dashboard layout/pages, `dashboard-context-service.ts`, `error.tsx`) remains exactly as found, pending Sprint 1 validation and commit.
