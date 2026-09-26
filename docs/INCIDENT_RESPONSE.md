# Incident response runbook

## First 5 minutes: triage, not fixing

1. **Confirm it's real.** `/api/health` (200 = process alive) then `/api/internal/health` with `Authorization: Bearer <HEALTHCHECK_SECRET>` (Postgres/Redis/queue depth). A degraded `/api/internal/health` with a fast response is a real dependency issue; a *hanging* response to it is itself notable (see the Redis-outage finding in `docs/PERFORMANCE_BASELINE.md`'s Sprint 9 history — fixed, but the pattern — a check taking far longer than its stated budget — is a signal worth trusting even in checks not covered here yet).
2. **Classify by the error taxonomy** (`lib/error-taxonomy.ts`, tagged on every Sentry event as `errorCategory`): `TENANT_ISOLATION_ERROR` (drop everything, see below), `DATABASE_ERROR`, `STRIPE_ERROR`, `RESEND_ERROR`, or `INTERNAL_ERROR`. This tells you which dependency to check first without reading stack traces.
3. **Check what changed.** Was there a deploy in the last hour? A migration? A third-party status page incident (Stripe, Resend, the Postgres/Redis provider)?
4. **Decide: rollback or forward-fix.** If the trigger was a recent deploy and it matches a `docs/ROLLBACK.md` criterion, roll back first — do not debug forward under pressure while the bad version is still serving traffic.

## `TENANT_ISOLATION_ERROR` — stop and treat as a blocker, always

Any `MissingTenantContextError` or `CrossTenantWriteError` reaching Sentry (`lib/error-taxonomy.ts`) means the fail-closed tenant-scoping layer (`lib/db.ts`) caught something — by design, this should never happen in normal operation. Do not dismiss as noise:

1. Identify the exact request (Sentry event has `route.path`, `route.type`, `tenant.slug` tags from `instrumentation.ts`, plus a `requestId` if it went through `lib/logger.ts`'s `runWithRequestContext`).
2. Determine whether any response was actually sent with cross-tenant data **before** the error was thrown (the extension throws before the query runs — but a bug in the calling code could theoretically have already used data from a different, earlier query in the same request). If in doubt, treat it as a possible exposure and follow the "cross-tenant data exposure" path in `docs/ROLLBACK.md`.
3. Do not resolve by loosening the tenant-scoping check. Fix the caller that reached an unscoped code path.

## Dependency-specific triage

### `DATABASE_ERROR`

- Check `/api/internal/health`'s `database` block for latency/status.
- Check the Postgres provider's own status page and connection count (the pool is sized at 20, see `lib/prisma.ts`'s comment on why).
- `connectionTimeoutMillis: 10_000` means a genuinely unreachable host fails within 10s, not hangs — if requests are hanging longer than that on DB calls, something other than a simple unreachable-host scenario is happening (e.g., a slow query holding the pool).
- Recovery is automatic once Postgres is reachable again (verified live in Sprint 9's failure injection) — no process restart needed.

### Redis-related (queue growing, sessions failing, rate limiting bypassed)

- Redis errors don't have their own `errorCategory` tag (see `lib/error-taxonomy.ts`'s documented limitation — ioredis and pg share generic Node error codes) — look for `queue.connection_error` / `worker.connection_error` log lines (`lib/notifications.ts` / `worker/index.ts`) instead.
- `/api/internal/health`'s `redis` and `worker.queue_depth` fields are the fastest signal. A growing `queue_depth` over consecutive checks means jobs aren't draining — check whether the worker process is actually running, not just whether Redis is reachable (a worker can be alive but stuck, per `docs/DEPLOYMENT.md`'s process-model table).
- Rate limiting is fail-closed by design (`lib/rate-limit.ts`) — a Redis outage makes login/reset attempts fail, not bypass the limit. If you observe the opposite (rate limiting silently not applying), that's a regression, not expected degraded behavior.
- Recovery is automatic once Redis is reachable again (verified live in Sprint 9) — no process restart needed for web; a worker whose queue connection recovers resumes consuming without intervention.

### `STRIPE_ERROR`

- Check Stripe's own status page first.
- Webhook processing is idempotent per event (`lib/services/stripe-event-service.ts`'s `claimStripeEvent`) and per individual Stripe object where relevant (refunds — see `claimRefundApplication`) — a burst of retried webhooks after a Stripe-side incident should not cause duplicate state transitions or duplicate charges. If it does, that's a regression from the Sprint 3 hardening, not expected behavior.
- `STRIPE_BILLING_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET` are separate — confirm which endpoint is actually failing before assuming both are affected.

### `RESEND_ERROR`

- Lowest severity of the four dependency categories — a Resend outage delays notification emails (BullMQ retries with exponential backoff, `attempts: 5`) but does not block booking, payment, or auth flows, which are all synchronous and don't depend on email delivery succeeding.
- Every send carries an idempotency key (`lib/notifications.ts#buildNotificationIdempotencyKey`) — retries during a Resend incident should not produce duplicate emails once the incident clears and Resend catches up.
- Check `NotificationLog` (`FAILED` status rows) for the actual scope of affected notifications once resolved.

### Worker offline / crash-looping

- Confirmed via failure injection (Sprint 9): a job enqueued while the worker is down persists safely in Redis and drains once the worker restarts — no data loss from a worker outage alone.
- If the worker is crash-looping (not just stopped), check `worker.starting`/`worker.ready`/`worker.shutting_down` log lines — a worker that logs `worker.shutting_down` repeatedly without a corresponding external SIGTERM (i.e., not a deliberate deploy) indicates a crash inside the process, not a clean shutdown.

## Escalation and communication

This is a single-operator project today — there is no on-call rotation or status page integration documented here. If that changes, add: who gets paged for which `errorCategory`, and where customer-facing status updates are posted.

## After the incident

1. Write down what happened, when, and the fix (rollback commit, forward-fix commit, or both).
2. If the root cause maps to a gap this hardening program didn't cover, add it to a future sprint rather than only fixing it ad hoc — the program's whole premise (`docs/RELEASE_READINESS.md`) is that gaps get closed once, with evidence and a test, not patched silently.
3. Update this runbook if the incident revealed a triage step that was missing.
