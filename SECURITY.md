# Security policy

## Reporting

Do not open a public issue for a suspected vulnerability. Send a private report to the repository owner with impact, affected route/tenant, reproduction steps, and whether customer or payment data may be involved. Do not access data that is not your own.

## Security invariants

- Tenant identity comes from the host and verified membership, never request payloads.
- Every tenant model is registered in `TENANT_MODELS`, protected by RLS, and covered by isolation tests.
- Every relationship between tenant models includes tenant ownership validation and, where supported, a composite foreign key.
- Stripe signatures are verified on the raw body; events are recoverable and idempotent.
- Dynamic values in HTML email are escaped; URLs are protocol-validated.
- Production trusts only the configured proxy IP header and the origin must not be publicly bypassable.
- Secrets never enter logs, Sentry context, commits, or client bundles.

## Release gate

Before beta or production deployment: dependency audit has no high/critical findings, CI and migration drift are green, Stripe test-mode E2E passes, restore has been drilled, Cloudflare protects the origin, MFA enforcement is active, and Sentry/log alerts have an owner.

The bootstrap password created for the `app_runtime` database role is local-only. Every hosted database must replace it immediately after the first migration and store the resulting runtime URL separately from the owner migration URL. See the [deployment runbook](docs/DEPLOYMENT.md).

## Incident response

1. Preserve logs and affected Stripe/provider event IDs without copying PII.
2. Disable the affected route, tenant, integration key, or deployment when containment is safer than continued operation.
3. Rotate exposed credentials and revoke sessions when identity boundaries may be affected.
4. Reconcile bookings, payments, refunds, notification failures, and audit events from authoritative providers.
5. Assess GDPR notification duties with qualified counsel and document the timeline and remediation.
