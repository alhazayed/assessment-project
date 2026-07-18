# V Welfare — Security Remediation Plan

**Audit reference:** V Welfare Comprehensive Security Audit — July 18, 2026
**Author:** Principal Security Architect
**Date:** 2026-07-18
**Verification basis:** Direct inspection of repository at this commit — migrations, `app/api` routes, `lib/security`, RLS policies, and `mobile/`. No prior audit report or "previous fix" was trusted; every status below is verified from source and cited.

---

## 0. Branch reality check (must resolve before implementation)

The brief names the current branch as `claude/project-functionality-UDm55`. Verified state:

| Finding group | `claude/project-functionality-UDm55` (brief's branch) | `claude/v-welfare-technical-dossier-fvah3o` (this working branch) |
|---|---|---|
| C1–C4 (Phase 1 DB/RLS) | **Not present** — findings live | **Implemented & tested** (migrations `20260718090000–090300`) |
| C5–C7 (Phase 2 mobile) | **Not present** — `app.json` still has anon key; `storage: AsyncStorage` | **Implemented & tested** (SecureStore adapter, deep linking, creds removed) |
| Phase 3 (C-P3 1–7) | Outstanding | Outstanding |

Evidence: `git show origin/claude/project-functionality-UDm55:mobile/app.json` still contains `supabaseAnonKey`; none of the `2026071809*` migrations exist on that branch; `mobile/lib/{secureStorage,authLinking,useDeepLinkAuth}.ts` absent there.

**Decision required (see end):** whether Phase 1/2 should be delivered by **bringing the already-tested work on this branch to `project-functionality-UDm55`** (low risk — code exists and passed regression tests) or re-implemented on that branch. Phase 3 is new work regardless.

---

## Phase 1 — Critical (P0)

### C1 — Admin RPC authorization
- **Finding (verified):** 8 admin RPCs (`get_admin_dashboard_stats`, `get_top_assessments`, `get_high_risk_patients`, `get_user_engagement_metrics`, `get_assessment_completion_funnel`, `get_demographics_breakdown`, `get_assessment_performance_comparison`, `get_patient_risk_profile`) are `GRANT EXECUTE … TO authenticated` with no in-function authorization (`supabase/migrations/20260627220100_admin_dashboard_rpcs.sql:236-243`). Any authenticated patient can read other patients' PHI via the Data API.
- **Root cause:** Blanket `authenticated` grant + `SECURITY INVOKER` + no `is_admin()` check.
- **Proposed fix:** Recreate each RPC `SECURITY DEFINER` with a leading `IF NOT public.is_admin() THEN RAISE EXCEPTION … '42501'`; `REVOKE EXECUTE` from `PUBLIC`/`anon`; grant `service_role`; keep `authenticated` only as gated fallback (the shipped dashboard routes call via the cookie-auth client — see note). Preferred end-state: routes call via `service_role` and the `authenticated` grant is dropped.
- **Files:** new migration; (Phase-3 follow-up) `app/api/admin/dashboard/{stats,assessments,engagement,demographics}/route.ts` → service-role client.
- **Migration impact:** Function bodies unchanged; only security context + grants. No data change.
- **Regression risks:** Admin dashboards break if the `authenticated` grant is removed without moving routes to service-role. Mitigation: keep gated `authenticated` grant until routes are migrated.
- **Test strategy:** RLS/execute regression: non-admin → `42501`; admin → succeeds; `anon` has no execute. *(Already implemented as `20260718090000` + `supabase/tests/phase1_security_regression.test.sql` on the sibling branch.)*

### C2 — clinical_notes RLS
- **Finding (verified):** Two policy sets coexist — baseline (`20260619120000`) and additive (`20260624190200`) — never dropped. `cn_patient_read (patient_id = me)` OR-combines with `notes_patient_read_nonprivate (… AND is_private = false)` → **patients can read their own private clinical notes**; `cn_clinician_own (clinician_id = me, no patient scope)` lets a clinician read/write notes for any patient.
- **Root cause:** Permissive policies OR-combine; looser policy wins; old policies not dropped.
- **Proposed fix:** Drop **all** existing policies on `clinical_notes` (drift-safe dynamic drop), recreate one clean set: patient → non-private only; clinician → own-authored **and** active relationship; admin → explicit.
- **Files:** new migration.
- **Migration impact:** Policy replacement only.
- **Regression risks:** If clinician access is re-scoped to relationships without backfill, assigned clinicians lose access → mitigated by C4 backfill + sync trigger.
- **Test strategy:** patient can't read private note; related clinician can; unrelated clinician can't. *(Implemented as `20260718090200`.)*

### C3 — messages RLS
- **Finding (verified):** `msg_participant_insert (patient_id = me OR clinician_id = me)` drops the sender check and relationship requirement → a user can inject messages into arbitrary conversations and forge `sender_id`.
- **Root cause:** Overly-broad additive INSERT policy OR-combined with baseline.
- **Proposed fix:** Consolidated policies: insert requires `sender_id = auth.uid()` **and** participant **and** active clinician↔patient relationship; read = participants/admin; update = sender + active relationship.
- **Files:** new migration.
- **Regression risks:** Message send by legitimately-related participants must still pass → verified by tests.
- **Test strategy:** forgery blocked; unrelated insert blocked; related participant send allowed. *(Implemented as `20260718090200`.)*

### C4 — Clinician patient access control
- **Finding (verified):** Clinician access keys off `assigned_clinician_id` or a bare `get_my_role()='clinician'`; several policies let **any** clinician read **every** patient's insights/gratitude/journal/meds/personality/pdf/chat/profile (`20260619120000_schema_baseline.sql`).
- **Root cause:** Legacy single-assignment pointer + role-only checks; consent model (`clinician_patient_relationships` + `relationship_permissions` + `check_relationship_permission`) not used by RLS. Note: `has_clinician_access()` does **not** exist in the repo.
- **Proposed fix:** `relationship_active()` SECURITY DEFINER helper; **backfill** active relationships from `assigned_clinician_id` and a **sync trigger** to keep them consistent (preserves current workflows; never resurrects revoked consent); rewrite all 14 clinician-scoped policies to require an active relationship.
- **Files:** two migrations (helpers/backfill/trigger; policy rewrites).
- **Migration impact:** Inserts relationship rows for existing assignments; policy replacement.
- **Regression risks:** Future assignment writes must create relationships → handled by the trigger, so no app change needed.
- **Test strategy:** related vs unrelated clinician access; trigger activation on new assignment; revoke-respect. *(Implemented as `20260718090100` + `20260718090300`.)*

---

## Phase 2 — Mobile security

### C5 — Secure token storage
- **Finding (verified):** `mobile/lib/supabase.ts` persists auth in `AsyncStorage` (plaintext).
- **Fix:** Chunked `expo-secure-store` adapter (2048-byte limit) with **AsyncStorage→SecureStore migration** on first read (no forced logout).
- **Files:** `mobile/lib/secureStorage.ts` (new), `mobile/lib/supabase.ts`.
- **Regression risks:** Session loss on upgrade → mitigated by migration path. **Test:** chunking, migration, corruption→null. *(Implemented + 9 tests passing.)*

### C6 — Password-reset deep linking
- **Finding (verified):** No deep-link handler; `detectSessionInUrl:false`; reset link never becomes a session → reset broken.
- **Fix:** `flowType:'pkce'`; parse PKCE `?code=` / implicit `#token`; `exchangeCodeForSession`/`setSession`; route recovery to reset screen; reset screen reacts to `onAuthStateChange`.
- **Files:** `mobile/lib/authLinking.ts`, `mobile/lib/useDeepLinkAuth.ts` (new); `mobile/app/_layout.tsx`, `mobile/app/reset-password.tsx`, `mobile/lib/supabase.ts`; `supabase/config.toml` redirect allow-list.
- **Regression risks:** flowType change affects only recovery/magic links (login is password-based; signup confirmations disabled). **Test:** 11 deep-link tests. *(Implemented + tests passing.)*

### C7 — Mobile configuration security
- **Finding (verified):** `mobile/app.json` commits `supabaseUrl`/`supabaseAnonKey` (also dead config — client reads `EXPO_PUBLIC_*`).
- **Fix:** Remove keys from `app.json`; use `EXPO_PUBLIC_*` / EAS secrets; **rotate** the exposed anon key.
- **Files:** `mobile/app.json`, deployment docs. *(Removed on sibling branch; rotation is a dashboard action.)*

---

## Phase 3 — High-severity (verified outstanding on both branches)

### P3.1 — `scrubPHI()` in `ai-chat` and `clinical-notes` AI draft
- **Verified:** `scrubPHI/anonymizePHI` imported only by `app/api/recommend-assessments/route.ts`; `ai-chat` and `clinical-notes` send free text to Gemini unscrubbed (grep count 0 in both).
- **Fix:** Apply `scrubPHI()` to the user message in `app/api/ai-chat/route.ts` and to note context/body in `app/api/clinical-notes/route.ts` (PUT draft) before `callGemini`.
- **Regression risk:** Low — scrubbing is additive; verify AI output quality unaffected. **Test:** unit test that outbound payload contains no PII patterns.

### P3.2 — Validate forgot-password redirect URLs
- **Verified:** `app/api/auth/forgot-password/route.ts:20-28` passes caller-supplied `redirectTo` straight to Supabase → open-redirect / reset-link hijack.
- **Fix:** Allow-list `redirectTo` against known hosts (`NEXT_PUBLIC_SITE_URL`, `vwelfare://reset-password`); reject/replace otherwise.
- **Regression risk:** Low. **Test:** rejects external host; accepts allow-listed.

### P3.3 — Enforce `requireAdmin()` everywhere
- **Verified:** `app/api/admin/kpis/[kpiId]/alert/route.ts` uses `createAdminClient()` (service-role) with only `supabase.auth.getUser()` — **no `requireAdmin()` / role+HMAC check** (lines 11-14, 95-98). `admin/login` legitimately omits it (it establishes the session).
- **Fix:** Add `requireAdmin()` to the alert route (both `PATCH` and `GET`); audit all `app/api/admin/*` for the same.
- **Regression risk:** Low. **Test:** non-admin → 401/redirect.

### P3.4 — Canonical permission-key validation
- **Verified:** `app/api/relationships/[id]/permissions/route.ts` and `app/api/access-requests/[id]/route.ts` define local `VALID_PERMISSION_KEYS`; canonical `ALL_PERMISSION_KEYS` lives in `lib/types.ts`.
- **Fix:** Export a single validator from `lib/permissions.ts`/`lib/types.ts` and use it in both routes; remove duplicated lists.
- **Regression risk:** Low (same key set). **Test:** invalid key rejected; all canonical keys accepted.

### P3.5 — Mobile PDF export endpoint mismatch
- **Verified:** `mobile/app/(app)/results.tsx:72` requests `${WEB_URL}/api/export/pdf/${submissionId}`, which **does not exist** (no `app/api/export/` route; the only PDF route is `app/api/reports/route.tsx`). Mobile PDF export is broken.
- **Fix (options):** (a) add a web route `app/api/export/pdf/[submissionId]/route.tsx` (auth + owner/relationship check) that renders the report; or (b) point mobile at the existing `/api/reports` contract. Prefer (a) for a stable REST path; must enforce authorization (patient-owner or related clinician/admin).
- **Regression risk:** Medium (new authenticated route rendering PHI). **Test:** owner can fetch; non-owner 403; unauth 401.

### P3.6 — Next.js upgrade
- **Verified:** `package.json` → `next 14.2.35` (prior audit's "15.5.19" claim is false).
- **Fix:** Compatibility analysis → upgrade to latest secure 14.2.x (or 15.x after review); run `build`/`lint`/`tsc`.
- **Regression risk:** Medium-High (framework upgrade). Gate behind full build + manual smoke.

### P3.7 — Executable migrations vs placeholders
- **Verified:** 74/104 migrations are <5-line stubs ("applied directly to remote; stub preserved"), consolidated by `20260619120000_schema_baseline.sql`.
- **Assessment:** These are **intentional** history markers; the baseline snapshot is the source of truth. Retro-filling executable SQL risks divergence from the live DB. **Recommendation:** do **not** rewrite historical stubs; instead (a) ensure `supabase db reset` reproduces prod from baseline forward, and (b) forbid new stubs via CI. Treat as process fix, not a bulk rewrite.

---

## Cross-cutting engineering rules (honored)
- No RLS disabled; no `service_role` in client code; no authorization bypass; no security control removed to pass tests; no unnecessary rewrite. All authorization decisions live in PostgreSQL RLS / SECURITY DEFINER functions.

## Test & verification strategy (per brief)
- SQL RLS regression suite (executed on PostgreSQL 16 for Phase 1 — all assertions passed on the sibling branch).
- Mobile auth unit tests via `node --test` (20/20 passing on the sibling branch).
- `npm run build`, `npm run lint`, `npx tsc --noEmit` before Phase-3 code lands.
- Security HTTP tests (`__tests__/security/*`) require a deployed `BASE_URL`; configure per environment.

## Estimated security-score trajectory
- Phase 1 (C1–C4) closes the PHI-exposure and authorization launch blockers → largest single jump.
- Phase 2 (C5–C7) removes plaintext token storage + committed secret + fixes reset.
- Phase 3 closes PHI-to-AI leakage, open-redirect, an unguarded admin route, and the broken mobile export.
- Target 85+/100 "CONDITIONAL GO" is achievable with Phase 1–2 complete and P3.1/P3.2/P3.3/P3.5 done; P3.6/P3.7 can be scheduled without blocking a conditional go.

## Open decision for approval
1. **Branch:** deliver Phase 1/2 by bringing the already-tested sibling-branch work onto `claude/project-functionality-UDm55`, or continue on the current branch?
2. **Go-ahead** to implement Phase 3 (P3.1–P3.5 recommended for this pass; P3.6/P3.7 scheduled).
