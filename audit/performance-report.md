# V Welfare — Performance Audit Report

**Audit date:** 2026-07-13
**Method:** Static code review of query patterns, bundle-affecting imports, and caching configuration. A live `npm run build` / Lighthouse / load test was **not** run in this session (no Supabase credentials or live deployment were available in this environment, and running one would require secrets — see note at the end). Historical build-output numbers from prior in-repo audits (dated 2026-06-19/24) are cited where relevant but flagged as **stale** since substantial code has changed since (consent system, KPI dashboards, Clinical Risk Dashboard, packages module all added afterward).

---

## 1. Core Web Vitals

**Not measurable from this audit environment.** No RUM (`@vercel/speed-insights` or equivalent) integration was found in `package.json` or `app/layout.tsx`, and no live URL was reachable. This is itself a finding:

### PERF-1 — [MEDIUM] No Real User Monitoring for Core Web Vitals
There is no `@vercel/speed-insights` or `@vercel/analytics` package installed, and no equivalent LCP/CLS/INP instrumentation elsewhere in the codebase.
**Fix direction:** `npm install @vercel/speed-insights` and add `<SpeedInsights />` to the root layout; enable Vercel Analytics.
**Effort:** Trivial (30 min), but requires a deployed environment to see data.

---

## 2. Bundle Size

**Historical data (2026-06-24 audit, likely stale but directionally useful):**

| Route | First-load JS (as of 06-24) | Status then |
|---|---|---|
| `/insights` | 275 kB | High |
| `/assessments/[id]` | 236 kB | High |
| `/x/control/analytics` | 203-213 kB | Medium |
| `/packages` | ~180 kB | Medium |
| `/dashboard` | ~108 kB | OK |
| Shared chunks | 87.6 kB | OK |

Since that measurement, the codebase has grown substantially (KPI dashboards, Clinical Risk Dashboard, packages module, consent system, admin analytics-charts). **These numbers should be re-measured** with a real `npm run build` before relying on them, but the underlying causes identified are still present in the current code:

### PERF-2 — [MEDIUM] `recharts` is imported without dynamic/`ssr:false` splitting on several pages
Chart-heavy pages (`insights`, `x/control/analytics`, `x/control/risk`, `kpi-trend-charts.tsx`) statically import `recharts`, a large charting library, into the initial bundle rather than lazy-loading it behind `next/dynamic`.
**Fix direction:** `const Charts = dynamic(() => import('./charts'), { ssr: false })` for each chart-bearing component, extracting the chart rendering into its own client component file first if it's currently inline in a page file.
**Effort:** Medium (touches ~4-5 files, needs visual QA after each).

