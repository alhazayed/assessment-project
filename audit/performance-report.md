# V Welfare Performance and Reliability Report
**Method:** static analysis. No browser RUM, deployed traces, database plans, or representative load execution was available, so LCP/CLS/INP and throughput are unmeasured.

## Findings
| Priority | Evidence | Risk | Action | Effort |
|---|---|---|---|---|
| High | `app/api/admin/research/route.ts` reads up to 5,000 submissions and demographics; admin analytics performs application-side aggregation | function memory/latency rises with records; data handling is excessive | Use aggregate SQL/RPCs with pagination, minimum cohort suppression, and response limits | 8–12 h |
| High | broken admin materialized views reference nonexistent profile columns | dashboard refresh/query failures negate intended cache layer | Correct views, indexes and secure refresh schedule; benchmark after schema validation | 4–6 h |
| High | `/api/clinician/patients` wrong `user_id` field plus fallback submission fetch | incorrect last-assessment data and potential broad data load | query `patient_id`; implement a `DISTINCT ON`/windowed database query | 2–4 h |
| Medium | Recharts is synchronously imported by insights/admin client routes | unnecessary initial JavaScript and slow interaction on mobile | dynamic-import charts with accessible skeleton/table fallback | 3–5 h |
| Medium | root layout loads Turnstile script on every route | third-party cost/perf/privacy footprint on authenticated pages | inject only into login/register routes | 2 h |
| Medium | no `loading.tsx` segments, many full client pages fetch in effects | blank/weak transitions, waterfalls and lower perceived performance | add route loading boundaries and move initial protected reads to Server Components where appropriate | 8–14 h |
| Medium | cache strategy absent; API middleware sets `no-store` universally | public content cannot be safely cached; database load increases | retain no-store for PHI; explicitly cache immutable public content and anonymized aggregates only | 4–8 h |
| Medium | unused Redis limiter but database atomic rate limit exists | no shared performance/cache strategy; cost controls can race | decide on managed limiter/cache with observability; do not add in-process cache on Vercel | 4–8 h |
| Low | `BrandLogo` always uses image priority; localStorage state writes each answer | contention for LCP and avoidable main-thread writes | use priority only above fold; debounce non-critical progress persistence | 1–2 h |

## Capacity and load testing
k6 scenarios exist for 100, 250, 500, and 1,000 VUs, but no recorded results or production-like test dataset were found. Do not infer capacity from their existence. Define test objectives per endpoint, isolate non-production Supabase data, test auth/rate-limit behavior, monitor Vercel duration/memory, database CPU/connections, and p95/p99 latency. Never load-test production patient services.

## Core Web Vitals
No RUM instrumentation or Lighthouse CI evidence is committed. Add privacy-safe Vercel/other RUM instrumentation with no PHI tags and build budgets. Validate mobile Arabic/English routes separately because font/layout and RTL may alter LCP and CLS.

## Reliability gaps
There are no route-level `loading.tsx` or local error boundaries, centralized error tracking is not evidenced, and migrations may not replay cleanly. Database views are a single-point feature failure for admin analytics. Implement release health checks, non-PHI structured logs, backup/restore drills, and synthetic critical-flow checks before scaling.
