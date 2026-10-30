# Release checklist

Executable, in order. Every item must be checked with real evidence (a command's actual output, a real page load, a real header) — not assumed from a previous sprint's report going stale. See `docs/RELEASE_READINESS_REPORT.md` for the full narrative evidence behind each hardening-program item referenced here.

## Blockers — release is refused if any of these fail

- [ ] Type errors (`pnpm typecheck`)
- [ ] Failing tests (`pnpm test`, `pnpm test:unit`)
- [ ] Failing build (`pnpm build`)
- [ ] Any confirmed cross-tenant data leak
- [ ] Any confirmed double-booking (exclusion constraint bypassed)
- [ ] Any confirmed payment inconsistency (double charge, wrong amount, refund > payment)
- [ ] Broken authentication (sign-in, session, or MFA enforcement)
- [ ] Unhandled critical SSR failure (dashboard error boundary not catching a real dependency outage — see Sprint 9's verification method if this needs re-checking)
- [ ] Missing required environment variable in the target environment (`pnpm env:doctor` plus `docs/ENVIRONMENT.md`'s full list — `env:doctor`'s required list is smaller than `lib/env.ts`'s real one, don't rely on it alone)
- [ ] An untested migration (never run `prisma db push` or an unreviewed migration against production)

Warnings may exist only if documented, understood, and explicitly non-blocking (e.g., the `.claude/**` lint scope gap and Next.js Prisma-client tracing warnings noted in `docs/RELEASE_READINESS.md` — known, harmless, not re-litigated every release).

## 1. Baseline

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test:unit`
- [ ] `pnpm test` (integration)
- [ ] `pnpm build` — from a clean `.next` (`rm -rf .next && pnpm build`), and confirm the built app actually boots (`pnpm start`, `/api/health` returns 200) before trusting a green build exit code alone
- [ ] `pnpm audit --prod --audit-level high`

## 2. Security

- [ ] Tenant isolation: the 6-item checklist in `tests/security/tenant-security-matrix.test.ts` passes
- [ ] IDOR / same-tenant ownership checks reviewed for anything touched since the last release (see Sprint 2's fail-open conditional-spread pattern as the concrete example of what to grep for)
- [ ] CSP/security headers verified present in a real response (`curl -D -H`), not just read from `next.config.ts` — check all 6 (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) against `/`, an API route, and a tenant subdomain
- [ ] No secret committed (check the diff, not just `.gitignore`)
- [ ] Sentry `beforeSend` still sanitizing (spot-check: trigger a real error locally, confirm the Sentry event — if a DSN is configured — doesn't contain PII)

## 3. Auth & MFA

- [ ] Sign-in (email/password) works end to end
- [ ] Google OAuth callback works against the target environment's registered redirect URI
- [ ] MFA grace period enforcement redirects correctly and the `/dashboard/settings` exemption still works
- [ ] Superadmin (`requireSuperadmin`) still denies non-superadmin sessions

## 4. Booking & money

- [ ] Double-booking exclusion constraint test passes (`tests/integration/booking-flow.test.ts`)
- [ ] Timezone-boundary booking test passes (`tests/integration/booking-flow.test.ts` — the Sprint 8 regression test; a real bug existed here once, don't assume it can't come back)
- [ ] Stripe webhook idempotency + refund accumulation tests pass (`tests/integration/stripe-webhooks.test.ts`)
- [ ] Money invariants: no negative/overflow amounts (`tests/integration/booking-flow.test.ts`'s deposit-rounding test)

## 5. Worker & Redis

- [ ] Worker boots and logs `worker.starting` then `worker.ready`
- [ ] Worker responds to `SIGTERM` with `worker.shutting_down` → `worker.shutdown_complete` (verified live once in Sprint 4/9; re-verify if `worker/index.ts`'s shutdown handling changed)
- [ ] Notification idempotency key present on outbound sends (`buildNotificationIdempotencyKey`)

## 6. Database

- [ ] `pnpm exec prisma migrate status` reports the expected state before deploying
- [ ] Any new migration reviewed for destructive operations (`docs/ROLLBACK.md`'s Path A/B distinction)
- [ ] Backup confirmed recent and restorable (`docs/backup-restore.md`) — **not** assumed from a prior drill if it's been a long time since the last one
- [ ] `pnpm release:migrate` run as its own dedicated job, never as a side effect of app boot

## 7. Observability

- [ ] `/api/health` returns 200, no I/O, no topology leak
- [ ] `/api/internal/health` (with `Authorization: Bearer <HEALTHCHECK_SECRET>`) returns within ~2s even when a dependency is degraded (the Sprint 9 fix — re-verify if this route changes again)
- [ ] Sentry receiving events with `route.path`/`tenant.slug`/`errorCategory` tags

## 8. Deploy

- [ ] Web and worker deployed from the **same commit**
- [ ] Rotate any credential exposed outside the secret manager since the last release
- [ ] No canary stage exists in this project's infra today (`vercel.json`/no `railway.json` reviewed, see `docs/DEPLOYMENT.md`) — use Preview → staging → production → immediate monitoring, not a canary rollout that doesn't exist

## 9. Production smoke test (after deploy)

- [ ] Root marketing domain loads
- [ ] `app.{root}` customer discovery domain loads
- [ ] A real tenant subdomain (`{slug}.{root}`) loads its public storefront
- [ ] `/dashboard` and at least 3 other dashboard routes load for an authenticated owner
- [ ] Create one test booking (Stripe test mode where applicable)
- [ ] `/api/internal/health` reports `ok` for all three checks

## 10. Post-deploy monitoring

Watch at 5 min, 15 min, 30 min, 1 hour, 6 hours, 24 hours for: 5xx rate, SSR errors, `DATABASE_ERROR`/`STRIPE_ERROR`/`RESEND_ERROR` tag spikes in Sentry, BullMQ queue depth trend, authentication failure rate, tenant-resolution failures. Roll back immediately (`docs/ROLLBACK.md`) if any `docs/ROLLBACK.md` criterion is met — do not wait through the monitoring windows once a criterion is already confirmed.
