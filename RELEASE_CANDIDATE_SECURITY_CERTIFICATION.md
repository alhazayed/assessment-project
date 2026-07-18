# V Welfare — Release Candidate Security Certification

**Date:** 2026-07-18
**Gate:** Final Release Candidate Security Gate (verification only — no code modified)
**Live database verified:** Supabase `wyzezyctpvlohuuhzyof` (vwelfare-platform, `ACTIVE_HEALTHY`, Postgres 17) — read-only via MCP
**Release candidate line:** `origin/main` (`f220304`)
**Completed app patches:** branch `claude/prod-security-app-patch` (`40d8ab0`) — **not yet merged to `main`**

---

## Decision: ⚠️ CONDITIONAL GO

No PHI isolation test failed — the deployed database authorization model is certified sound and unchanged. **But the release candidate (`main`) does not yet contain the completed application patches**, and the live preview security run (Objective 3) could not be executed from this environment. Approval is conditional on the exact actions in §7.

**Final security score (deployed DB + current `main`): ~84 / 100** (→ ~88 once the patch branch is merged and deployed).

---

## Objective 1 — Does `main` include the three app patches?  ❌ NOT YET

| Patch | On `origin/main`? | On `claude/prod-security-app-patch`? |
|---|---|---|
| AI PHI scrubbing (`ai-chat`, `clinical-notes`) | **No** (`grep scrubPHI` = 0) | Yes |
| Redirect allowlist (`lib/security/redirect.ts` + `forgot-password`) | **No** | Yes |
| Mobile PDF export route (`/api/export/pdf/[submissionId]`) | **No** | Yes |

