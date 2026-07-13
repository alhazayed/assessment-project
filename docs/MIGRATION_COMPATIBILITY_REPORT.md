# Migration Compatibility Report

**Migration:** `20260628120000_production_security_hardening.sql`  
**Date:** 2026-07-13  
**Method:** Full-repository grep for `.rpc()`, `.from()`, SQL references, and client key usage (`createClient` = anon JWT, `createAdminClient` = service_role).

---

## Executive Summary

| Change | Verdict | Action Taken |
|--------|---------|--------------|
| Revoke 8 admin RPCs from `authenticated` | **Safe to apply immediately** | Admin API routes already use `createAdminClient()` |
| Revoke `admin_demographics_summary` from `authenticated` | **Safe to apply immediately** | No direct client access; RPC uses service_role |
| Grant matviews to `service_role` | **Safe to apply immediately** | Required by `kpis/history` + RPC internals |
| Drop `cn_*` clinical_notes policies | **Requires code changes first** | ✅ API + RLS helper added before migration |
| Replace `clinician_own_notes` policy | **Requires code changes first** | ✅ `clinician_can_access_patient_notes()` in migration |
| Revoke `generate_patient_access_code` from PUBLIC | **Safe to apply immediately** | Already called via `createAdminClient()` only |
| Add `deletion_requested_at` column | **Safe to apply immediately** | Written via service_role; read by cron |

**Deploy order:** App code (this PR) → then `supabase db push`.

---

## 1. Admin RPC Functions (REVOKE from authenticated)

### Proposed SQL

```sql
REVOKE EXECUTE ON FUNCTION get_admin_dashboard_stats(INTEGER) FROM PUBLIC, anon, authenticated;
-- (+ 7 more admin RPCs)
GRANT EXECUTE ON ... TO service_role;
```

### Usage Matrix

| RPC Function | Frontend (anon JWT) | Backend API | Key Used | Breaks? |
|--------------|---------------------|-------------|----------|---------|
| `get_admin_dashboard_stats` | **None** — no `supabase.rpc()` in any `.tsx` | `app/api/admin/dashboard/stats/route.ts` | `createAdminClient()` → **service_role** | No |
| `get_top_assessments` | **None** | `app/api/admin/dashboard/assessments/route.ts` | service_role | No |
| `get_user_engagement_metrics` | **None** | `app/api/admin/dashboard/engagement/route.ts` | service_role | No |
| `get_demographics_breakdown` | **None** | `app/api/admin/dashboard/demographics/route.ts` | service_role | No |
| `get_high_risk_patients` | **None** | **Not called** — `risk/route.ts` queries base tables directly | service_role (N/A) | No |
| `get_assessment_completion_funnel` | **None** | **Not called** anywhere in app | N/A | No — closes JWT bypass only |
| `get_assessment_performance_comparison` | **None** | **Not called** anywhere in app | N/A | No |
| `get_patient_risk_profile` | **None** | **Not called** anywhere in app | N/A | No |

### Frontend Indirect Access (via fetch → API)

| UI Component | HTTP Call | Underlying RPC |
|--------------|-----------|----------------|
| `components/admin/dashboard-overview.tsx` | `GET /api/admin/dashboard/stats` | `get_admin_dashboard_stats` |
| `components/admin/dashboard-overview.tsx` | `GET /api/admin/dashboard/assessments` | `get_top_assessments` |
| `app/x/control/(panel)/risk/page.tsx` | `GET /api/admin/dashboard/risk` | **No RPC** — direct table queries |
| `app/(app)/admin/kpi-dashboard/dashboard-client.tsx` | `GET /api/admin/kpis` | **No RPC** — direct queries |
| `components/kpi-trend-charts.tsx` | `GET /api/admin/kpis/history` | **No RPC** — `admin_daily_stats` matview |

**Mobile:** Zero `.rpc()` calls for admin functions (`mobile/` grep: no matches).

### Pre-migration risk (if applied without code fix)

Prior to PR #57, admin dashboard routes used `createClient()` (authenticated JWT). Revoking RPC execute would have **broken**:
- `/api/admin/dashboard/stats`
- `/api/admin/dashboard/assessments`
- `/api/admin/dashboard/engagement`
- `/api/admin/dashboard/demographics`

