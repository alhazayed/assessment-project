# V Welfare — Database Audit Report

**Audit Date:** 2026-07-13  
**Database:** Supabase PostgreSQL  
**Migrations Reviewed:** 100 files in `supabase/migrations/` (~21 with executable SQL)  
**Baseline:** `20260619120000_schema_baseline.sql`  
**Method:** Migration analysis, RLS policy review, index inventory, FK mapping

---

## Database Score: 62/100

| Category | Score | Notes |
|----------|-------|-------|
| Schema Design | 70/100 | Comprehensive healthcare model; some inconsistencies |
| RLS Coverage | 55/100 | All tables enabled; policy stacking and over-broad reads |
| Indexing | 75/100 | Good coverage; some duplicates |
| Constraints | 65/100 | Missing role CHECK; missing FK on completed_submission_id |
| Functions/RPCs | 45/100 | Admin RPCs lack authorization |
| Migration Hygiene | 40/100 | 79 stub migrations; auth trigger gap |
| Scalability | 70/100 | Mat views for admin; pagination patterns exist |

---

## Schema Overview

### Table Inventory (45 tables)

#### Identity & Profiles
| Table | PK | Key Columns | FK |
|-------|-----|-------------|-----|
| profiles | id (uuid) | role, full_name_en/ar, assigned_clinician_id, is_active, demographics | auth.users CASCADE |
| patient_profiles | id | emergency contacts, consent, onboarding, medications | profiles CASCADE |
| clinician_profiles | id | specialty, bio, availability (en/ar) | profiles CASCADE |
| clinician_verifications | clinician_id | license docs, status, reviewed_by | profiles |
| push_tokens | id | user_id, token, platform | profiles CASCADE |

#### Assessment Engine
| Table | Purpose |
|-------|---------|
| assessment_definitions | Instrument metadata, scoring_logic jsonb, high_risk_threshold |
| assessment_items | Questions, response_options, subscale, is_safety_item |
| assessment_governance | License, validation, steward metadata |
| assessment_interpretation_templates | Severity band templates (en/ar) |
| assessment_assignments | Clinician-assigned work |
| assessment_submissions | Scored results, high_risk_flag, guest columns |
| assessment_responses | Per-item answers |
| ai_insights | AI-generated summaries |
| pdf_reports | PDF metadata |
| personality_results | Big Five scores |

#### Packages Module
| Table | Purpose |
|-------|---------|
| packages | Multi-assessment bundles |
| package_assessments | Assessment codes + weights |
| package_interpretations | Composite score bands |
| package_results | User composite scores |
| package_sessions | Progress tracking |

#### Clinical & Patient Data
| Table | Purpose |
|-------|---------|
| clinical_notes | Clinician notes (note_type, is_private) |
| messages | Patient-clinician messaging |
| session_notes | Appointment notes |
| chat_sessions | AI chat history (jsonb) |
| mood_logs | Daily mood scores |
| journal_entries | Journal with sharing flag |
| gratitude_entries | Gratitude journal |
| medications / medication_alerts | Medication tracking |
| wellness_plans | Weekly plans |

#### Consent & Collaboration
| Table | Purpose |
|-------|---------|
| consent_documents | Versioned legal docs |
| user_consents | User consent records |
| patient_access_codes | Patient share codes |
| clinician_invitations | Tokenized invites |
| clinician_patient_relationships | Consent-based relationships |
| relationship_permissions | Granular permission keys |
| notification_events | Consent workflow notifications |

#### Platform & Admin
| Table | Purpose |
|-------|---------|
| audit_log | Immutable audit trail |
| cms_sections, content_articles | CMS |
| platform_announcements, dismissed_announcements | Announcements |
| feature_flags, platform_settings | Runtime config |
| invitations | Legacy invite tokens |
| notifications, notification_log | In-app notifications |
| rate_limit_log | Rate limit tracking |

#### Materialized Views (5 — no RLS)
| View | Aggregates |
|------|------------|
| admin_daily_stats | Daily submission/risk/score stats |
| admin_assessment_stats | Per-assessment performance |
| admin_user_engagement_stats | Per-user submission metrics |
| admin_high_risk_alerts | High-risk submissions + patient name/email |
| admin_demographics_summary | Gender/education/marital breakdowns |

---

## Foreign Key Relationships

### Complete FK Map

```
auth.users ──1:1── profiles
profiles ──1:0..1── patient_profiles
profiles ──1:0..1── clinician_profiles
profiles ──self── assigned_clinician_id → profiles(id) SET NULL

assessment_definitions ──1:N── assessment_items
assessment_definitions ──1:1── assessment_governance
assessment_definitions ──1:N── assessment_submissions
assessment_submissions ──1:N── assessment_responses
assessment_assignments ──N:1── profiles (patient, clinician)
assessment_assignments ──N:1── assessment_definitions

clinician_patient_relationships ──N:1── profiles (clinician, patient)
relationship_permissions ──N:1── clinician_patient_relationships

packages ──1:N── package_assessments, package_interpretations
packages ──1:N── package_results ──N:1── profiles
package_sessions ──N:1── auth.users (INCONSISTENT — should be profiles)
```

