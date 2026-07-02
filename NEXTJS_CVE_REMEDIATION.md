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

## React 19 + Next upgrade runbook (scheduled sprint)

Target: **`next@15.5.20`** (backport line, smaller surface than 16.x) unless a 16.x-only feature is needed.

1. Branch from `main`. `npm i next@15.5.20 eslint-config-next@15.5.20 react@19 react-dom@19`.
2. Run the React 19 codemods: `npx codemod@latest react/19/migration-recipe`.
3. Dependency compatibility check — verify React 19 peer support for:
   `@react-pdf/renderer`, `recharts`, `@supabase/ssr`, `@tanstack/react-query`, `@stripe/react-stripe-js`.
4. `npx tsc --noEmit && npm run lint && npm run build`.
5. Manual smoke (staging): register → email verify → onboarding → assessment → PDF export; checkout → Stripe webhook → billing; admin dashboards + charts; clinician verification review.
6. Confirm CSP nonce, Turnstile, and Supabase realtime still function on a Vercel preview.
7. `npm audit` → expect **0 HIGH**. Remove this file's residual note and update the certification to GO LIVE.

**Estimated effort:** 1–2 engineer-days incl. QA.