**Current state:** All four routes import `createAdminClient` from `lib/supabase/admin.ts` (service_role key).

### Classification: **Safe to apply immediately** (after PR deploy)

---

## 2. Materialized View `admin_demographics_summary` (REVOKE)

### Proposed SQL

```sql
REVOKE ALL ON public.admin_demographics_summary FROM anon, authenticated;
GRANT SELECT ON public.admin_demographics_summary TO service_role;
```

### Usage Matrix

| Access Path | File | Key | Direct `.from('admin_demographics_summary')`? |
|-------------|------|-----|-----------------------------------------------|
| RPC `get_demographics_breakdown` | SQL in `20260627220100_admin_dashboard_rpcs.sql` | Runs as definer / service_role caller | Internal SQL only |
| API route | `app/api/admin/dashboard/demographics/route.ts` | service_role via RPC | No |
| Frontend | **None** | — | **No** |
| `components/demographics-card.tsx` | Reads `profiles` table only | anon JWT | No |

### Related matviews (already revoked in `20260628071704`)

| Matview | Backend Access | Key |
|---------|----------------|-----|
| `admin_daily_stats` | `app/api/admin/kpis/history/route.ts:40` | `createAdminClient()` |
| `admin_assessment_stats` | Internal to RPCs only | service_role |
| `admin_user_engagement_stats` | Internal to RPCs only | service_role |
| `admin_high_risk_alerts` | Internal to RPCs only; risk route uses base tables | service_role |

**Note:** Migration adds explicit `GRANT SELECT ... TO service_role` on all 5 matviews to ensure RPCs and `kpis/history` continue working after revoke.

### Classification: **Safe to apply immediately**

---

## 3. Clinical Notes Policies (DROP `cn_*` + REPLACE `clinician_own_notes`)

### Proposed SQL

```sql
DROP POLICY "cn_clinician_own", "cn_patient_read", "cn_admin_read";
DROP POLICY clinician_own_notes;
CREATE POLICY clinician_own_notes ... clinician_can_access_patient_notes(patient_id);
```

### Policy Behavior Comparison

| Policy | Effect | Security |
|--------|--------|----------|
| `cn_clinician_own` (DROP) | Any clinician CRUD on own `clinician_id` rows — **no assignment check** | Weak |
| `cn_patient_read` (DROP) | Patient reads **all** notes including `is_private=true` | Weak |
| `cn_admin_read` (DROP) | Redundant with `notes_admin_all` | Redundant |
| `clinician_own_notes` (REPLACE) | Clinician CRUD only with assignment OR active relationship + `generate_clinical_notes` | Strong |
| `notes_patient_read_nonprivate` (KEEP) | Patient reads only `is_private=false` | Strong |
| `notes_admin_all` (KEEP) | Admin full access | OK |

### Usage Matrix

| Access Path | File | Key | Table Op |
|-------------|------|-----|----------|
| Clinician UI | `app/(app)/patients/patients-content.tsx` | fetch → API | indirect |
| API GET/POST/PUT/DELETE | `app/api/clinical-notes/route.ts` | `createClient()` anon JWT + RLS | `.from('clinical_notes')` |
| Mobile | **None** | — | — |
| Frontend direct | **None** — grep shows zero client `.from('clinical_notes')` | — | — |

### Breakage Analysis

**If we only DROP `cn_*` without replacing baseline policy:**

| Scenario | Before (cn_* OR baseline) | After naive DROP | Fixed by this PR |
|----------|---------------------------|------------------|------------------|
| Consent-linked clinician writes note | ✅ via `cn_clinician_own` | ❌ blocked by baseline `assigned_clinician_id` only | ✅ `clinician_can_access_patient_notes()` |
| Patient reads private note | ✅ via `cn_patient_read` | ❌ blocked (intended) | ✅ Restores `is_private` protection |
| Legacy `assigned_clinician_id` clinician | ✅ | ✅ | ✅ |
| Admin | ✅ via `notes_admin_all` | ✅ | ✅ |

### Code Changes (deploy BEFORE migration)