### Missing / Broken FKs

| Issue | Table.Column | Severity | Recommendation |
|-------|--------------|----------|----------------|
| No FK | assessment_assignments.completed_submission_id | Medium | ADD FK → assessment_submissions(id) SET NULL |
| Inconsistent FK | package_sessions.user_id → auth.users | Medium | Change to profiles(id) CASCADE |
| Schema drift | admin mat views reference profiles.user_type, profiles.email | Critical | Fix view definitions to use role, join auth.users for email |

---

## Indexes

### Well-Indexed Tables
- assessment_submissions: `(patient_id, submitted_at DESC)`, `(definition_id, submitted_at DESC)`, partial on high_risk_flag
- messages: `(patient_id, clinician_id, created_at)`, `(clinician_id, created_at)`
- mood_logs: `(patient_id, log_date DESC)`
- journal_entries: `(patient_id, created_at DESC)`
- notifications: `(user_id, read_at, created_at DESC)`, partial unread
- rate_limit_log: `(key, created_at DESC)`
- packages: `(status, sort_order)`, `(package_id, user_id)`

### Missing Recommended Indexes

| Table | Column(s) | Query Pattern | Priority |
|-------|-----------|---------------|----------|
| clinician_patient_relationships | (clinician_id, status) | Clinician patient list | High |
| clinician_verifications | (status) | Admin approval queue | Medium |
| user_consents | (user_id, document_id) | Consent lookup | Medium |
| assessment_assignments | (clinician_id, status) | Pending assignments | Medium |

### Duplicate Indexes

| Index Names | Table | Action |
|-------------|-------|--------|
| idx_rate_limit_log_key_created / idx_rate_limit_key_created | rate_limit_log | Drop one |
| Multiple idx_assessment_submissions_patient_submitted | assessment_submissions | Consolidate |

---

## Constraints

### Present
- UNIQUE constraints on assessment item numbers, package_results(package, user)
- NOT NULL on assessment_submissions.patient_id, definition_id
- ON CONFLICT handling in handle_new_user()

### Missing

| Constraint | Table | Recommendation |
|------------|-------|----------------|
| CHECK on role | profiles | `CHECK (role IN ('patient','clinician','admin','superadmin'))` |
| CHECK on status enums | Multiple tables | Add CHECK constraints for status columns |
| FK on completed_submission_id | assessment_assignments | Add deferred FK |

---

## RLS Policies — Final Effective State

### Policy Quality by Table

| Table | Policy Quality | Issue |
|-------|---------------|-------|
| profiles | ✅ Good | Self-read, admin update, escalation trigger |
| assessment_submissions | ✅ Good | Patient own + clinician assigned |
| mood_logs | ✅ Good | Clinician scoped to assigned patients |
| journal_entries | ✅ Good | Clinician read only if is_shared |
| messages | ❌ Degraded | OR-stacked policies weaken assignment checks |
| clinical_notes | ❌ Degraded | OR-stacked policies allow unassigned writes |
| patient_profiles | ❌ Over-broad | Any clinician SELECT all |
| ai_insights | ❌ Over-broad | Any clinician SELECT all |
| chat_sessions | ❌ Over-broad | Any clinician SELECT all |
| medications | ❌ Over-broad | Any clinician SELECT all |
| rate_limit_log | ✅ Fixed | Admin only (was open) |
| platform_settings | ✅ Fixed | Authenticated read (was public) |
| assessment_definitions | ⚠️ Intentional | Public SELECT for guest assessments |
| package_results | ✅ Good | Owner CRUD + admin |

### Critical RLS Regression (Policy Stacking)

**File:** `supabase/migrations/20260624190200_clinical_notes_and_messages_rls.sql`

Baseline policies from schema_baseline.sql were NOT dropped before adding new policies. PostgreSQL combines permissive policies with OR logic.

**Impact:**
- `msg_participant_insert`: Any clinician can insert messages where they are clinician_id — no patient relationship required
- `cn_clinician_own`: Clinician can write notes for any patient_id where they are clinician_id

**Fix SQL:**
```sql
-- Drop baseline policies that conflict
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS clinical_notes_clinician ON public.clinical_notes;
-- Recreate unified policies with relationship checks
```

---

## RPC Functions

