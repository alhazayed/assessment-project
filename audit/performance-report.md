# V Welfare Performance and Operations Audit

**Performance score:** **58/100**  
**Evidence level:** static analysis, live route probes, live database advisors; no controlled production load test

## Executive summary

Public production routes were available and Vercel reported no grouped runtime errors in the sampled 24-hour window. However, the architecture ships large client bundles, aggregates admin data in application memory, performs repeated auth checks, and has substantial RLS/index debt. Existing k6 scripts do not prove capacity because no current controlled results or CI execution artifacts exist.

## Live probe results

Observed from the audit environment on 2026-07-13:

| Route | HTTP | TTFB | Transfer |
|---|---:|---:|---:|
| `/` | 200 | 2.66s | 143,842 B |
| `/login` | 200 | 0.19s | 31,355 B |
| `/register` | 200 | 0.19s | 33,303 B |
| `/clinicians` | 200 | 0.10s | 40,468 B |
| `/contact` | 200 | 0.14s | 25,335 B |
| `/privacy` | 200 | 0.38s | 33,704 B |
| `/terms` | 200 | 0.15s | 28,562 B |
| `/sample-result` | 200 | 0.15s | 49,165 B |
| `/api/health` | 200 | 1.21s | 54 B |

These are single synthetic requests, not Core Web Vitals or statistically valid latency measurements. The landing response and health check warrant investigation.

## Core Web Vitals

No field RUM, Lighthouse report, or Web Vitals telemetry is committed. LCP, CLS, and INP therefore cannot be certified.

Static risks:

- large landing HTML response;
- full assessment narrative modules imported into a client component;
- eager Recharts admin bundle;
- dark-mode mount state can produce an extra paint;
- no route-level bundle budgets or analyzer output.

**Release requirement:** collect p75 mobile and desktop LCP/INP/CLS from production-like traffic, segmented by English/Arabic and authenticated/public routes.

## Frontend bottlenecks

### PERF-01 — Assessment content ships in the client bundle

`app/(app)/assessments/[id]/assessment-content.tsx:1-12` imports approximately 2,500 lines of English/Arabic static assessment content into a client component.

**Impact:** download/parse cost on a clinically central mobile flow.

**Fix:** load only the selected assessment/locale; keep static narratives server-side where possible.

**Effort:** 8–16 hours.

### PERF-02 — Admin analytics is an eager, oversized client page

`app/x/control/(panel)/analytics/page.tsx` is roughly 900 lines and eagerly imports Recharts.

**Fix:** server-render initial aggregates; split chart tabs and dynamically import visualization modules.

**Effort:** 8–16 hours.

### PERF-03 — Repeated auth round trips

Middleware calls `auth.getUser()` for matched requests (`middleware.ts:17-36`), and protected layouts/pages frequently repeat validation. Live auth logs showed a burst of 57 successful `/user` calls in about 100 seconds.

**Fix:** map exact request paths, avoid duplicate same-request checks, and retain server-verified identity at authorization boundaries.

**Effort:** 6–12 hours.

### PERF-04 — Message layout and data flow are not mobile-efficient

The messages client holds a fixed sidebar and full viewport layout (`messages/page.tsx:190-192`) and directly subscribes to realtime. It lacks pagination/virtualization evidence.

**Fix:** responsive master/detail navigation, cursor pagination, bounded realtime windows.

**Effort:** 8–16 hours.

## API and server bottlenecks

### PERF-05 — Admin aggregation loads capped row sets into JavaScript

`app/api/admin/analytics/route.ts:27-38` and research routes load up to 5,000 rows and aggregate in memory.

**Impact:** inaccurate totals above the cap, high function memory/CPU, slow dashboards.

**Fix:** parameterized SQL/RPC aggregation over indexed columns; precomputed views with monitored refresh for expensive cohorts.

**Effort:** 12–24 hours.

### PERF-06 — Admin overview fan-out

The overview executes approximately 12 database queries, some returning thousands of rows.

**Fix:** one authorized dashboard RPC or a small parallel aggregate set, returning only display fields.

**Effort:** 8–16 hours.

### PERF-07 — PDF/AI operations are synchronous

Vercel durations are raised to 25–60 seconds. Synchronous generation can tie up functions and create poor failure behavior.

**Fix:** retain strict timeouts, idempotency keys, and cost controls; move long exports to a durable job if usage grows.

**Effort:** 8–20 hours depending on queue/workflow choice.

## Database performance

Live advisor counts:

- 199 multiple permissive policies;
- 51 RLS init-plan warnings;
- 19 duplicate indexes;
- 17 unindexed foreign keys;
- 76 currently unused indexes.

Priority:

1. correct and simplify RLS;
2. index relationship/permission FKs;
3. remove true duplicate indexes after definition comparison;
4. only remove unused indexes after representative observation.

No admin materialized-view refresh cron was observed; stale views are a correctness and operations issue, not merely performance.

## Caching

- API responses are intentionally no-store, appropriate for PHI.
- Public pages also appeared private/no-store due middleware/session handling, reducing CDN value.
- No application cache primitives are used.
- Static robots/sitemap/assets cache correctly on Vercel.

**Recommendation:** keep patient data uncached/shared-cache prohibited. Separate truly public routes from session-dependent middleware so marketing content can use safe CDN caching.

## Vercel configuration

Strengths:

- explicit max durations for AI/export routes;
- HSTS/CSP/security headers;
- production is `READY`;
- 24-hour runtime error aggregation returned no clusters.

Gaps:

- no CI performance budget;
- no source-map/APM/error monitoring integration;
- no regional strategy documented (Vercel observed `iad1`, Supabase is `eu-central-1`);
- likely cross-region latency between functions and database.

The region mismatch should be measured and aligned. Healthcare residency requirements must be considered before moving either side.

## Load testing

k6 scenarios exist for 100, 250, 500, and 1,000 VUs. They are not run in CI and no signed result artifacts exist.

The requested 10/50/100/500-user capacity cannot be honestly marked passed:

| Load | Status | Reason |
|---:|---|---|
| 10 | Not certified | no controlled authenticated result |
| 50 | Not certified | no result |
| 100 | Script exists | no current execution evidence |
| 500 | Script exists | no current execution evidence |

Running load against production healthcare data would be unsafe without approval, test tenants, rate-limit planning, and observability.

## Observability

| Capability | Status |
|---|---|
| Health endpoint | Present; live 200 |
| Vercel runtime error clusters | Available; none in sampled 24h |
| Structured application logging | Absent |
| Trace/correlation IDs | Absent |
| APM/error reporting | Absent |
| Core Web Vitals RUM | Absent |
| DB advisor process | Manual |
| Alerting/on-call | Not implemented in code |
| AI usage/budget guard | Present |

## Performance release conditions

1. Align or justify Vercel/Supabase regions.
2. Fix security/RLS before load tests.
3. Add production-like test identities and data.
4. Run 10/50/100/500 staged tests with p50/p95/p99, error rate, DB connections, function memory, and rate-limit outcomes.
5. Capture mobile CWV for Arabic and English.
6. Add bundle budgets and split assessment/admin bundles.
7. Replace JS aggregation with database aggregates.
8. Add monitoring and alert thresholds.

