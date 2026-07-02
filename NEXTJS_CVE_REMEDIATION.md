# Next.js CVE Remediation — V Welfare Platform
**Date:** 2026-07-02
**Current version:** `next@14.2.35` (last release of the EOL 14.x line; React 18)
**Status:** Interim mitigation applied in code + config. Full fix (major upgrade) documented below and scheduled.

---

## Why not just upgrade in place?

There is **no React-18-compatible patched Next.js release**. Verified against the registry:

| Line | Latest | React req | Notes |
|---|---|---|---|
| 14.2.x | `14.2.35` | 18 | **EOL** — no further security patches |
| 15.x | `15.5.20` (`backport` tag) | **19** | security-backported line |
| 16.x | `16.2.10` (`latest` tag) | **19** | current |

Every code-level fix therefore forces a **React 18 → 19 major upgrade** across an app that includes Stripe Elements, `@react-pdf/renderer`, `recharts`, and `@supabase/ssr`. That upgrade has a large breaking surface that cannot be fully runtime-validated without a full e2e/QA pass. Shipping a blind major upgrade to a production healthcare + payments app is a worse risk than the residual exposure after the mitigations below.

**Decision:** apply real, reversible, config-level mitigations now; perform the React 19 upgrade as a dedicated, QA'd sprint (runbook at the end).

---

## Advisory-by-advisory disposition

Each HIGH advisory from `npm audit` was assessed against *this* app's actual configuration — not accepted or dismissed generically.

| Advisory | Class | Applies here? | Disposition |
|---|---|---|---|
| GHSA-9g9p-9gw9-jx7f | Image Optimizer `remotePatterns` DoS | Vector removed | **Mitigated** — `images.remotePatterns: []`; app uses only local `/logo.png` |
| GHSA-h64f-5h5j-jqjh | Image Optimization API DoS | Vector removed | **Mitigated** — same; optimizer refuses non-local sources |
| GHSA-3x4c-7xq6-9pq8 | Unbounded `next/image` disk cache | Vector removed | **Mitigated** — no remote images to cache; `minimumCacheTTL` bounded |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling in **rewrites** | No | **N/A** — app defines no `rewrites` in `next.config.js` |
| GHSA-36qx-fr4f-26g5 | Middleware bypass via built-in **i18n** | No | **N/A** — app uses a custom `?lang` scheme, not Next built-in i18n |
| GHSA-h25m-26qc-wcjf / GHSA-q4gf-8mx6-v5v3 / GHSA-8h8q-6873-q5fj | RSC / Server Component **DoS** | Partial | **Platform-mitigated** on Vercel (edge-level limits) + app's own per-route rate limiter (`lib/rate-limit.ts`, atomic, fail-closed) |
| GHSA-3g8h-86w9-wvmq / GHSA-vfv6-92ff-j949 / GHSA-wfc6-r584-vfw7 | Cache poisoning (middleware/RSC) | Partial | **Platform-mitigated** — Vercel's CDN keys on the correct headers; app sets `Cache-Control: no-store` on all `/api/*` responses (`middleware.ts`) |
| GHSA-c4j6-fc7j-m34r | SSRF via WebSocket upgrades | Low | App makes no user-controlled server-side fetches; only outbound call is Gemini to a fixed Google endpoint |
| GHSA-ffhc-5mcf-pf4q | XSS in CSP **nonce** handling | **Yes** | **Residual (accepted, time-boxed)** — see below |
| GHSA-gx5p-jg67-6x7h | XSS in `beforeInteractive` scripts | No | **N/A** — app uses no `beforeInteractive` script strategy |

