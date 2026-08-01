# Deployment runbook

## Local development

1. Copy `.env.example` to `.env`, replace every secret placeholder, and run `pnpm env:doctor`.
2. Start only infrastructure with `pnpm db:up`.
3. Apply existing migrations with `pnpm release:migrate`.
4. Start the web process with `pnpm dev` and, when notifications are in scope, start `pnpm worker` in another terminal.
5. Use `http://lvh.me:3000`; add tenant hosts with `pnpm dev:hosts add <slug>` if DNS rebinding protection blocks `lvh.me`.

`pnpm stack:up` is the alternative full-container workflow. It owns port 3000, so do not combine it with `pnpm dev`.

## Staging and production

The deployment platform must store secrets outside the repository. Run `pnpm env:doctor` against a locally prepared, non-committed representation before copying values to the platform, then use its own environment validation and secret inventory.

- `DATABASE_URL` authenticates as the database owner and is exposed only to the migration job.
- `RUNTIME_DATABASE_URL` authenticates as `app_runtime` against the same database and is exposed to web and worker.
- `REDIS_URL` is the TLS connection URL used by Better Auth, rate limits, and BullMQ. Configure the provider with `noeviction`.
- Web receives the complete web environment contract from `lib/env.ts`; worker receives only database, Redis, Resend, email, logging, and Sentry variables.

The RLS migration creates `app_runtime` with a bootstrap password so a clean local database is usable. Immediately after the first migration on every non-local database, use the provider SQL console as owner to replace it:

```sql
ALTER ROLE app_runtime WITH PASSWORD '<unique-generated-password>';
```

Build `RUNTIME_DATABASE_URL` from that password and the same Neon/PostgreSQL host, retaining TLS parameters such as `sslmode=require`. Never place the owner URL in the web or worker runtime environment.

## Provider configuration

- Google OAuth: register `http://lvh.me:3000/api/auth/callback/google` locally and the corresponding HTTPS production callback.
- Stripe: create separate signing secrets for `/api/stripe/billing/webhook` and `/api/stripe/connect/webhook`; use test-mode credentials in staging.
- Resend: verify the sender domain before using `Bladiq <bookings@bladiq.com>` in production.
- Cloudinary: configure the three individual credentials; `CLOUDINARY_URL` is not consumed.
- Cloudflare: set `TRUSTED_PROXY_IP_HEADER=cf-connecting-ip` only when direct access to the origin is blocked. Local development uses `x-real-ip`.
- Health monitoring: call `/api/health` for liveness and `/api/internal/health` with `Authorization: Bearer <HEALTHCHECK_SECRET>` for dependency health.

## Release gate

1. Rotate any credential exposed outside the secret manager and invalidate affected sessions when applicable.
2. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit --prod --audit-level high`, and `pnpm build`.
3. Run `pnpm release:migrate` as the dedicated migration job.
4. Deploy web and worker from the same commit.
5. Smoke-test authentication, tenant subdomains, Cloudinary uploads, both Stripe webhook paths, a Stripe Connect booking, notification processing, and internal health.
6. Promote staging to production only after logs, Sentry, queue depth, database health, and Redis health remain normal.