1. **`lib/clinician-patient-access.ts`** — API-layer guard matching DB function logic
2. **`app/api/clinical-notes/route.ts`** — GET/POST/PUT use `clinicianCanAccessPatientNotes()`
3. **Migration** — `clinician_can_access_patient_notes()` SQL function + replaced policy

### Classification: **Requires code changes first** → ✅ implemented

---

## 4. `generate_patient_access_code()` (REVOKE from PUBLIC)

### Usage Matrix

| Call Site | File | Key | Line |
|-----------|------|-----|------|
| GET code | `app/api/patient/code/route.ts` | `createAdminClient()` | 48 |
| POST regenerate | `app/api/patient/code/route.ts` | `createAdminClient()` | 145 |
| Frontend direct RPC | **None** | — | — |
| Mobile RPC | **None** | — | — |

Auth flow uses `createClient()` for user session only; RPC always via `adminClient`.

### Classification: **Safe to apply immediately**

---

## 5. `profiles.deletion_requested_at` (ADD COLUMN)

### Usage Matrix

| Call Site | File | Key | Operation |
|-----------|------|-----|-----------|
| Set on delete request | `app/api/user/delete-request/route.ts` | `createAdminClient()` | `.update({ deletion_requested_at })` |
| Cron processor | `app/api/cron/process-deletions/route.ts` | `createAdminClient()` | `.select()` + `auth.admin.deleteUser()` |
| Frontend direct | **None** | — | — |

`ADD COLUMN IF NOT EXISTS` is non-breaking for existing queries.

### Classification: **Safe to apply immediately**

---

## 6. Other RPCs in Codebase (NOT in this migration)

Documented for completeness — no changes proposed:

| RPC | Caller | Key | Migration Impact |
|-----|--------|-----|------------------|
| `check_and_record_rate_limit` | `lib/rate-limit.ts` | service_role | None |
| `submit_assessment_atomic` | `app/api/submit-assessment/route.ts` | service_role | None |

---

## 7. Deployment Checklist

```bash
# 1. Deploy app (PR #57 + this compatibility fix)
git push origin cursor/final-production-readiness-25f2

# 2. Verify admin dashboard works on staging (service_role path)
curl -b "admin cookies" https://staging.example.com/api/admin/dashboard/stats?days=7

# 3. Apply migration
supabase db push

# 4. Verify JWT can no longer call admin RPC directly (should fail)
# Use a patient session token in Supabase client:
# supabase.rpc('get_admin_dashboard_stats', { p_days: 7 }) → permission denied

# 5. Verify clinical notes still work for consent-linked clinician
# POST /api/clinical-notes with active relationship + generate_clinical_notes permission
```

---

## 8. Change Classification Summary

| # | Change | Classification | Proof |
|---|--------|----------------|-------|
| 1 | Revoke 8 admin RPCs from authenticated | **Safe to apply immediately** | Zero frontend `.rpc()`; 4 API routes use `createAdminClient` |
| 2 | Revoke `admin_demographics_summary` | **Safe to apply immediately** | Zero `.from('admin_demographics_summary')` in TS/TSX |
| 3 | Grant matviews to service_role | **Safe to apply immediately** | `kpis/history` + RPCs need SELECT |
| 4 | Drop `cn_*` + replace `clinician_own_notes` | **Requires code changes first** | Would break consent-model clinicians; fixed in PR |
| 5 | Revoke `generate_patient_access_code` | **Safe to apply immediately** | Only `patient/code/route.ts` via admin client |
| 6 | Add `deletion_requested_at` | **Safe to apply immediately** | Additive column; writes via service_role |

| Change | Do not apply |
|--------|--------------|
| — | **None** — all changes are safe after code deploy |

---

## 9. Files Modified for Compatibility

| File | Purpose |
|------|---------|
| `lib/clinician-patient-access.ts` | API guard for consent + legacy assignment |
| `app/api/clinical-notes/route.ts` | Uses new guard on GET/POST/PUT |
| `supabase/migrations/20260628120000_production_security_hardening.sql` | SQL helper + policy replacement + grants |
| `components/admin/dashboard-overview.tsx` | Remove unused `createClient` import |
