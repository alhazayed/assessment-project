# V Welfare — Security Remediation Completion Report (Phase 1–3)

**Audit reference:** V Welfare Comprehensive Security Audit — July 18, 2026
**Branch:** `claude/project-functionality-UDm55`
**Date:** 2026-07-18
**Author:** Principal Security Architect
**Verification basis:** Own inspection of source; no prior report trusted.

---

## 1. Executive status

| | Before | After (this change set) |
|---|---|---|
| Security score (audit) | 52/100 | **~85/100 (estimated)** |
| Production readiness (PHI) | NOT READY | **CONDITIONAL GO** |

All P0 launch blockers (C1–C4) and mobile items (C5–C7) are remediated at the **database/RLS and code** layers, plus five high-severity Phase-3 items (P3.1–P3.5). Verified with an executed SQL RLS regression suite, unit tests, `tsc`, lint, and a production build.

---

## 2. Fixed findings

### Phase 1 — Critical (P0)

| ID | Finding (verified) | Fix | Evidence |
|---|---|---|---|
| **C1** | 8 admin RPCs `GRANT EXECUTE TO authenticated`, no authz → any authenticated user reads PHI analytics | RPCs recreated `SECURITY DEFINER` + leading `is_admin()` gate (`42501`); `REVOKE` from `PUBLIC`/`anon`; `service_role` granted | `supabase/migrations/20260718090000_phase1_admin_rpc_authz_lockdown.sql` |
| **C2** | Overlapping `clinical_notes` policies → patients read their **private** notes; clinicians read any patient's | Drift-safe drop of all policies; single clean set (patient→non-private; clinician→authored + active relationship; admin explicit) | `…20260718090200_phase1_rls_clinical_notes_messages_fix.sql` |
| **C3** | `messages` insert policy dropped sender/relationship checks → forge sender, inject into any conversation | Insert requires `sender_id = auth.uid()` + participant + **active relationship** | same migration |
| **C4** | Clinician access via `assigned_clinician_id` / bare `get_my_role()='clinician'` → broad patient access | `relationship_active()` helper; **backfill** + **sync trigger** from `assigned_clinician_id`; all 14 clinician policies require an active `clinician_patient_relationship` | `…090100…` + `…090300…` |

Preferred architecture honored: Browser → API route → `requireAdmin()` → service-role → DB. RLS is the authority; `has_clinician_access()` (which does not exist) was not relied upon.

### Phase 2 — Mobile

| ID | Finding | Fix | Evidence |
|---|---|---|---|
| **C5** | Auth session in AsyncStorage (plaintext) | Chunked `expo-secure-store` adapter + AsyncStorage→SecureStore migration (no forced logout) | `mobile/lib/secureStorage.ts`, `mobile/lib/supabase.ts` |
| **C6** | Password reset broken (no deep-link handler) | PKCE `flowType`; parse code/implicit links; `exchangeCodeForSession`/`setSession`; route recovery to reset; reset screen reacts to auth-state | `mobile/lib/authLinking.ts`, `mobile/lib/useDeepLinkAuth.ts`, `mobile/app/_layout.tsx`, `mobile/app/reset-password.tsx` |
| **C7** | Supabase anon key committed in `app.json` | Removed (client already reads `EXPO_PUBLIC_*`); config in `supabase/config.toml`; **rotate key** (dashboard) | `mobile/app.json` |

### Phase 3 — High severity

| ID | Finding (verified) | Fix | Evidence |
|---|---|---|---|
| **P3.1** | `scrubPHI` wired only into `recommend-assessments`; `ai-chat` + `clinical-notes` send free text to Gemini unscrubbed | `scrubPHI()` applied to outbound message/history (`ai-chat`) and patient context (`clinical-notes` AI draft) | `app/api/ai-chat/route.ts`, `app/api/clinical-notes/route.ts` |
| **P3.2** | `forgot-password` passes caller `redirectTo` straight to Supabase → open redirect / token theft | Allow-list to our https origin `/reset-password` or `vwelfare://reset-password` | `lib/security/redirect.ts`, `app/api/auth/forgot-password/route.ts` |
| **P3.3** | `admin/kpis/[kpiId]/alert` used service-role with only `getUser()` (no HMAC; excluded `superadmin`) | Replaced with `requireAdmin()` (role + HMAC; admin+superadmin) | `app/api/admin/kpis/[kpiId]/alert/route.ts` |
| **P3.4** | Both permission routes validated against a **non-canonical** key list that mismatched the DB CHECK constraint (accepted keys the DB rejects and vice-versa) | Single canonical `isValidPermissionKey()` from `ALL_PERMISSION_KEYS` | `lib/permissions.ts`, `app/api/relationships/[id]/permissions/route.ts`, `app/api/access-requests/[id]/route.ts` |
| **P3.5** | Mobile Results calls `/api/export/pdf/{id}` which **did not exist** (broken export) | New authorization-checked route (Bearer+cookie; owner/admin/active-relationship clinician) | `app/api/export/pdf/[submissionId]/route.tsx` |

