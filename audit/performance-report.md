# V Welfare — Performance Audit Report

**Audit Date:** 2026-07-13  
**Method:** Bundle analysis, configuration review, load test scenario inspection, query pattern analysis  
**Environment:** Static analysis (no live Core Web Vitals measurement in this audit)

---

## Performance Score: 68/100

| Category | Score | Notes |
|----------|-------|-------|
| Core Web Vitals (estimated) | 65/100 | Large JS bundles; no measured LCP/CLS/INP |
| API Response Times | 75/100 | Mat views target <100ms; some 5000-row caps |
| Database Performance | 72/100 | Good indexes; RLS overhead on complex policies |
| Bundle Size | 60/100 | assessment-content.ts 209KB; recharts heavy |
| Caching Strategy | 70/100 | API no-store correct; limited edge caching |
| Load Testing | 75/100 | k6 scenarios exist (100–1000 VUs) |
| Mobile Performance | 55/100 | Direct DB queries; no API layer optimization |

---

## Core Web Vitals (Estimated)

> **Note:** Live Lighthouse/PageSpeed measurements were not run in this audit environment. Estimates based on code structure and bundle composition.

| Metric | Estimated | Target | Risk Factors |
|--------|-----------|--------|--------------|
| LCP | 2.5–4.0s | <2.5s | Google Fonts (Inter + Tajawal), Turnstile script, hero content |
| CLS | 0.05–0.15 | <0.1 | Font swap configured (`display: swap`); inline styles may shift |
| INP | 100–300ms | <200ms | Large assessment pages; recharts on insights/admin |

### LCP Optimization Opportunities
1. Preload critical fonts (Inter/Tajawal subsets already optimized via next/font)
2. Lazy-load Turnstile only on auth pages (currently in root layout)
3. Image optimization via next/image (verify all images use it)
4. Code-split assessment-content.ts (209KB static import)

### CLS Mitigation (Already Present)
- `display: 'swap'` on font configs in `app/layout.tsx`
- Dark mode anti-flash script in `<head>`

---

## Bundle Analysis

### Known Large Dependencies

| Package | Impact | Location | Recommendation |
|---------|--------|----------|----------------|
| assessment-content.ts | ~209KB | `lib/assessment-content.ts` | Dynamic import per assessment code |
| assessment-content-ar.ts | Large | `lib/assessment-content-ar.ts` | Same — code split by locale |
| @react-pdf/renderer | Heavy | packages PDF, /api/reports | Server-only where possible |
| recharts | ~150KB+ | insights, admin KPI charts | Lazy load chart components |
| lucide-react | Tree-shakeable | Throughout | ✅ Already optimized |

### Build Output (from KNOWN_ISSUES.md)
```
Shared JS: ~87.6 kB
Build time: ~30-45 seconds
ESLint: clean
TypeScript: clean
```

---

## API Performance

### Route Timeouts (vercel.json)

| Route | maxDuration | Rationale |
|-------|-------------|-----------|
| /api/clinical-notes | 30s | AI draft generation |
| /api/synthesis | 30s | Gemini synthesis |
| /api/ai-chat | 25s | Streaming AI chat |
| /api/admin/export | 60s | Bulk CSV/export |
| /api/admin/research | 45s | Anonymized research data |

### Response Time Targets

| Endpoint | Target | Implementation |
|----------|--------|----------------|
| Admin dashboard RPCs | <100ms | Materialized views + RPC functions |
| Assessment submit | <500ms | Atomic RPC (single transaction) |
| Admin analytics | Variable | Capped at 5000 rows — may truncate |

### Performance Anti-Patterns Found

| Issue | Location | Impact |
|-------|----------|--------|
| N+1 potential in clinician patients | `/api/clinician/patients` | Mitigated by batch query for submissions |
| 5000 row cap on analytics | `/api/admin/analytics` | Inaccurate at scale |
| Full table scan for admin export | `/api/admin/export` | Timeout risk on large datasets |
| Gemini calls without streaming UI feedback | ai-chat, synthesis | Perceived latency |
| Client-side PDF generation | packages PDF | Main thread blocking on mobile |

---

## Database Performance

### Query Patterns — Good

| Pattern | Example |
|---------|---------|
| Compound indexes on hot paths | assessment_submissions(patient_id, submitted_at DESC) |
| Partial indexes | high_risk_flag WHERE true |
| Atomic RPC for submissions | submit_assessment_atomic — single round trip |
| Batch patient submission fetch | clinician/patients deduplicates in-memory |
| Materialized views for admin | Offloads aggregation from live queries |

### Query Patterns — Concerns

| Pattern | Location | Issue |
|---------|----------|-------|
| RLS subquery per row | Complex policies with EXISTS on profiles | CPU overhead at scale |
| get_my_role() per policy evaluation | Most RLS policies | SECURITY DEFINER mitigates recursion but adds calls |
| Admin analytics full table scan | Before 5000 cap | Memory pressure |
| Realtime subscriptions unfiltered | messages, notifications | All INSERT events on table |
| Duplicate indexes | rate_limit_log, assessment_submissions | Write amplification |

### Recommended Query Optimizations

1. **Replace `(SELECT auth.uid())` with `(SELECT auth.uid())` caching** — Supabase recommends `(select auth.uid())` subselect pattern (already used in newer policies)
2. **Add covering indexes** for admin dashboard RPC source queries
3. **Implement cursor-based pagination** on admin results/export instead of OFFSET
4. **Schedule mat view refresh** via pg_cron (currently stub only)

