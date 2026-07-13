# V Welfare — Performance Report

**Audit date:** 2026-07-13
**Method:** Static analysis of query patterns, rendering strategy, bundle composition, and DB indexing. **No live Core Web Vitals / load tests were run** in this environment (no deployed target or DB). k6 scenarios exist in `/load-tests` but require a running target — execute them in staging before launch.

Severity key: **High / Medium / Low**.

---

## 0. Executive Summary

Rendering strategy is sound (Server‑Components‑first, `no-store` on PHI APIs, `Promise.all` batching in hot paths). The main performance risks are **operational and data‑layer**, not front‑end: broken/un‑refreshed admin materialized views, duplicate indexes causing write amplification, unbounded `rate_limit_log` growth, several full‑table `count(exact)` scans per request, and no measured CWV/load baseline. Bundle is modest but `recharts` and `@react-pdf/renderer` are heavy and should be code‑split/kept server‑side.

**Performance Score: 70/100** (estimate; pending real CWV + load runs).

---

## 1. Rendering & Data Fetching (front‑end)

**Good patterns**
- Server Components read data server‑side and batch with `Promise.all` (e.g. patient dashboard fetches submissions/moods/assignments in parallel — `app/(app)/dashboard/page.tsx:12-31`).
- APIs set `Cache-Control: no-store` (correct for PHI) via middleware.
- Assessment scoring endpoints do bounded work (`responses ≤ 200`, dedup).

**Issues**
- **PERF‑M1 (Medium): No route‑level `loading.tsx` anywhere** → no streamed skeletons; slow data routes show blank/inline spinners, hurting perceived performance and LCP on data‑heavy pages (dashboard, admin, messages). *Fix:* add `loading.tsx` + Suspense boundaries. *Effort: 6–8h.*
- **PERF‑M2 (Medium): `select('*')` on wide/ PHI tables** in several reads (e.g. dashboard `assessment_submissions.*`, `profiles.*`) fetches unused columns (and more PHI than needed). *Fix:* select explicit columns. *Effort: 3–5h.*
- **PERF‑L1 (Low): Client components fetch after mount** (messages, admin tables) causing request waterfalls; consider server‑fetch or parallelization.

---

## 2. Database Performance

- **PERF‑H1 (High): Duplicate/redundant indexes** across ≥6 migrations (triple `idx_assessment_submissions_patient_submitted`; overlapping single/partial `assignment_id`; single + composite `patient_id`; duplicate `rate_limit_log(key,created_at)`; duplicate `feature_flags_flag_key`). Increases write amplification and storage on the hottest tables. *Fix:* consolidate to a canonical set (see `database-report.md` DB‑M3). *Effort: 4–6h.*
- **PERF‑H2 (High): Admin analytics via materialized views is broken/un‑refreshed.** Views reference non‑existent columns (`database-report.md` DB‑C4) so the app falls back to **base‑table scans**; the risk route runs multiple `high_risk_flag = true` scans per request, including an unbounded `in(patientIds)` re‑scan of all high‑risk rows (`admin/dashboard/risk/route.ts:36-64`). At scale this is O(high‑risk submissions) per page view. And the intended pg_cron refresh job is only a stub (DB‑M6). *Fix:* fix the views, add the refresh cron, and back the risk/stats routes with them. *Effort: 8–14h.*
- **PERF‑M3 (Medium): Frequent `count: 'exact', head: true` scans.** High‑risk notification dedup (`submit-assessment:12-17`), guest circuit breaker (`submit-assessment-guest:201-206`), and AI budget guard (`aiBudgetGuard:38-43`) run exact counts on `assessment_submissions`/`rate_limit_log` per request. `count(exact)` is a full scan in Postgres. *Fix:* use partial indexes, `count: 'planned'`, or a maintained counter. *Effort: 3–6h.*
- **PERF‑M4 (Medium): Unbounded `rate_limit_log` growth.** Cleanup cron is a stub (DB‑M6); the AI budget guard also writes a row per AI request. Table bloat degrades every rate‑limit check (which is on the hot path of nearly every mutation). *Fix:* ship the prune cron + confirm it runs. *Effort: 2h.*
- **PERF‑M5 (Medium): RLS `auth.uid()` not wrapped** in newer policies → per‑row function re‑evaluation under load (DB‑M2). *Fix:* `(select auth.uid())`. *Effort: 2–4h.*
- **PERF‑L2 (Low):** Missing FK index on `chat_sessions.patient_id` (most FK indexes added in `20260623211848`).

---

## 3. AI / External Calls

- Gemini calls have timeouts (15s) + bounded retries with backoff (`lib/gemini.ts`), and a global daily budget guard. ✔
- `vercel.json` sets appropriate `maxDuration` (25–60s) for AI/export routes. ✔
- **PERF‑L3 (Low):** Synthesis/clinical‑note drafts are synchronous request/response; consider streaming for better perceived latency on chat.

---

## 4. Vercel / Bundle

- **PERF‑M6 (Medium): Heavy client libraries.** `recharts` (charts) and `@react-pdf/renderer` are large. Ensure `@react-pdf/renderer` stays **server‑only** (it is, in `api/reports`), and **code‑split** chart components (`components/*radar*`, `kpi-trend-charts`, admin dashboards) with `next/dynamic` so they don't inflate first load. *Effort: 3–5h.*
- **PERF‑L4 (Low): Image optimization** — `next.config.js` has no `images` config; logos are local PNGs (`app/icon.png`, `public/*`). Use `next/image` with sizing to avoid CLS and oversized transfers.
- `poweredByHeader: false`, HSTS preload, DNS‑prefetch on. ✔

---

## 5. Core Web Vitals (to measure)

Not measurable statically. **Predicted risks** based on code: CLS from the dark‑mode toggle placeholder and un‑sized images; LCP delay on data pages without `loading.tsx`; INP acceptable (light interactions). **Action:** run Lighthouse/CrUX on `/`, `/login`, `/dashboard`, `/assessments/[id]`, `/x/control/overview` and record LCP/CLS/INP before launch.

## 6. Load Testing (to run)

`/load-tests/scenarios/{100,250,500,1000}vus.js` exist. **Run against staging** and watch: rate‑limit RPC latency (advisory‑lock contention under burst), `count(exact)` scans (PERF‑M3), and materialized‑view/base‑table scans (PERF‑H2). Record p95 latency and error rates per scenario.

---

## 7. Prioritized Remediation

| Priority | Items | Effort |
|---|---|---|
| P1 | PERF‑H1 (dedupe indexes), PERF‑H2 (fix + refresh views), PERF‑M3/M4 (counts + prune cron) | 17–28h |
| P2 | PERF‑M1 (loading.tsx), PERF‑M2 (explicit selects), PERF‑M5 (RLS uid), PERF‑M6 (code‑split) | 14–22h |
| P3 | PERF‑L1–L4, measure CWV, run k6 | 8–12h + measurement |

**Performance verdict:** Acceptable front‑end foundation; **data‑layer and operational items (indexes, materialized views, rate‑limit table growth) must be addressed and a real CWV/load baseline captured** before high‑traffic launch.
