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

## Process model: web vs worker

Two separate long-running processes, deployed from the same commit, never sharing a runtime:

| | Web (`pnpm start` / `next start`) | Worker (`pnpm worker` / `tsx worker/index.ts`) |
|---|---|---|
| Serves | HTTP requests (App Router, Server Actions, API routes) | Nothing — no HTTP server. Pulls jobs from Redis/BullMQ. |
| Queues owned | Producer only (`enqueueBookingNotification` etc., `lib/notifications.ts`) | Consumer — 5 `Worker` instances: `booking-notifications`, `booking-maintenance`, `invitation-notifications`, `quote-request-notifications`, `mfa-reminder-maintenance` |
| Startup logging | Next.js's own boot log | `worker.starting` (lists every queue it's attaching to) then `worker.ready`, both via `lib/logger.ts` — confirm both lines appear in the platform's log stream after every deploy |
| Graceful shutdown | Platform/Next.js default | `SIGTERM`/`SIGINT` → `worker.shutting_down` → `Worker.close()` on all 5 workers (stops pulling new jobs, waits for in-flight ones) → `worker.shutdown_complete` → `process.exit(0)`. Without this, a rolling deploy's SIGTERM would kill a job mid-send instead of letting it finish — the platform must send SIGTERM and wait before SIGKILL (Railway/Docker/k8s all do this by default; do not shorten the grace period below a few seconds). |
| Error logging | `instrumentation.ts` (`onRequestError`) + `app/(protected)/dashboard/error.tsx` (client-side) | Every `Worker`/`Queue` has an `on("error", ...)` handler (`logWorkerError`/`logQueueError` in `worker/index.ts`/`lib/notifications.ts`) — without it, an EventEmitter `error` event with no listener crashes the whole process on a Redis blip. Every worker also has an `on("failed", ...)` handler logging + reporting to Sentry per job. |
| Health | `/api/health` (liveness) + `/api/internal/health` (Postgres/Redis/queue depth) — both live in the **web** process | **No dedicated worker health endpoint** — the worker doesn't run an HTTP server. Liveness is inferred indirectly from the web side: growing queue depth over time in `/api/internal/health` is the signal a worker has stopped consuming. A worker that loses its Redis connection does **not** crash (see error logging above) — it logs and waits for `ioredis`'s own reconnection, so "process alive" and "actually processing jobs" are different signals; monitor queue depth, not just process uptime, to catch a worker that's alive but stuck. |
| Notification idempotency | N/A (producer side only relies on a deterministic `jobId` to avoid double-enqueueing) | Every outbound email is sent with a Resend `idempotencyKey` (`lib/notifications.ts#buildNotificationIdempotencyKey`) — protects against the worker retrying an already-sent job (crash between Resend accepting the send and BullMQ marking the job complete) from producing a duplicate email. `jobId` dedup (producer) and `idempotencyKey` (worker) are two different, complementary layers — the first stops a duplicate *enqueue*, the second stops a duplicate *send* of a job that was only ever enqueued once. |

## Release gate

1. Rotate any credential exposed outside the secret manager and invalidate affected sessions when applicable.
2. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit --prod --audit-level high`, and `pnpm build`.
3. Run `pnpm release:migrate` as the dedicated migration job.
4. Deploy web and worker from the same commit.
5. Smoke-test authentication, tenant subdomains, Cloudinary uploads, both Stripe webhook paths, a Stripe Connect booking, notification processing, and internal health.
6. Promote staging to production only after logs, Sentry, queue depth, database health, and Redis health remain normal.