---

## Caching Strategy

| Layer | Current | Recommendation |
|-------|---------|----------------|
| API responses | Cache-Control: no-store | ✅ Correct for PHI |
| Static assets | Vercel CDN | ✅ Default |
| Auth pages | Dynamic | Consider ISR for marketing pages |
| Assessment definitions | Public SELECT | Cache at CDN with short TTL + tag invalidation |
| Feature flags | Loaded per request in layout | Cache in edge config or short-lived cookie |
| Rate limit counts | Postgres | Consider Redis for high-traffic (lib/rate-limit/redis.ts exists) |

---

## Load Testing

### Existing Scenarios (`load-tests/`)

| Scenario | VUs | File |
|----------|-----|------|
| 100 VUs | 100 | load-tests/scenarios/100vus.js |
| 250 VUs | 250 | load-tests/scenarios/250vus.js |
| 500 VUs | 500 | load-tests/scenarios/500vus.js |
| 1000 VUs | 1000 | load-tests/scenarios/1000vus.js |

**Base config:** `load-tests/base.js` — shared thresholds and endpoints

### Recommended Load Test Targets

| Scenario | Users | Expected Bottleneck |
|----------|-------|---------------------|
| Concurrent assessments | 50 | submit_assessment_atomic + rate_limit_log writes |
| Admin dashboard | 10 | Mat view reads (should be fast) |
| Realtime messaging | 100 | Supabase Realtime connection limits |
| AI chat burst | 20 | Gemini API rate limits + aiBudgetGuard |
| Guest assessments | 100 | Guest rate limits + circuit breaker |

### npm Scripts
```bash
npm run load:100   # k6 run load-tests/scenarios/100vus.js
npm run load:250
npm run load:500
npm run load:1000
```

---

## Vercel Optimization

| Feature | Status | Notes |
|---------|--------|-------|
| Edge middleware | ✅ | Session refresh + CSP on Edge Runtime |
| Serverless functions | ✅ | API routes as functions |
| Image optimization | ⚠️ | Verify next/image usage on all pages |
| Fluid compute | ❌ | Not configured |
| Edge caching | ❌ | Limited — PHI requires no-store |
| Bundle analyzer | ❌ | Not in CI — recommend @next/bundle-analyzer |

---

## Supabase Optimization

| Feature | Status | Notes |
|---------|--------|-------|
| Connection pooling | Default | Supabase pooler for serverless |
| RLS performance | ⚠️ | Complex policies on hot tables |
| Indexes | ✅ Good | Recent migrations added FK indexes |
| pg_stat_statements | Unknown | Enable for production monitoring |
| Vacuum/analyze | Default | Monitor on rate_limit_log (high write) |

---

## Mobile Performance

| Issue | Impact |
|-------|--------|
| Direct Supabase queries | No server-side caching or batching |
| Full table SELECT on messages | `.select('*').limit(100)` — acceptable |
| Assessment content fetched per screen | Two parallel queries — good |
| No offline support | Network required for all operations |
| PDF fetch to non-existent endpoint | Wasted network round trip |

---

## Performance Issues by Priority

### Critical
None identified that cause immediate outage at expected beta scale.

### High

| ID | Issue | Location | Effort |
|----|-------|----------|--------|
| PERF-H01 | assessment-content.ts 209KB static import | lib/assessment-content.ts | 8h |
| PERF-H02 | Turnstile loaded on every page | app/layout.tsx | 2h |
| PERF-H03 | Admin analytics 5000 row cap | app/api/admin/analytics/route.ts | 4h |
| PERF-H04 | No mat view refresh cron in repo | migrations stub | 2h |

### Medium

| ID | Issue | Location | Effort |
|----|-------|----------|--------|
| PERF-M01 | recharts not lazy loaded | insights, admin KPI | 4h |
| PERF-M02 | Client-side package PDF generation | pdf-download-button.tsx | 4h |
| PERF-M03 | Duplicate database indexes | migrations | 2h |
| PERF-M04 | Realtime channels without row filters | messages page | 2h |
| PERF-M05 | No bundle size CI gate | CI pipeline | 4h |

### Low

| ID | Issue | Location |
|----|-------|----------|
| PERF-L01 | recharts@2.x deprecated | package.json |
| PERF-L02 | No Core Web Vitals monitoring | Production |
| PERF-L03 | Gemini 15s timeout may feel slow | lib/gemini.ts |

---

## Monitoring Recommendations

1. **Vercel Analytics** — Enable Web Vitals tracking
2. **Supabase Dashboard** — Query performance, connection count
3. **Custom metrics** — Assessment submit latency, AI call duration
4. **Alerting** — Rate limit circuit breaker trips, AI budget exhaustion
5. **pg_stat_statements** — Identify slow RLS queries

---

## Final Performance Verdict

Performance is **adequate for limited beta** (10–100 concurrent users) with the current architecture. Primary risks emerge at **500+ concurrent users** due to rate_limit_log write volume, RLS policy overhead, and uncapped admin export queries.

**Key pre-launch actions:**
1. Code-split assessment content files
2. Implement mat view refresh schedule
3. Add pagination to admin exports/analytics
4. Run k6 load tests against staging with production-like data volume

**No performance changes applied — awaiting approval.**