### PERF-3 — [MEDIUM] `lib/assessment-content.ts` (~209 KB) and `lib/assessment-content-ar.ts` (~50 KB) are not code-split per assessment
Both files are large, monolithic keyed lookups of interpretive content for all ~39 assessments. If imported eagerly at the top of `assessment-content.tsx` (the assessment-taking component) rather than dynamically per assessment code, every user pays the full ~260 KB parse/download cost regardless of which single assessment they're taking.
**Fix direction:** Split into per-assessment-code modules (or at least per-category) and dynamically `import()` only the relevant slice when a specific assessment is opened.
**Effort:** Medium-High (requires restructuring a large generated-content file; do this carefully to avoid breaking any assessment's content).

### PERF-4 — [LOW] No `export const revalidate` on static-ish public pages
The public marketing pages (`/`, `/clinicians`, `/contact`, `/privacy`, `/terms`) are dynamically rendered by default with no caching/ISR configuration found. These pages have no per-request personalization need.
**Fix direction:** Add `export const revalidate = 3600` (or use static generation entirely) to these routes.
**Effort:** Trivial.

---

## 3. Database Performance

Cross-referenced with the Database Report §6 (indexes) and §9 (materialized views). Summary of the query-pattern-level findings:

### PERF-5 — [MEDIUM] Admin analytics/research routes load up to 5,000 rows into Node.js memory for in-process aggregation
`app/api/admin/analytics/route.ts` and `app/api/admin/research/route.ts` both fetch large row sets and filter/aggregate in JavaScript rather than in SQL. This works today but degrades linearly (or worse) as submission volume grows, and risks Vercel function memory/timeout limits at scale (mitigated somewhat by the `maxDuration: 45-60s` overrides in `vercel.json`, which is itself a sign the team has already hit slowness here).
**Fix direction:** Push aggregation into SQL (views or RPCs), following the same pattern already used successfully for the KPI dashboard (`admin_daily_stats` etc. materialized views). Paginate any remaining row-level exports.
**Effort:** Medium-High.

### PERF-6 — [MEDIUM] Export endpoints load full result sets into memory rather than streaming
`/api/admin/export` (capped at 10,000 rows, in-memory) and `/api/admin/packages/export` (**no cap found**, in-memory) both build the full CSV in memory before responding.
**Fix direction:** Convert to a `ReadableStream` that paginates the underlying query in chunks (e.g., 500 rows at a time) and writes CSV rows incrementally; add a hard row cap to `packages/export` matching the pattern in `admin/export`.
**Effort:** Medium.

### PERF-7 — [LOW/positive] Compound indexes for the hot patient-scoped query paths are present
`(patient_id, submitted_at DESC)`, `(user_id, read_at, created_at DESC)`, etc. — see Database Report §6 for the full list. This is a genuine strength; most per-user list queries (dashboard, history, notifications) should perform well even as data grows, with the exception of the missing indexes noted in the Database Report (messages.sender_id, notification_log.recipient_id, etc.).

### PERF-8 — [MEDIUM] No N+1 pattern found in the primary user-facing paths, but the materialized-view-backed admin dashboards depend on views that may not build correctly
See Database Report DB-C1 — if the materialized views fail to refresh due to the column-name mismatch, the admin dashboards would either error or silently serve stale data, which is a correctness-adjacent performance concern (stale KPI data is worse than slow KPI data for a clinical-risk dashboard).

---

## 4. Load Testing

`load-tests/scenarios/{100,250,500,1000}vus.js` (k6 scripts) exist in the repository, and `package.json` has `load:100`/`load:250`/`load:500`/`load:1000` scripts wired to them. **No evidence was found in this audit session that these have been run against a representative environment recently** — there is no committed results artifact, and this session did not have a live deployment or Supabase credentials to run them against. This is a gap, not a failure: the tooling exists, but its last-run status and results are unknown.

**Recommendation:** Before go-live, run at minimum the 100 and 250 VU scenarios against a staging environment that mirrors production database size, and capture the results as a committed artifact (e.g., `load-tests/results/`) so this claim can be verified rather than assumed.

---

## 5. Vercel-Specific Optimization

- `poweredByHeader: false` — ✅ set.
- Per-route `maxDuration` overrides in `vercel.json` for AI/export routes — ✅ sensible, though the presence of 45-60s overrides for `admin/research` and `admin/export` is itself evidence that those routes are already pushing against default limits (see PERF-5/6).
- No `next/image` usage was confirmed across the codebase in this pass; if raster images (logos, avatars) are served via plain `<img>` tags rather than `next/image`, automatic image optimization (resizing, format negotiation, lazy loading) is being missed. **This specific claim needs a follow-up grep-based verification pass** before being treated as a confirmed finding — flagging as a **candidate** finding only.
- No edge-function usage was found for latency-sensitive read paths (e.g., `assessment_definitions` catalog); everything runs as standard serverless functions. Not necessarily wrong, but worth evaluating for the most latency-sensitive endpoints once RUM data (PERF-1) is available to identify where it would actually help.

---

## 6. Supabase-Side Optimization

- **Indexes:** generally strong for the primary access patterns (see Database Report §6). A handful of FK columns lack dedicated indexes — low urgency but should be batched into the same migration that addresses the Database Report's Medium findings.
- **RLS performance:** Policies generally use simple `auth.uid() = column` or `get_my_role()` (a `STABLE SECURITY DEFINER` function, which Postgres can cache within a statement) — this is the correct, performant pattern. No policy was found doing an expensive join or subquery against a large table inside a `USING` clause that would create a per-row performance tax at scale, **except** the clinician-assignment check pattern (`EXISTS (SELECT 1 FROM profiles WHERE ...)`), which is fine at current scale but should be monitored as the `profiles` table grows (it's indexed on `id`, the primary key, so this should remain fast).
- **Materialized views** for admin dashboards are the right architectural choice for aggregate reporting — the concern here is correctness (Database Report DB-C1), not the pattern itself.

---

## 7. Performance Score

Given: (a) genuinely solid indexing for user-scoped hot paths, (b) a correct materialized-view strategy for admin aggregates (modulo the correctness bug), but (c) no RUM data to verify real-world Core Web Vitals, (d) known-large client bundles on chart-heavy and assessment-taking pages that have likely grown since last measured, and (e) in-memory aggregation/export patterns that will not scale gracefully:

**Performance Score: 65/100**

This is a directional estimate, not a measured one — the highest-priority follow-up action for this category is simply *to measure*: run `npm run build` for bundle sizes, deploy Speed Insights for RUM, and execute the existing k6 scripts against a staging environment. Several of the findings above (PERF-2, PERF-3, PERF-5, PERF-6) are already well-understood remediation patterns that don't require new investigation, only execution.