`origin/main` HEAD is `f220304` (PR #72), which predates the patch. **The patches exist only on the unmerged branch `claude/prod-security-app-patch` (`40d8ab0`).** This is the primary gating item: the RC must be the branch that contains these fixes.

---

## Objective 2 — Production DB authorization unchanged?  ✅ CONFIRMED

Verified live (read-only), identical to the prior release certification:

- **Admin RPC grants:** all 8 (`get_admin_dashboard_stats`, `get_top_assessments`, `get_high_risk_patients`, `get_user_engagement_metrics`, `get_assessment_completion_funnel`, `get_demographics_breakdown`, `get_assessment_performance_comparison`, `get_patient_risk_profile`) → `EXECUTE` = **service_role only**; `anon`=false, `authenticated`=false. Unchanged.
- **`has_clinician_access(clinician, patient, permission)`:** SECURITY DEFINER, `authenticated`+`service_role`, not `anon`. Unchanged. `check_relationship_permission` likewise.
- **RLS policy fingerprint (5 tables):** identical to certified baseline —
  - `clinical_notes` (4): `clinician_own_notes`, `notes_admin_all`, `notes_patient_read_nonprivate`, `superadmin_can_delete_any_clinical_note`
  - `messages` (5): `messages_insert`, `messages_read`, `messages_update`, `msg_admin_read`, `superadmin_can_delete_any_message`
  - `assessment_assignments` (3): `assign_admin_write`, `assign_clinician_own_patients`, `assign_read`
  - `patient_profiles` (4): `patient_prof_own`, `patient_prof_clinician`, `patient_prof_admin_write`, `superadmin_can_delete_any_patient_profile`
  - `clinician_patient_relationships` (3): `cpr_clinician_insert`, `cpr_parties_read`, `cpr_patient_update`
- **Migrations:** latest applied is `20260718124550_security_phase1_hardening` — **no new migration** since certification. No authorization drift.

---

## Objective 3 — Live preview `npm run test:security`  ⚠️ NOT EXECUTABLE HERE

`BASE_URL=<preview>` could not be exercised: the agent network policy blocks `*.vercel.app` (`CONNECT tunnel failed, 403`), the patch branch's preview is behind that block, and the cross-user IDOR assertions need seeded test cookies that were not provided.

**Compensating verification (performed):**
- **Behavioral PHI-isolation replay of the *deployed* policies + `has_clinician_access` on isolated PostgreSQL 16 — ALL PASSED:**

| Focus area | Result |
|---|---|
| Patient isolation (A cannot read B's notes/profile) | ✅ PASS |
| Clinician isolation (unrelated clinician cannot read patient) | ✅ PASS |
| Private clinical notes (patient cannot read own private notes) | ✅ PASS |
| Admin RPC protection (`anon`/`authenticated` cannot execute) | ✅ PASS (also confirmed live via grants) |
| Message injection (unrelated clinician blocked) | ✅ PASS |

- **Offline app suites (patch branch): 44/44 pass** (`phi`, `permission-validation`, `redirect-allowlist`, `ai-phi-scrub`).
- **PDF export authorization:** verified **structurally** (owner OR admin OR `has_clinician_access(..., 'view_reports')`, matching the deployed `pdf_reports_clinician` policy). It is **not** yet live-tested because the route is on the unmerged branch — this is a required post-merge live check (§7).

To run the intended live suite after deploy:
```
BASE_URL=https://<preview-with-patches> ATTACKER_COOKIE="<patient-B session>" npm run test:security
```

---

## Objective 4 — Advisors / Vercel / env / AI provider

**Supabase security advisors:** no **ERROR**. WARN (unchanged): `check_relationship_permission` & `get_my_role` executable by `anon` (relationship-existence oracle / null for anon); `has_clinician_access` & `submit_assessment_atomic` executable by `authenticated` (intentional, guarded); **leaked-password protection disabled** (Auth).

**Vercel:** framework `nextjs`, Node `24.x`, production domains `app.vwelfare.com` / `vwelfare.vercel.app`. The most recent deployment is a **preview** (`target: null`) for the patch branch; project `live=false`. Confirm the production alias points to the intended (patched) build before opening to patients.

**Environment variables:** no secret is client-exposed. Client-referenced vars are all publishable — `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `EXPO_PUBLIC_*`. Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `TURNSTILE_SECRET_KEY`) are read only in server files (`app/api/*`, `lib/admin-auth`, `lib/supabase/admin`, `lib/security/verifyTurnstile`). *(An automated scan flag on `app/api/health` is a false positive — it lists `SUPABASE_SERVICE_ROLE_KEY` in a "required vars are set" check, not under a public prefix.)*

**AI provider:** Google Gemini 1.5 Flash over HTTPS (`generativelanguage.googleapis.com`), server-side only; per-user rate limits + global budget circuit-breaker in the AI routes. **PHI scrubbing before Gemini is on the patch branch, not on `main`** — until merged, `main` still forwards unscrubbed patient text to the AI provider.

**Mobile (release-relevant):** on `main`, `mobile/lib/supabase.ts` still uses `storage: AsyncStorage` (plaintext token persistence) and `mobile/app.json` still contains a committed Supabase anon key. The mobile hardening (SecureStore, deep-link reset, credential removal) is not merged to `main`.

---

## 5. What passed / what's open

**Passed (certified):**
- Deployed DB PHI cross-user/role isolation (behavioral + structural) — no failures.
- Admin RPC service_role-only lockdown (live).
- `has_clinician_access` model + RLS policies unchanged.
- No secret exposed to clients; AI provider server-side with cost/abuse controls.

**Open (block full GO until done):**
- App patches not on `main` (P3.1 PHI-to-AI, P3.2 open-redirect, P3.5 export route).
- Live preview `test:security` not yet run (esp. PDF-export authorization end-to-end).
- Mobile token storage (AsyncStorage) + committed anon key not hardened on `main`.
- WARN advisories: leaked-password protection; `anon` execute on `check_relationship_permission`.

---

## 6. Final scores

| Dimension | Score |
|---|---|
| Deployed DB authorization / PHI isolation | 95 |
| Admin RPC protection | 98 |
| App-layer (RC=`main`, patches unmerged) | 70 |
| Secrets / config / AI provider | 88 |
| Mobile hardening (on `main`) | 65 |
| **Overall RC readiness** | **~84 / 100** |

---

## 7. Exact remaining actions before opening to real patients

1. **Merge `claude/prod-security-app-patch` into `main`** (the RC must contain: `ai-chat`/`clinical-notes` scrubPHI, `lib/security/redirect.ts` + `forgot-password` allowlist, `/api/export/pdf/[submissionId]`). Re-run `npm run build && npm run lint && npx tsc --noEmit` on the merged `main`.
2. **Deploy the merged `main`** and **confirm the production alias** (`app.vwelfare.com`) serves that build.
3. **Run the live preview security suite** against the deployed URL with seeded accounts:
   `BASE_URL=<preview> ATTACKER_COOKIE=<patient-B> npm run test:security` — must show, at minimum: patient isolation, clinician isolation, private-notes protection, admin-RPC 401/403, and **PDF-export non-owner 403/404**. **Do not open to patients if any PHI-isolation or export-authorization test fails.**
4. **Merge the mobile hardening** (SecureStore token storage, deep-link password reset, remove the committed anon key from `app.json`) and **rotate the exposed anon key**.
5. **Enable Supabase leaked-password protection** and **revoke `anon` EXECUTE on `check_relationship_permission`** (metadata-oracle hardening). App-config/DB-config actions — outside the app patch.
6. **Confirm the Gemini data-processing terms/no-retention** (PHI, even scrubbed, reaches a third party).

Once 1–3 are complete and the live suite is green, this converts to **GO**.

---

*This certification verifies the deployed database (unchanged, PHI-isolated) and the current `main`. No code, RLS, or database authorization was modified during this gate.*