---

## 3. Tests executed

| Suite | Command | Result |
|---|---|---|
| Phase 1 RLS regression (PostgreSQL 16) | `psql -f supabase/tests/phase1_security_regression.test.sql` | **exit 0 — all assertions passed** |
| Mobile auth units | `cd mobile && node --test __tests__/auth/*.test.ts` | **20/20 pass** |
| Web security — PHI + Phase 3 (pure) | `npx tsx --test __tests__/security/{phi,phase3}.test.ts` | **25/25 pass** |
| Type check | `npx tsc --noEmit` | **clean (exit 0)** |
| Lint | `npm run lint` | **No ESLint warnings or errors** |
| Production build | `npm run build` | **success**; `/api/export/pdf/[submissionId]` compiled |

**Deployment-dependent tests:** `__tests__/security/{idor,rls}.test.ts` are HTTP tests that require a running target. They fail with `fetch failed` locally (no server). To run them, deploy and set `BASE_URL`, e.g.:
```
BASE_URL=https://<preview-deployment> npx tsx --test __tests__/security/idor.test.ts __tests__/security/rls.test.ts
```

New Phase-3 regression tests added: `__tests__/security/phase3.test.ts` (permission validator vs DB CHECK, redirect allow-list, PHI-scrub contract).

---

## 4. Remaining findings (not in this change set)

| Item | Severity | Status / recommendation |
|---|---|---|
| P3.6 — Next.js upgrade (pinned `14.2.35`) | High | Deferred — needs compatibility analysis; schedule a dedicated PR with full build + smoke. |
| P3.7 — 74/104 migrations are stubs | Medium | **Not a bulk rewrite** — they are intentional history markers consolidated by `20260619120000_schema_baseline.sql`. Recommend: ensure `supabase db reset` reproduces prod from baseline forward, and add CI to forbid new stubs. |
| Broken `admin_*` materialized views (non-existent columns, SQL errors) | Medium | Pre-existing; the RPCs are now locked down but still functionally broken. Repair/drop in a follow-up migration. |
| Admin dashboard routes still call RPCs via cookie-auth client | Medium | To fully drop the `authenticated` RPC grant, migrate `app/api/admin/dashboard/{stats,assessments,engagement,demographics}` to the service-role client, then revoke. |
| Account deletion is audit-log-only (no erasure) | Medium | GDPR right-to-erasure not implemented. |
| Centralised logging / migration-sync drift | Medium | Operational; track separately. |
| Rotate committed anon key | Low (public key, RLS-protected) | Dashboard action; set via EAS/`EXPO_PUBLIC_*`. |

---

## 5. Security score estimate & production readiness

- **Estimate: ~85/100** — the PHI-exposure and authorization launch blockers (C1–C4), plaintext token storage + committed secret + broken reset (C5–C7), and PHI-to-AI leakage / open-redirect / an unguarded admin route / a permission-validation correctness bug / a broken PHI export (P3.1–P3.5) are all closed and verified.
- **Production readiness: CONDITIONAL GO** for PHI, conditional on: (a) rotating the anon key; (b) production redirect allow-list in the Supabase dashboard; (c) scheduling P3.6 (Next upgrade) and repairing the broken admin matviews; (d) running the HTTP IDOR/RLS suites against a preview `BASE_URL`.

## 6. Engineering rules honored
No RLS disabled; no `service_role` in client code (server routes only); no authorization bypass; no security control removed to pass tests; no unnecessary rewrite. Every authorization decision lives in PostgreSQL RLS / SECURITY DEFINER functions or an explicit `requireAdmin()` server check.
