# Environment variables

Names, requirement, purpose, and example format only — **never real values**. Full inline rationale for each variable lives in `.env.example`; this document adds the LOCAL / STAGING / PRODUCTION split and cross-references the authoritative, machine-checked source of truth: `lib/env.ts`'s Zod schemas, enforced at boot by `assertRuntimeEnv()` (`scripts/check-runtime-env.ts` for `pnpm build`'s pre-check, and directly in `pnpm start` / `worker/index.ts` for the real production gate). A variable marked **Required** here means the process **throws and refuses to boot** in production if it's missing or invalid — that's deliberate: failing at boot with a clear list beats failing silently mid-request.

## Migration-only (never in web/worker runtime)

| Variable | Required | Purpose | Example format |
|---|---|---|---|
| `DATABASE_URL` | Yes, for the migration job only | Postgres **owner** role — DDL/`CREATE POLICY` for `prisma migrate deploy`. Never given to web or worker. | `postgresql://<user>:<pass>@<host>:5432/<db>` |

## Shared by web and worker (validated in both `lib/env.ts` schemas)

| Variable | Required | Purpose | Example format |
|---|---|---|---|
| `RUNTIME_DATABASE_URL` | Yes | Postgres **`app_runtime`** role (RLS-restricted, no `BYPASSRLS`) — the only DB connection string the app itself ever uses. | `postgresql://app_runtime:<pass>@<host>:5432/<db>` |
| `REDIS_URL` | Yes | Better Auth secondary storage, rate limiting, BullMQ. Use `rediss://` (TLS) outside local. | `redis://<host>:6379` or `rediss://<host>:6379` |
| `RESEND_API_KEY` | Yes | Transactional email (bookings, invitations, MFA reminders). | `re_xxxxxxxxxxxxxxxxxxxx` |
| `EMAIL_FROM` | Yes | From-address for all outbound email; domain must be verified in Resend before production use. | `Bladiq <bookings@yourdomain.com>` |
| `LOGTAIL_SOURCE_TOKEN` | Optional (paired) | Better Stack log sink. Must be set **together with** `LOGTAIL_INGESTING_HOST` or not at all — `lib/env.ts` rejects one without the other. | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `LOGTAIL_INGESTING_HOST` | Optional (paired) | Better Stack ingestion host, paired with the token above. | `s1234567.eu-nbg-2.betterstackdata.com` |
| `LOG_LEVEL` | Optional (default `info`) | Minimum Pino log level. | `info`, `debug`, `warn` |
| `SENTRY_DSN` | Optional | Error tracking (server + edge + worker). Absent = safe no-op, not validated by `lib/env.ts` — read directly via `process.env`. | `https://<key>@<org>.ingest.us.sentry.io/<project>` |

## Web only (`lib/env.ts`'s `webEnvSchema`)

