# Rollback runbook

Two independent rollback concerns — application code and database schema. **Always check whether a migration shipped with the release before deciding which one you need.** Rolling back application code alone, when the release also carried a migration, can leave the app running against a schema it doesn't expect.

## Rollback criteria — when to roll back, not "wait and see"

Roll back immediately, without waiting to see if it improves, if any of the following is observed after a deploy:

- Cross-tenant data exposure (any evidence tenant A saw tenant B's data)
- Authentication failure (users can't sign in, or existing sessions are rejected en masse)
- Payment/booking data corruption (double charge, wrong amount, double booking, incorrect refund)
- A sustained increase in 5xx responses beyond the pre-deploy baseline
- A failed or partially-applied database migration
- Worker process crash-looping (not just a Redis blip it recovers from — see `docs/DEPLOYMENT.md`'s process model table for the difference)
- Any critical security regression (a Sprint 2/7-class finding reappearing: tenant isolation, CSP, auth bypass)

Do not treat these as "monitor and decide later" — the cost of a false-positive rollback is redeploying the previous commit; the cost of leaving one of these running is compounding (more corrupted bookings, more exposed data, more affected sessions) for every minute it stays up.

## Application rollback (no migration involved)

1. Identify the last known-good commit/deployment (the one immediately before the bad release).
2. Redeploy that commit through the platform's normal deploy path — do not hotfix forward under incident pressure; roll back first, fix forward later with the normal release gate.
3. Deploy **web and worker from the same commit**, same as any release (`docs/DEPLOYMENT.md`'s release gate) — never let them diverge, even during an incident.
4. Re-run the production smoke test (`docs/RELEASE_CHECKLIST.md`) against the rolled-back version.
5. Confirm via `/api/internal/health`, Sentry, and queue depth that the system is back to the pre-incident baseline before declaring the rollback complete.

## Database rollback (a migration shipped with the bad release)

**Prisma migrations are forward-only** — there is no `prisma migrate down`. Rolling back a schema change means one of two paths, decided by what the migration actually did:

### Path A — the migration was purely additive (new table/column/index, nothing dropped or renamed)

The old application code (from the rollback commit) simply ignores the new column/table. No database action needed — roll back the application only, per the section above. This is the common case and the reason additive-only migrations are strongly preferred during active development (see `prisma/migrations/20260801101000_tenant_relation_integrity` for an example of the alternative: a constraint replaced in the same migration that added its replacement — reviewed and confirmed non-destructive to data, only to constraint definitions).

### Path B — the migration dropped or renamed something the old code needs

This is the dangerous case, and why destructive migrations are never run automatically in production (see `docs/RELEASE_CHECKLIST.md`'s release gate). Two options, in order of preference:

1. **Restore from backup** — follow `docs/backup-restore.md`'s verified restore procedure, into a **new** database, never overwriting the live one in place. Point `RUNTIME_DATABASE_URL`/`DATABASE_URL` at the restored database only after confirming `prisma migrate status` and the `app_runtime` grants are correct (both explicitly checked in that runbook). Accept the data loss window between the backup and the incident.
2. **Write a compensating migration** that reintroduces what was dropped, if a backup restore is worse than the data-loss window (e.g., the drop was hours ago and a lot of legitimate data has been written since). This requires a human decision, not an automated step — there is no generic way to "undo" a `DROP COLUMN` without knowing whether anything relied on that column's old data.

### Before any release that includes a migration

- Migration reviewed for destructive operations (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, a `DROP CONSTRAINT` not immediately paired with an equivalent replacement in the same migration).
- Migration tested against a local copy of production-shaped data, not just an empty dev database.
- A rollback plan (Path A or Path B above) written down **before** deploying, not improvised during an incident.
- Backup confirmed recent and restorable — `docs/backup-restore.md`'s drill procedure, run before the release, not assumed.

## Recovery verification checklist (after any rollback)

- [ ] `/api/health` returns `200`
- [ ] `/api/internal/health` reports `status: "ok"` for database, redis, and worker
- [ ] `pnpm exec prisma migrate status` reports the expected state (no pending/failed migrations)
- [ ] Sentry error rate back to baseline
- [ ] Queue depth (`/api/internal/health`'s `worker.queue_depth`) draining, not growing
- [ ] Spot-check: sign in, load a tenant dashboard, load a tenant's public storefront — all three domains (`bladiq.com`, `app.bladiq.com`, `{tenant}.bladiq.com`) touch different code paths in `proxy.ts`
