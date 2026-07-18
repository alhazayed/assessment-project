# Production Security Patch Report — Application-Level Fixes

**Date:** 2026-07-18
**Base branch:** `main` (`f220304`)
**Patch branch:** `claude/prod-security-app-patch`
**Scope:** Application code only. **No** Supabase RLS/migrations, `has_clinician_access` model, admin-RPC grants, or production database authorization were touched (verified — see §5).

These three fixes were the app-layer items the release certification found still open in production. The database authorization model is already production-certified and was left untouched.

---

## 1. Files changed

| File | Change |
|---|---|
| `app/api/ai-chat/route.ts` | **P3.1** — import `scrubPHI`; scrub every history turn and the user message before they are sent to Gemini. |
| `app/api/clinical-notes/route.ts` | **P3.1** — import `scrubPHI`; scrub the patient AI-draft `context` (which can embed prior free-text note excerpts) before the Gemini call. |
| `lib/security/redirect.ts` *(new)* | **P3.2** — centralized reset-redirect allow-list utility (`sanitizeResetRedirect`). |
| `app/api/auth/forgot-password/route.ts` | **P3.2** — validate `redirectTo` through `sanitizeResetRedirect` instead of forwarding it raw to Supabase. |
| `app/api/export/pdf/[submissionId]/route.tsx` *(new)* | **P3.5** — the per-submission PDF endpoint the mobile app already calls; authorizes owner / admin / consented clinician, then renders the report. |
| `__tests__/security/redirect-allowlist.test.ts` *(new)* | Unit tests for the allow-list. |
| `__tests__/security/ai-phi-scrub.test.ts` *(new)* | Contract tests for the PHI scrubbing the AI routes rely on. |
| `__tests__/security/idor.test.ts` | Added unauthenticated-401 + non-owner-IDOR HTTP checks for `/api/export/pdf/:id`. |

No mobile client change was needed — `mobile/app/(app)/results.tsx` already requests `GET {WEB_URL}/api/export/pdf/{submissionId}` with a `Bearer` token; this patch supplies the matching backend.

---

## 2. Security impact

### P3.1 — PHI scrubbing before Gemini
- **Before:** `ai-chat` forwarded the raw user message + conversation history, and `clinical-notes` forwarded patient context (including prior note excerpts) to Gemini **unsanitized** — patient identifiers could leave the application to a third-party AI processor.
- **After:** all such text passes through the existing `scrubPHI()` (emails, phones, national IDs/Iqama, MRNs, DOBs, addresses, name-introduction patterns). Emergency-keyword detection still runs on the **raw** message first (so crisis handling is unaffected); only the copy sent to Gemini is scrubbed. Defence-in-depth — not a substitute for a processor agreement.

### P3.2 — forgot-password open-redirect
- **Before:** a caller-controlled `redirectTo` was passed straight into `resetPasswordForEmail`, so a reset email (carrying a recovery token) could be pointed at an attacker origin.
- **After:** only `vwelfare://reset-password` (mobile) or our own **https** origin's `/reset-password` path are permitted; anything else falls back to Supabase's configured Site URL. Centralized so every future auth entry point can reuse one allow-list.

### P3.5 — mobile PDF export contract
- **Before:** mobile called `/api/export/pdf/{id}`, which did not exist → broken export (404).
- **After:** a real route that (1) authenticates via Bearer (mobile) or cookie (web); (2) authorizes with the **same production model as RLS** — patient owner, `admin`/`superadmin`, or a clinician for whom `has_clinician_access(clinician, patient, 'view_reports')` is true (via the existing `lib/authz/clinician-access` helper, matching the deployed `pdf_reports_clinician` policy); (3) rate-limits (5/hour/user); (4) returns the PDF as an attachment with `Cache-Control: no-store`. No PHI is read until authorization passes.

---

## 3. Tests

| Suite | Command | Result |
|---|---|---|
| Redirect allow-list (new) | `npx tsx --test __tests__/security/redirect-allowlist.test.ts` | **pass** (allows mobile link + own origin; rejects foreign origin, look-alike host, wrong path, non-https, `javascript:`, oversized) |
| AI PHI-scrub contract (new) | `…/ai-phi-scrub.test.ts` | **pass** (email/phone/national-ID/MRN/DOB removed from chat + note-context payloads; clinical signal preserved) |
| PHI unit (existing) | `…/phi.test.ts` | **pass** |
| Permission validation (existing) | `…/permission-validation.test.ts` | **pass** |
| Offline security suites combined | — | **44/44 + 13/13 pass** |
| Full `npm run test:security` | — | 59 pass / 20 fail — **all 20 failures are `fetch failed`** (HTTP tests need a live `BASE_URL`; exactly 20 network errors, no assertion regressions) |
| Type check | `npx tsc --noEmit` | **clean (exit 0)** |
| Lint | `npm run lint` | **0 errors** (35 pre-existing `no-console` warnings) |
| Build | `npm run build` | **Compiled successfully**; `/api/export/pdf/[submissionId]` present |

The HTTP IDOR/RLS tests (including the new `/api/export/pdf/:id` checks) require a reachable preview and seeded test cookies:
```
BASE_URL=https://<preview> ATTACKER_COOKIE="<patient-B session>" npm run test:security
```

---

## 4. Regression vs. the production authorization model

- The new export route **consumes** `has_clinician_access(..., 'view_reports')` through the shared `clinicianHasPatientAccess` helper — it does not redefine or alter it. This matches the deployed `pdf_reports_clinician` RLS policy, so API and DB agree.
- All data reads occur through the service-role client **after** the in-route authorization decision (owner/admin/clinician) — the same "route authorizes, then service_role reads" pattern used by the certified admin dashboards.
- `tsc`, `lint`, and `build` all pass against `main`, confirming compatibility with the current codebase (async `createClient`, `Promise` route `params`, canonical permission validators already present).

---

## 5. Guardrails honored

Verified by diff inspection:
- **No** changes under `supabase/` (no migrations, no `config.toml`).
- **No** `CREATE/DROP POLICY`, `ALTER TABLE`, `GRANT`, `REVOKE`, or `relationship_active`/`has_clinician_access` (re)definition anywhere in the diff.
- Changes limited to `app/api/*`, `lib/security/redirect.ts`, and `__tests__/security/*`.

---

## 6. Remaining risks

1. **Third-party AI processing.** `scrubPHI()` is regex-based defence-in-depth, not NLP-grade — free-form names not matching the introduction patterns may survive. Ensure a data-processing agreement/BAA covers Gemini; consider a model-side no-retention setting.
2. **Deployment-dependent tests unrun here.** The HTTP IDOR checks for `/api/export/pdf/:id` (unauth 401; non-owner 403/404) must be executed against a preview with seeded accounts to confirm end-to-end authorization behavior in the live runtime.
3. **`view_reports` vs `export_reports`.** The export route authorizes clinicians on `view_reports` to match the deployed `pdf_reports_clinician` policy. If the product wants export to require a distinct, stronger grant, add an `export_reports` check (app-layer only) in a follow-up.
4. **Unchanged pre-existing items** noted in the certification remain out of scope here (leaked-password protection toggle; `anon` execute on `check_relationship_permission`) — these are DB/Auth-config actions, not app code.

---

*No production database, RLS, or authorization-model change was made. This patch is limited to application-level remediation on `main`.*
