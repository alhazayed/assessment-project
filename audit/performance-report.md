# V Welfare — Performance Report

**Audit date:** 2026-07-13  
**Method:** Code review, bundle/asset inspection, load-test inventory, query/index review. No live Lighthouse/k6 run against production in this session.

---

## Executive Summary

The platform has made deliberate performance investments (compound indexes, atomic rate limits, admin matviews intent, Vercel function timeouts, `no-store` on APIs). Remaining risks are **large client bundles** (assessment content, recharts, react-pdf), **N+1 / over-fetch patterns** in admin and clinician UIs, **broken matviews** forcing base-table scans, and **middleware auth on every request** without edge caching for public pages beyond static assets.

**Performance Score: 62/100**

---

## 1. Core Web Vitals (expected from code)

| Metric | Risk drivers | Expected impact |
|--------|--------------|-----------------|
| **LCP** | Landing + Inter/Tajawal Google Fonts; hero + assessment grids; large JS | Medium risk on mobile |
| **CLS** | Dark-mode anti-flash script helps; sidebar mobile drawer OK; charts may shift | Medium |
| **INP** | Assessment answer buttons fine; admin charts + large tables heavy | Medium–High on admin |

**Not measured live.** Recommend production RUM (Vercel Analytics / Speed Insights) before launch.

---

## 2. Bundle & Asset Size

| Asset | Size / notes |
|-------|----------------|
| `lib/assessment-content.ts` | ~204KB / 2271 lines — shipped with web if imported client-side |
| `lib/assessment-content-ar.ts` | ~49KB |
| `lib/i18n.ts` | ~1639 lines both languages in one module |
| `@react-pdf/renderer` | Heavy; used for reports/exports |
| `recharts` | Heavy; insights + KPI dashboards |
| `lucide-react` | Tree-shakeable if named imports used |

**Recommendations:**
- Dynamic import PDF and chart libraries.
- Split assessment content by instrument code; load on demand.
- Split i18n by locale (load AR only when needed).

---

## 3. Load Testing Inventory

Present under `load-tests/scenarios/`:

| Script | VUs |
|--------|-----|
| `100vus.js` | 100 |
| `250vus.js` | 250 |
| `500vus.js` | 500 |
| `1000vus.js` | 1000 |

Package scripts: `load:100` … `load:1000` via k6.

**Gap:** No checked-in results from recent runs; cannot claim validated capacity. Prior docs assert admin RPC &lt;100ms DB-side — unverified here.

---

## 4. Database Performance

### Strengths
- Compound indexes on submissions, messages, notifications, mood, audit.
- Partial indexes for high-risk and unread.
- Atomic rate-limit function reduces race contention.
- Admin dashboard intended to use matviews (good pattern when healthy).

### Issues

| ID | Severity | Finding |
|----|----------|---------|
| PERF-D1 | High | Matviews broken / unrefreshed → risk route scans base tables |
| PERF-D2 | Medium | RLS role/EXISTS subqueries on hot tables |
| PERF-D3 | Medium | Admin results/analytics apply filters in memory after fetch |
| PERF-D4 | Medium | Clinician patients fetches submissions then dedupes in memory (also wrong column) |
| PERF-D5 | Low | Unbounded audit_log growth |
| PERF-D6 | Medium | Service-role bypass means every API pays full write cost without RLS caching benefits |

---

## 5. API / Server Performance

| Area | Notes |
|------|-------|
| Vercel `maxDuration` | clinical-notes/synthesis 30s; AI 25s; export 60s; research 45s — appropriate for AI/export |
| Rate limiting | Extra DB RPC per guarded call — acceptable; Redis unused |
| Guest circuit breaker | Protects DB under abuse |
| Middleware | `getUser()` on nearly all routes — session cost on every navigation |
| Health check | Uses service role DB probe — keep lightweight for uptime monitors |

---

## 6. Frontend Rendering Patterns

| Pattern | Assessment |
|---------|------------|
| Server Components | Used in admin panel and some pages — good |
| Client waterfalls | Dashboard/messages/insights multiple sequential Supabase calls |
| localStorage assessment progress | Good UX; not a perf issue |
| Images | Limited next/image usage observed |
| Dark mode | Class strategy; anti-flash script |

---

## 7. Caching Strategy

| Layer | Status |
|-------|--------|
| CDN static assets | Vercel default ✅ |
| HTML/pages | Dynamic due to auth middleware matcher breadth |
| API | Explicitly `no-store` ✅ for PHI |
| Matviews | Intended cache; ineffective currently |
| Redis | Documented; unused |
| Next `fetch` cache / tags | Not meaningfully used |

**Recommendation:** Narrow middleware matcher where safe; cache public marketing pages; keep PHI uncached.

---

## 8. Mobile Performance

- Separate Expo bundle; NativeWind.
- Risk: client-side scoring + direct inserts may feel fast but creates integrity issues (see bug report).
- Hidden tabs reduce initial navigator weight but hurt discoverability more than perf.

---

## 9. Scalability Outlook

| Scale | Likely bottleneck |
|-------|-------------------|
| 10–50 concurrent | App OK if indexes present |
| 100–250 | Rate-limit table + submission writes; middleware auth |
| 500–1000 | Need Redis rate limit, connection pooling review, matview refresh, CDN for public |
| Research exports | 5k row caps — intentional throttle; may frustrate admins |

---

## 10. Performance Remediation Plan

| Priority | Item | Effort (hrs) |
|----------|------|--------------|
| P0 | Fix or remove admin matviews; stop full-table risk scans | 6–8 |
| P1 | Code-split PDF, recharts, assessment content | 8–12 |
| P1 | Push filters into SQL for admin results/research | 4–6 |
| P1 | Wire Upstash Redis for rate limits under load | 4 |
| P2 | Locale-split i18n | 6 |
| P2 | Run and archive k6 baselines in CI | 4 |
| P2 | Enable Vercel Speed Insights | 1 |
| P3 | Audit log partitioning / retention job | 6 |

---

## Performance Scorecard

| Domain | Score |
|--------|-------|
| Client bundle | 55 |
| Server/API | 70 |
| Database queries | 60 |
| Caching | 50 |
| Load-test readiness | 55 |
| Mobile | 65 |
| **Overall** | **62** |