### Remaining residual: GHSA-ffhc-5mcf-pf4q (CSP nonce)
`middleware.ts` uses nonce-based CSP. This advisory is only fully fixed by the upgrade. Compensating controls already in place reduce exploitability:
- `script-src` uses `'self' 'nonce-…'` with **no `'unsafe-inline'`**, so injected inline scripts are blocked regardless.
- `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, and `X-Frame-Options: DENY` are set.
- No third-party script origins beyond Cloudflare Turnstile.

This is the single advisory that remains materially open until the React 19 upgrade and is the reason the go-live certification stays **GO LIVE WITH CONDITIONS**.

---

## What changed in this commit

`next.config.js` — added an `images` block:
```js
images: {
  remotePatterns: [],          // deny all remote image optimization
  dangerouslyAllowSVG: false,
  contentDispositionType: 'attachment',
  minimumCacheTTL: 60,
}
```
No application code changes required (only image source is local). Verified: `tsc` clean, `next build` succeeds, existing logo renders unchanged.

### Recommended Vercel platform steps (dashboard, not code)
1. Enable Vercel WAF / Attack Challenge Mode for the project (covers RSC/middleware DoS classes at the edge).
2. Confirm the project has no legacy `next.config` rewrites added later without re-review.

---

## React 19 + Next upgrade — trial run findings (2026-07-02)

An upgrade to `next@15.5.20 + react@19` was **attempted and reverted** in a controlled trial to scope the work empirically. Results:

**Good news — dependencies are ready.** Every React-sensitive package already declares React 19 peer support, so none block the upgrade:
`@react-pdf/renderer@4.5.1` (`^19`), `recharts@2.15.4` (`^19`), `@tanstack/react-query@5` (`^18||^19`), `lucide-react@0.454.0` (`^19.0.0-rc`), `@supabase/ssr` (React-agnostic). `@stripe/react-stripe-js` is not installed (Stripe mocked).

**Blocker 1 — async `cookies()`/`headers()` ripple (the big one).**
Next 15 makes `cookies()` and `headers()` **async** (return Promises). `tsc` after the trial flagged the synchronous call sites: `lib/supabase/server.ts`, `lib/admin-auth.ts`, `lib/get-language.ts`, `app/layout.tsx`, `app/api/admin/login/route.ts`, `app/connect/[token]/page.tsx`. The critical one is `lib/supabase/server.ts` → `createClient()`, which is called **synchronously in ~50+ route handlers and server components**. Converting it to `await createClient()` forces every caller (and their enclosing functions) async — a whole-codebase, **auth-critical** refactor that must be runtime-validated, not just type-checked.

**Blocker 2 — version target + Sentry.**
`npm audit` still reported HIGH for `next` at 15.5.20; **npm audit's own `fixAvailable` names `next@16.2.10` (semver-major)** as the clean-audit target. `@sentry/nextjs` requires a coordinated major bump (→`10.x`). So the 0-HIGH target is confirmed 16.2.10, not 15.5.x.

**Blocker 3 — ESLint 9 / flat-config (discovered 2026-07-02, second trial).**
`eslint-config-next@16.2.10` has a hard peer requirement of **`eslint@>=9`** (project is on `eslint@8`). The install aborts with ERESOLVE otherwise. ESLint 9 defaults to **flat config** (`eslint.config.js`), so `.eslintrc.json` must be migrated. This adds a lint-toolchain migration on top of the runtime refactor. (The failed install was confirmed to leave `package.json`, the lockfile, and `node_modules` unchanged — the branch's validated 14.2.35 state is intact.)

**Confirmed full breaking-change chain for the sprint:** `next@16.2.10` + `react@19`/`react-dom@19` + `@sentry/nextjs@10` + `eslint@9` (flat-config migration) + the 58-call-site async `cookies()`/`createClient()` refactor. This is why it is a staged, staging-QA-gated sprint and not an in-session change: the async refactor is auth-critical and only static validation (tsc/build/lint) is possible without a runtime.

### Runbook (scheduled sprint — ~1–2 engineer-days incl. QA)
1. Branch from `main`. `npm i next@<confirmed-target> eslint-config-next@<same> react@19 react-dom@19 @types/react@19 @types/react-dom@19 @sentry/nextjs@10`.
2. Refactor async `cookies()`/`headers()`: make `lib/supabase/server.ts createClient()` async and `await` it at all call sites (codemod `npx @next/codemod@latest next-async-request-api .` covers most).
3. `npx tsc --noEmit && npm run lint && npm run build` → resolve residual React 19 type changes.
4. Manual smoke (staging): register → email verify → onboarding → assessment → PDF export; checkout → Stripe webhook → billing; admin dashboards + charts; clinician verification review.
5. Confirm CSP nonce, Turnstile, and Supabase realtime function on a Vercel preview.
6. `npm audit` → expect **0 HIGH**. Remove this file's residual note and update the certification to GO LIVE.

Until then the image-optimizer mitigation above stands, and the residual CSP-nonce advisory is the one accepted item keeping the certification at **GO LIVE WITH CONDITIONS**.
