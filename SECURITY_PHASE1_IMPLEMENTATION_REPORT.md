# Security Phase 1 Implementation Report

**Date:** 2026-07-18  
**Branch:** `cursor/security-phase1-ad42`  
**Project:** vwelfare-platform (`wyzezyctpvlohuuhzyof`)  
**Migration:** `20260718124400_security_phase1_hardening.sql`  
**Rollback:** `20260718124400_security_phase1_hardening.down.sql`

---

## 1. Pre-change inspection summary

### Live schema vs repository (conflicts)

| Area | Live DB (pre-change) | Repo migrations | Conflict |
|------|----------------------|-----------------|----------|
| Admin RPC EXECUTE for `authenticated` | Already **revoked** | `20260627220100` still **grants** | Repo lag; live ahead |
| `assign_read` clinician scope | Already relationship-scoped via `has_clinician_access` | Baseline allows any clinician | Repo lag; live ahead |
| `msg_participant_insert` | **Still present** (weak OR with `messages_insert`) | Introduced by `20260624190200` | **Active vulnerability** |
| `cn_patient_read` (private notes) | Already absent | Introduced by `20260624190200` | Live already cleaned |
| `admin_demographics_summary` | **Does not exist** | Grant in `20260627220000` | Guarded revoke |
| Admin dashboard API clients | Used user-scoped `createClient()` | Would fail once RPC revoked | **App bug** |

Remote also had ~20 migrations not present as SQL in this workspace (stubs / dashboard-only). Phase 1 migration is **idempotent** so it can apply cleanly on both lagged and already-hardened environments.

---

## 2. Changes applied

### 2.1 Database (`20260718124400_security_phase1_hardening.sql`)

Applied to production project via Supabase `apply_migration`.

1. **`has_clinician_access(uuid,uuid,text)`** — SECURITY DEFINER helper (relationship permission OR legacy `assigned_clinician_id`). EXECUTE granted to `authenticated` + `service_role`; revoked from `PUBLIC`/`anon`.
2. **Dropped overlapping policies:** `cn_patient_read`, `cn_clinician_own`, `cn_admin_read`, `msg_participant_insert`, `msg_participant_read`.
3. **Restored** `notes_patient_read_nonprivate` (patients may read only `is_private = false`).
4. **Replaced** `assign_read` with relationship-scoped clinician SELECT.
5. **Revoked** admin RPC EXECUTE from `PUBLIC`/`anon`/`authenticated`; **granted** `service_role` only for:
   - `get_admin_dashboard_stats`
   - `get_top_assessments`
   - `get_high_risk_patients`
   - `get_user_engagement_metrics`
   - `get_assessment_completion_funnel`
   - `get_assessment_performance_comparison`
   - `get_patient_risk_profile`
   - `get_demographics_breakdown` (if present)
6. **Revoked** Data API SELECT on all `admin_*` materialized views from `anon`/`authenticated` (including demographics if present).

**Intentionally not rewritten:** admin RPC function *bodies* (live matview column sets diverge from original migration SQL; grant lockdown + service-role API is sufficient for C1).

### 2.2 API

| File | Change |
|------|--------|
| `app/api/assignments/route.ts` | Clinician `patient_id` queries require `has_clinician_access`; removes cross-patient IDOR |
| `app/api/admin/dashboard/stats/route.ts` | `requireAdmin()` + `createAdminClient()` for RPC |
| `app/api/admin/dashboard/assessments/route.ts` | Same |
| `app/api/admin/dashboard/demographics/route.ts` | Same |
| `app/api/admin/dashboard/engagement/route.ts` | Same |

### 2.3 Mobile (Phase 1 items C5–C7)

| File | Change |
|------|--------|
| `mobile/lib/secure-storage.ts` | **New** — SecureStore-backed Supabase storage adapter |
| `mobile/lib/supabase.ts` | Uses SecureAuthStorage; warns if env missing |
| `mobile/lib/auth-deep-link.ts` | **New** — PKCE + hash-token deep link handler |
| `mobile/app/_layout.tsx` | Listens for `vwelfare://` auth URLs; routes recovery → reset-password |
| `mobile/app/reset-password.tsx` | Subscribes to auth state for async session from deep link |
| `mobile/app.json` | **Removed hardcoded Supabase URL/anon JWT**; added Android intentFilters |
| `mobile/package.json` | Added `expo-linking` |
| `mobile/.env.example` | Documents EAS secrets; no hardcoding |

---

## 3. Post-change verification (live)

| Check | Result |
|-------|--------|
| `msg_participant_insert` present | **false** (dropped) |
| `notes_patient_read_nonprivate` present | **yes** |
| `assign_read` present (scoped) | **yes** |
| `authenticated` EXECUTE on `get_admin_dashboard_stats` | **false** |
| `service_role` EXECUTE on `get_admin_dashboard_stats` | **true** |
| `anon` EXECUTE on `has_clinician_access` | **false** |
| `authenticated` EXECUTE on `has_clinician_access` | **true** (needed by assignments API) |

### Build gates

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **PASS** (no warnings/errors) |
| `npx tsc --noEmit` | **PASS** (exit 0) |

---

## 4. Phase 1 checklist coverage

| Audit ID | Item | Status |
|----------|------|--------|
| C1 | Admin RPC PHI exposure | **Fixed** (grants + service-role API) |
| C2 | Private clinical notes via overlapping RLS | **Confirmed fixed** (policy absent; non-private policy enforced) |
| C3 | Weak `msg_participant_insert` | **Fixed** (dropped) |
| C4 | Assignments IDOR (API + RLS) | **Fixed** (API ownership check + scoped `assign_read`) |
| C5 | Mobile AsyncStorage tokens | **Fixed** (SecureStore adapter) |
| C6 | Mobile password-reset deep links | **Fixed** (handler + layout wiring) |
| C7 | Hardcoded mobile credentials | **Fixed** (removed from `app.json`) |
| H1 | `admin_demographics_summary` grant | **Guarded revoke** (view absent on live) |

---

## 5. Rollback

Manual only (not auto-applied):

```bash
# Review WARNING in file first — reopens PHI paths
psql "$DATABASE_URL" -f supabase/migrations/20260718124400_security_phase1_hardening.down.sql
```

Also revert application commits on `cursor/security-phase1-ad42` and redeploy.

---

## 6. Residual risks / follow-ups (out of Phase 1)

- Supabase advisor still warns that `get_my_role` / `check_relationship_permission` are callable by `anon` (pre-existing; Phase 2).
- Leaked-password protection disabled in Auth settings (ops toggle).
- Broad clinician SELECT on some PHI tables (Phase 2 H2 / relationship scoping).
- `npm run typecheck` / `npm run test` scripts still missing from root `package.json`.
- Mobile PDF path mismatch (`/api/export/pdf/...`) remains (Phase 2 H8).
- Account deletion still audit-only (Phase 2 H7).

---

## 7. Deployment notes

1. Migration **already applied** to `wyzezyctpvlohuuhzyof`.
2. Deploy web app so admin dashboard routes use `createAdminClient()` — required now that RPC EXECUTE is service-role-only.
3. Rebuild mobile with EAS env:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_WEB_URL`
4. Confirm Supabase Auth redirect allowlist includes `vwelfare://reset-password`.
