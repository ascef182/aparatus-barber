# Performance baseline

**Measured:** 2026-09-25, Sprint 6 of the hardening program. Real measurements against a local production build (`pnpm build && pnpm start`), local Postgres/Redis (`pnpm db:up`), on a seeded tenant with **80 customers, 6 staff, 15 services, ~210 bookings** spread across a 60-day window (past + future) — large enough that N+1 patterns would show up as counts scaling with row count, not as a fixed small number.

This is a **local baseline**, not a production one. Network latency to a managed Postgres/Redis (not localhost), concurrent load, and cold starts on serverless are not represented here. Treat these numbers as a floor (production will be slower, not faster) and as a regression baseline for future local measurements, not as an SLA.

## Method

- `lib/prisma.ts` temporarily instrumented with `log: [{emit: "event", level: "query"}]` behind an env flag, counting raw SQL statements per request (removed after measurement — not shipped).
- Timing via `curl -w "%{time_starttransfer} %{time_total}"`, 5 requests per route, first request discarded (cold: Next.js route/module init) unless noted.
- Because `lib/db.ts`'s tenant-scoping extension wraps every tenant-scoped Prisma call in `$transaction([set_config, query])` for RLS (Section 4 of the RLS plan), **every logical query costs 2 raw SQL statements**. The counts below are raw statements as measured; divide by ~2 for an approximate logical-query count.

## Measured: TTFB / total time (warm, after first request)

| Route | TTFB | Total | Raw query count |
|---|---|---|---|
| `/dashboard` (overview, owner) | ~55-70ms | ~65-70ms | 46 (was 52 before this sprint's fix) |
| `/dashboard/agenda` | ~35-60ms | ~50-70ms | 27 |
| `/dashboard/customers` (80 customers) | ~30-45ms | ~45-60ms | 25 |
| `/dashboard/staff` | ~40-55ms | ~50-60ms | 27 |
| `/dashboard/services` | — | — | 19 |
| `/` on tenant host (public storefront, unauthenticated) | ~25-30ms | ~28-30ms | 20 |

Cold first-hit (route/module compilation in the `next start` process, not present in a warmed serverless instance or after the first request in any given deployment): ~70-400ms depending on route. Not representative of steady-state and excluded from the table above.

## Finding: `/dashboard` had a real, measured N+1-adjacent issue (fixed this sprint)

`getDashboardMetrics` computes the current period AND the immediately-preceding period (for the trend/percent-change UI) by calling `computeOccupancyRate` twice. That function used to independently re-fetch `staff` (active staff list) and `staffWorkingHours` on every call — data that does **not** depend on the date range at all, only `staffAbsence` and `booking` do. Two genuinely redundant queries, doubled by the RLS-transaction wrapping, cost 4 raw statements every dashboard load for no reason.

Fixed by extracting `getActiveStaffWithWorkingHours()` and calling it once, passing the result into both `computeOccupancyRate` calls (`lib/services/dashboard-metrics-service.ts`). Measured before/after on the same seeded dataset: **52 → 46 raw queries**, no change to rendered numbers (existing correctness tests still pass) or timing. Regression-locked with a spy-based test (`tests/integration/dashboard-metrics.test.ts`) asserting `db.staff.findMany`/`db.staffWorkingHours.findMany` are each called exactly once per `getDashboardMetrics` call.

No other N+1 pattern was found. Specifically checked and confirmed *not* N+1 (query count stays flat regardless of row count, not proportional to it):
- `getCustomerStats` (customers page, 80 rows): 3 batched `groupBy` calls with `customerId: { in: [...] }`, not a per-customer loop.
- `getDashboardMetrics`'s daily series and staff ranking: one `booking.findMany` with relations, aggregated in memory — already documented in the code as deliberately avoiding a per-day/per-staff query.
- Raw `prisma.*` usage outside `lib/db.ts` on tenant-scoped models: none found (checked in Sprint 2's audit; re-confirmed here for the pages measured).

## Budgets (derived from measurement, not invented)

Set at roughly 3x the measured local warm baseline, to leave headroom for production network latency (managed Postgres/Redis are not localhost) while still catching a real regression. These are **local dev budgets for this sprint's regression tracking**, not a production SLA — re-baseline once real production/staging numbers exist (Sprint 9/10).

| Route class | Budget (P95, warm) |
|---|---|
| Dashboard pages (`/dashboard/**`) | < 300ms server time |
| Public tenant storefront (`/` on tenant host) | < 150ms server time |
| Raw query count per dashboard page load | < 60 raw statements (flag for review if a single page exceeds this — signals a new N+1, not a hard failure) |

## Known gaps (not measured this sprint, flagged for later)

- Booking availability (`getAvailableSlots`) and checkout initiation were not measured live — no realistic Stripe Connect test account configured in this environment (same gap noted in Sprint 0's baseline for the E2E suite). Should be measured once that's available (Sprint 8/9).
- No index-usage analysis (`EXPLAIN ANALYZE`) was run — the seeded dataset (210 bookings) is too small for Postgres's planner to meaningfully differ between index and sequential scan; revisit at production-scale data volume.
- Concurrent/load testing (multiple simultaneous requests) was not performed — all measurements above are single-request, sequential.