| Function | Security | Auth Check | Callable By |
|----------|----------|------------|-------------|
| get_my_role() | SECURITY DEFINER | N/A (returns own role) | authenticated |
| is_admin() | INVOKER | Self | default |
| handle_new_user() | SECURITY DEFINER | Trigger only | trigger |
| prevent_role_self_escalation() | SECURITY DEFINER | Trigger only | trigger |
| submit_assessment_atomic() | SECURITY DEFINER | auth.uid() = patient_id | authenticated |
| check_and_record_rate_limit() | SECURITY DEFINER | N/A | service_role only |
| check_relationship_permission() | SECURITY DEFINER | Relationship lookup | authenticated |
| generate_patient_access_code() | SECURITY DEFINER | **None documented** | ⚠️ Verify revoke |
| get_admin_dashboard_stats() | INVOKER | **NONE** | authenticated ❌ |
| get_high_risk_patients() | INVOKER | **NONE** | authenticated ❌ |
| get_patient_risk_profile(UUID) | INVOKER | **NONE** | authenticated ❌ |
| get_demographics_breakdown() | INVOKER | **NONE** | authenticated ❌ |

---

## Triggers

| Trigger | Table | Event | Function | Status |
|---------|-------|-------|----------|--------|
| on_auth_user_created | auth.users | AFTER INSERT | handle_new_user() | **DROPPED** in 20260619210813, not recreated in repo |
| prevent_role_escalation | profiles | BEFORE UPDATE | prevent_role_self_escalation() | ✅ Active |
| set_*_updated_at | Multiple | BEFORE UPDATE | handle_updated_at() | ✅ Active |
| enforce_governance_on_activation | assessment_definitions | BEFORE UPDATE | enforce_governance_before_activation() | ✅ Active |
| enforce_article_review_before_publish | content_articles | BEFORE UPDATE | enforce_article_review() | ✅ Active |
| packages_updated_at | packages | BEFORE UPDATE | packages_set_updated_at() | ✅ Active |

**Critical:** Auth trigger dropped without recreation in migration files. Fresh migration-only deploy may break user registration. Remote may have `trg_on_auth_user_created` applied manually.

---

## Normalization Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| User identity | ✅ 3NF | profiles + role-specific extension tables |
| Assessment data | ✅ Good | Normalized definitions/items/submissions/responses |
| Permissions | ⚠️ Dual model | assigned_clinician_id AND relationship_permissions |
| JSONB usage | ✅ Appropriate | scoring_logic, response_options, messages jsonb |
| Denormalization | ⚠️ Mat views | Acceptable for admin analytics with proper access control |

---

## Migration Hygiene

| Metric | Value | Risk |
|--------|-------|------|
| Total migration files | 100 | — |
| Executable SQL files | ~21 | — |
| Stub files ("Applied directly to remote") | ~79 | **High** — non-reproducible deploys |
| Duplicate migrations | Several package_results_fk_fix, assessment_submissions_constraints | Medium — apply order matters |
| Known sync issue | Supabase Preview CI failure | Blocks Vercel deployment |

**Recommendation:** Squash migrations into clean baseline; document remote-only changes; fix CI sync.

---

## Scalability Assessment

### Current Capacity
- Compound indexes support common query patterns
- Materialized views offload admin aggregations
- Rate limit log with cleanup cron (stub)
- Admin analytics capped at 5000 rows in API layer

### Future Bottlenecks
| Area | Threshold | Mitigation |
|------|-----------|------------|
| assessment_submissions growth | 1M+ rows | Partition by submitted_at; archive old submissions |
| rate_limit_log | High write volume | Existing cleanup function; consider Redis |
| messages Realtime | 1000+ concurrent | Supabase Realtime limits; channel filtering |
| Admin mat view refresh | Stale data | Implement pg_cron refresh (currently stub) |
| assessment_responses | N items × M submissions | Already indexed on submission_id |

---

## Database Launch Blockers

| ID | Issue | Severity |
|----|-------|----------|
| DB-01 | Admin RPCs exposed to authenticated | Critical |
| DB-02 | RLS policy stacking on messages/clinical_notes | Critical |
| DB-03 | admin_demographics_summary not revoked | Critical |
| DB-04 | Signup role from metadata | Critical |
| DB-05 | Auth trigger missing in migration chain | High |
| DB-06 | Over-broad clinician SELECT policies | High |
| DB-07 | Mat views reference non-existent columns | High |
| DB-08 | 79 non-reproducible migration stubs | High |
| DB-09 | package_sessions.user_id FK inconsistency | Medium |
| DB-10 | completed_submission_id missing FK | Medium |

---

## Recommended Index Additions

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpr_clinician_status
  ON clinician_patient_relationships (clinician_id, status)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cv_status
  ON clinician_verifications (status)
  WHERE status = 'pending_verification';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aa_clinician_status
  ON assessment_assignments (clinician_id, status)
  WHERE status = 'pending';
```

---

## Final Database Verdict

The schema demonstrates **thoughtful healthcare data modeling** with comprehensive RLS, atomic submission RPCs, consent systems, and audit logging. However, **admin RPC exposure**, **RLS policy regression**, and **migration reproducibility gaps** are launch blockers.

**No database changes applied — awaiting approval.**
