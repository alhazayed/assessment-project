# V Welfare — Production Release Report

**Date:** 2026-07-18
**Release:** Application-level security patches (PHI scrubbing, redirect allowlist, mobile PDF export)
**Type:** Release Integration — no new features, no security-architecture change, **no database/RLS/migration change**.

---

## 1. Identifiers

| Field | Value |
|---|---|
| **Pull Request** | **#75** — `claude/prod-security-app-patch` → `main` (draft) · https://github.com/alhazayed/assessment-project/pull/75 |
| **Head commit** | `689a8dbca70fca2fa7eab9b9fe79718027ac5652` (docs) — code changes in `40d8ab081…` |
| **Base (`main`)** | `f2203047d58cb8b1c266607a0f9c1ce4b9fe7ac7` |
| **Merge type** | Fast-forward (merge-base = current `main` HEAD) — **no conflicts** |
| **Deploy preview** | `https://assessment-project-git-claude-p-153307-alhazayed-1540s-projects.vercel.app` (Vercel state: **Ready**) |
| **Production DB** | Supabase `wyzezyctpvlohuuhzyof` — verified **unchanged** (read-only) |

---

## 2. CI status (PR #75)

| Check | State |
|---|---|
| Vercel — deployment | ✅ success (Ready) |
| security/snyk | ✅ success (no manifest changes) |

Combined status: **success**. No CI failures.

---

## 3. Files changed (8 code/test files)

| File | Change |
|---|---|
| `app/api/ai-chat/route.ts` | `scrubPHI` on user message + history before Gemini. |
| `app/api/clinical-notes/route.ts` | `scrubPHI` on AI-draft patient context before Gemini. |
| `lib/security/redirect.ts` *(new)* | Centralized reset-redirect allow-list. |
| `app/api/auth/forgot-password/route.ts` | `redirectTo` validated via `sanitizeResetRedirect`. |
| `app/api/export/pdf/[submissionId]/route.tsx` *(new)* | Authorization-checked per-submission PDF endpoint. |
| `__tests__/security/redirect-allowlist.test.ts` *(new)* | Allow-list unit tests. |
| `__tests__/security/ai-phi-scrub.test.ts` *(new)* | PHI-scrub contract tests. |
| `__tests__/security/idor.test.ts` | Unauth-401 + non-owner IDOR checks for `/api/export/pdf/:id`. |

Also included: `RELEASE_CANDIDATE_SECURITY_CERTIFICATION.md`, this report. **No `supabase/`, migration, RLS, or DB-authorization change** (verified by diff).

---

## 4. Security fixes

1. **PHI scrubbing before Gemini** — `ai-chat` and `clinical-notes` AI draft no longer forward unsanitized patient text to the third-party AI provider (emergency detection still runs on the raw message).
2. **Forgot-password open-redirect closed** — `redirectTo` restricted to our https `/reset-password` origin or `vwelfare://reset-password`.
3. **Mobile PDF export contract** — new `/api/export/pdf/[submissionId]` authorizes **owner / admin / consented clinician** via the existing `has_clinician_access(..., 'view_reports')` primitive (same model as the deployed `pdf_reports_clinician` RLS policy).

---

## 5. Test evidence

**Build / static analysis (merge-equivalent tree = `main` after fast-forward):**
| Command | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean (exit 0) |
| `npm run lint` | ✅ 0 errors (35 pre-existing `no-console` warnings) |
| `npm run build` | ✅ Compiled successfully; `/api/export/pdf/[submissionId]` compiled |

**Security tests:**
| Suite | Result |
|---|---|
| Offline PHI/authz suites (`phi`, `permission-validation`, `redirect-allowlist`, `ai-phi-scrub`) | ✅ **44 / 44** |
| `npm run test:security` (localhost) | 59 pass / 20 fail — **all 20 failures are `fetch failed`** (HTTP tests need a reachable server; exact 1:1 with network errors — no assertion regressions) |
| Deployed-model PHI-isolation behavioral replay (PostgreSQL 16) | ✅ **ALL PASSED** |