| Variable | Required | Purpose | Example format |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Yes (min 32 chars) | Session/token signing. | random 32+ char string |
| `BETTER_AUTH_URL` | Yes | Root URL Better Auth issues callbacks against. | `https://bladiq.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL, also determines http/https for tenant URL construction (`lib/tenant-host.ts`). | `https://bladiq.com` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Yes (min 3 chars) | Root domain tenant subdomains are resolved against (`{slug}.<this>`). | `bladiq.com` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth sign-in. | OAuth client credentials from Google Cloud Console |
| `STRIPE_SECRET_KEY` | Yes | Server-side Stripe API calls (billing + Connect). | `sk_test_...` / `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Inlined into the client bundle at build time — missing it fails silently in the browser only, after the build itself succeeds. | `pk_test_...` / `pk_live_...` |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Yes | Signature verification for `/api/stripe/billing/webhook`. Separate secret from Connect. | `whsec_...` |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Yes | Signature verification for `/api/stripe/connect/webhook`. | `whsec_...` |
| `STRIPE_PRICE_STARTER_MONTHLY` / `_GROWTH_MONTHLY` / `_PRO_MONTHLY` | Yes | Stripe Price IDs for the three subscription tiers. | `price_...` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Yes | Signed media uploads (`app/api/media/upload/route.ts`). Missing any of the three makes the upload endpoint respond 503. | Cloudinary Dashboard → Product Environment Credentials |
| `HEALTHCHECK_SECRET` | Yes (min 32 chars) | Bearer token for `/api/internal/health` (timing-safe compare). | random 32+ char string |
| `CONSENT_IP_HASH_SECRET` | Yes (min 32 chars) | HMAC key for hashing IPs in consent logs — never store raw IP for consent proof. | random 32+ char string |
| `TRUSTED_PROXY_IP_HEADER` | Yes, one of `cf-connecting-ip` \| `x-real-ip` \| `x-forwarded-for` | Which header `lib/rate-limit.ts` trusts for client IP. Must match the actual edge in front of the origin — see Provider configuration below. | `cf-connecting-ip` (behind Cloudflare) |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Same DSN as `SENTRY_DSN`, exposed to the browser bundle (`instrumentation-client.ts`). Sentry DSNs are designed to be public, not secret. | same format as `SENTRY_DSN` |

## Worker only

Nothing worker-exclusive today — the worker schema (`workerEnvSchema`) is a strict *subset* of the web one (shared vars above + `RESEND_API_KEY`/`EMAIL_FROM`, already listed). It deliberately does **not** require `GOOGLE_CLIENT_ID`, `STRIPE_*`, `CLOUDINARY_*`, `HEALTHCHECK_SECRET`, `CONSENT_IP_HASH_SECRET`, or `TRUSTED_PROXY_IP_HEADER` — the worker never serves HTTP requests or handles those concerns.

## Local-only / dev tooling (never set outside a developer's machine)

| Variable | Required | Purpose | Example format |
|---|---|---|---|
| `E2E_STRIPE_CONNECT_ACCOUNT_ID` | Optional, local E2E only | A real Stripe test-mode Connect account, used only by `tests/e2e/global-setup.ts` so `pnpm test:e2e` can reach the real Stripe Checkout redirect. Without it, the E2E booking-payment test fails at Stripe's own API call (see `docs/RELEASE_READINESS.md`) — a placeholder passes the app's own gate but not Stripe's. | `acct_...` |

## Environment matrix

| | Local | Staging/Preview | Production |
|---|---|---|---|
| `DATABASE_URL` | `docker compose` Postgres, plaintext OK | Provider owner URL, TLS | Provider owner URL, TLS, exposed only to the migration job |
| `RUNTIME_DATABASE_URL` | `docker compose` Postgres | Provider `app_runtime` URL, TLS | Provider `app_runtime` URL, TLS — **rotate the bootstrap password first**, see below |
| `REDIS_URL` | `docker compose` Redis | Provider TLS URL, `noeviction` policy | Provider TLS URL, `noeviction` policy |
| Stripe keys | `sk_test_...` / `whsec_...` from `stripe listen` | `sk_test_...`, real webhook secrets from the Stripe Dashboard's test-mode endpoint | `sk_live_...`, real webhook secrets from the Stripe Dashboard's live-mode endpoint |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | `http://lvh.me:3000` | Preview deployment URL (HTTPS) | `https://bladiq.com` |
| `TRUSTED_PROXY_IP_HEADER` | `x-real-ip` | Match the actual preview edge | `cf-connecting-ip` if Cloudflare fronts the origin, else the platform's own header (see `docs/DEPLOYMENT.md`) |
| `E2E_STRIPE_CONNECT_ACCOUNT_ID` | Optional, only if running `pnpm test:e2e` | Not set | Not set |

## Bootstrap password rotation (non-local databases)

The RLS migration (`prisma/migrations/20260720120000_add_rls_policies`) creates the `app_runtime` role with a bootstrap password so a freshly-migrated local database is immediately usable. **Immediately after the first migration on every non-local database**, connect as the owner and rotate it:

```sql
ALTER ROLE app_runtime WITH PASSWORD '<unique-generated-password>';
```

Then build `RUNTIME_DATABASE_URL` from that new password. Never let the bootstrap password reach staging or production `RUNTIME_DATABASE_URL`.

## Validating a new environment

Run `pnpm env:doctor <path-to-env-file>` against a locally-prepared, **non-committed** representation of the target environment's variables before copying them to the platform's secret manager. It never prints values, only variable names and pass/fail.

`env:doctor` (`scripts/env-doctor.ts`) is a **separate, lighter heuristic checker**, not a re-run of `lib/env.ts`'s Zod schemas — it catches a different, overlapping set of problems: a variable defined twice in the same file, `BETTER_AUTH_SECRET`/`HEALTHCHECK_SECRET`/`CONSENT_IP_HASH_SECRET` under 32 characters or still containing a placeholder word (`generate`, `change_me`, etc.), an invalid `TRUSTED_PROXY_IP_HEADER` value, known-unused legacy variable names (`UPLOADTHING_*`, `CLOUDINARY_URL`), and a smaller required-variable list than `lib/env.ts`'s (Stripe/Cloudinary/Google vars are only *warned* on here, not hard-failed). It is a **fast pre-check**, not a substitute for the real gate: the authoritative, hard-fail validation is `assertRuntimeEnv()` in `lib/env.ts`, enforced at boot by `pnpm start` and `worker/index.ts` in production. A `.env` file can pass `env:doctor` cleanly and still fail to boot if it's missing a variable `env:doctor` doesn't check for (e.g. a Stripe price ID) — treat a clean `env:doctor` run as a helpful smoke test, not proof the environment is complete.
