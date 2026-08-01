# Architecture and trust boundaries

## Runtime

Next.js serves the root marketing site, discovery app, tenant storefronts, customer accounts, dashboards, APIs, and Server Actions. A separate BullMQ worker sends notifications and performs maintenance. PostgreSQL is the source of truth; Redis is never authoritative for bookings or payments.

## Tenant boundary

The host resolves the tenant. Client input never selects `organizationId`. Safe-action middleware verifies the session, membership, RBAC, MFA, and trial status, then opens AsyncLocalStorage tenant context. The scoped Prisma extension injects `organizationId`; PostgreSQL RLS repeats the check using transaction-local settings. Composite foreign keys require related rows to share the tenant.

`runWithPlatformScope` is restricted to explicit cross-tenant workflows such as Stripe webhooks, the worker, GDPR, and superadmin reads. Raw Prisma is limited to global Better Auth and Organization models.

## Critical lifecycles

- Booking: availability preview, authoritative service/staff validation, database overlap constraint, optional payment hold, Stripe checkout, webhook confirmation, notification jobs.
- Stripe event: `PROCESSING` claim, idempotent domain mutation, `PROCESSED`; failure becomes `FAILED` and can be reclaimed. A recent concurrent claim receives a retryable response.
- Notification: BullMQ retry, provider acceptance/failure log, final dead-letter visibility. `ACCEPTED` means Resend accepted the request, not that the mailbox delivered it.
- GDPR identity: guest records are only claimed after account email verification, then consolidated within the tenant before export/erasure.

## Deployment

Builds are side-effect free. `pnpm release:migrate` runs once as a release phase before web/worker rollout. Runtime environment validation fails production startup on missing security, payment, storage, or proxy configuration.