**Live database verification (read-only, this release):**
- Admin RPCs (all 8): `EXECUTE` = **service_role only** (`anon`/`authenticated` = none).
- `has_clinician_access` / `check_relationship_permission`: unchanged (SECURITY DEFINER).
- RLS policy fingerprint on `clinical_notes` / `messages` / `assessment_assignments` / `patient_profiles` / `clinician_patient_relationships`: **identical** to certified baseline.
- Latest migration `20260718124550` — no new migration; **no authorization drift**.
- Supabase advisors: **no ERROR** (unchanged WARNs: leaked-password protection; `anon` oracle on `check_relationship_permission`).

> **Objective-3 note:** `npm run test:security` against `BASE_URL=<preview>` **could not be executed from this environment** — the agent network policy blocks `*.vercel.app` (`CONNECT tunnel failed, 403`), and the cross-user IDOR assertions need seeded test cookies. The preview builds green (CI success). The HTTP suite (incl. `/api/export/pdf/:id` non-owner 403) must be run from a network-permitted environment with seeded accounts.

---

## 6. Objective-4 verification matrix

| Property | Verified | How |
|---|---|---|
| AI PHI scrubbing | ✅ | `scrubPHI` wired in both routes (code); `ai-phi-scrub` contract tests pass. |
| Redirect allowlist | ✅ | `sanitizeResetRedirect` used in `forgot-password`; allow-list tests pass (foreign origins/look-alikes/non-https/junk rejected). |
| PDF export authorization | ⚠️ structural | Route authorizes owner/admin/`has_clinician_access('view_reports')`; unauth-401 test present. **Live non-owner-403 test pending** (network). |
| Patient isolation | ✅ | Behavioral replay: Patient A cannot read B's notes/profile or own private notes. |
| Clinician isolation | ✅ | Behavioral replay: unrelated clinician cannot read patient PHI. |
| Admin RPC protection | ✅ | Live grants: service_role only; replay: `anon`/`authenticated` blocked. |

**No PHI-isolation test failed.**

---

## 7. Risk assessment

- **Low.** Additive application-layer changes only; no schema/RLS/authz-model edits (production DB certified unchanged). Fast-forward merge, CI green. `scrubPHI` is regex-grade defence-in-depth. The export route reads PHI only after an owner/admin/clinician authorization decision; its live authorization behavior should be confirmed on the preview.

## 8. Rollback plan

- **Code:** revert the merge commit on `main`, or use **Vercel instant rollback** to the previous production deployment.
- **Database:** **none required** — this release contains no migration or DB change, so rollback is fully reversible with zero data impact.

---

## 9. Final recommendation: ✅ GO (execute merge + one live check)

The release is safe to ship: production DB authorization is certified unchanged and PHI-isolated, the patches are additive and CI-green, and all offline + behavioral tests pass. This report does **not** auto-merge — production release is a human go/no-go execution.

**To complete the release:**
1. Mark PR #75 ready and **merge** to `main` (fast-forward, no conflicts).
2. Vercel auto-deploys; confirm the production alias `app.vwelfare.com` serves the merged build.
3. From a network-permitted environment, run against the preview/prod URL with seeded accounts:
   `BASE_URL=<url> ATTACKER_COOKIE=<patient-B> npm run test:security` — confirm patient isolation, clinician isolation, private-notes protection, admin-RPC 401/403, and **PDF-export non-owner 403/404**. **Do not open to patients if any PHI-isolation or export-authorization test fails.**

**Deferred (non-blocking, tracked separately):** merge mobile hardening (SecureStore + remove committed anon key) and rotate the key; enable Supabase leaked-password protection; revoke `anon` execute on `check_relationship_permission`.

*No application code, RLS, or database authorization was modified during this release integration.*
