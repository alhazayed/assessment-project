# V Welfare — Database Report

**Audit date:** 2026-07-13  
**Scope:** All files under `supabase/migrations/` (100), `lib/supabase/*`, RPC call sites in app  
**Caveat:** ~73 migrations are stubs containing only “Applied directly to remote database”. Production schema may differ from reconstructable SQL. Findings below prioritize **tracked SQL + app code contradictions**.

---

## Executive Summary

Schema design shows mature healthcare intent (profiles, assessments, consent relationships, governance gates, atomic rate limits, audit log). Operational reality is weaker:

- Stub-heavy migration history → non-reproducible DB.
- Dual authorization models in RLS vs app.
- Admin matviews/RPCs misaligned with live columns and over-granted.
- Guest submission model conflicts with later `patient_id NOT NULL` constraints.
- `submit_assessment_atomic` checks `auth.uid()` but is called with service_role.

**Database Score: 48/100**

---

## 1. Table Inventory (purpose)

### Identity
| Table | Purpose |
|-------|---------|
| `profiles` | Central user (role, names, demographics, `assigned_clinician_id`) |
| `patient_profiles` | Extended patient PHI / onboarding / sharing prefs |
| `clinician_profiles` | Clinician bio metadata |

### Assessments
| Table | Purpose |
|-------|---------|
| `assessment_definitions` | Instrument catalog |
| `assessment_governance` | Licensing / publication gate |
| `assessment_items` | Questions |
| `assessment_interpretation_templates` | Approved interpretation copy |
| `assessment_assignments` | Clinician → patient assignments |
| `assessment_submissions` | Results (+ guest demographic columns) |
| `assessment_responses` | Item answers |
| `ai_insights` | AI summaries |
| `pdf_reports` | Export audit trail |
| `personality_results` | Personality battery |
| `wellness_plans` | Generated plans |

### Clinical communication
| Table | Purpose |
|-------|---------|
| `clinical_notes` | Clinician notes |
| `messages` | Patient–clinician chat |
| `session_notes` | Session notes workflow |
| `chat_sessions` | AI chat JSON history |
| `medications` / `medication_alerts` | Med list + alerts |
| `mood_logs` / `journal_entries` / `gratitude_entries` | Self-tracking |

### Consent & collaboration
| Table | Purpose |
|-------|---------|
| `clinician_verifications` | Credential review |
| `patient_access_codes` | Share codes |
| `clinician_invitations` | Invite tokens |
| `clinician_patient_relationships` | Consent links |
| `relationship_permissions` | Granular grants |
| `notification_events` | Consent notifications |
| `consent_documents` / `user_consents` | Legal consent records |

### Packages
| Table | Purpose |
|-------|---------|
| `packages` | Multi-assessment batteries |
| `package_assessments` | Membership + weights |
| `package_interpretations` | Composite bands |
| `package_results` / `package_sessions` | Outcomes / progress |

### Platform
| Table | Purpose |
|-------|---------|
| `audit_log` | Security/clinical audit |
| `notifications` / `notification_log` / `push_tokens` | Messaging channels |
| `rate_limit_log` | Rate counters |
| `feature_flags` / `platform_settings` / `platform_announcements` | Config |
| `content_articles` / `cms_sections` | CMS |
| `invitations` | Legacy email invites |

### Materialized views
`admin_daily_stats`, `admin_assessment_stats`, `admin_user_engagement_stats`, `admin_high_risk_alerts`, `admin_demographics_summary`

---

## 2. Relationships & Normalization

**Strengths:** Clear patient-owned FKs; CASCADE patterns for patient deletion on submissions (post-constraint migrations); consent graph is well-modeled.

**Issues:**

| ID | Severity | Problem |
|----|----------|---------|
| DB-D1 | High | `profiles.role` unconstrained `text` — no CHECK enum |
| DB-D2 | Medium | Demographics duplicated across `profiles` and `patient_profiles` |
| DB-D3 | High | Guest + patient submissions share one table |
| DB-D4 | Critical | Constraint migrations force `patient_id NOT NULL` while guest API inserts null |
| DB-D5 | High | `audit_log.actor_id NOT NULL` vs system/guest inserts omitting actor |
| DB-D6 | Medium | `ai_insights` unique `(patient_id, period, language)` may overwrite |
| DB-D7 | Low | `package_sessions.user_id` still refs `auth.users` while `package_results` fixed to `profiles` |

---

## 3. Indexes

**Present:** Hot-path indexes on submissions, notifications, messages, mood, journal, audit; FK indexes added in multiple migrations; partial indexes for high-risk / unread / active codes; package indexes.

**Gaps:**

| ID | Severity | Finding |
|----|----------|---------|
| DB-C1 | Medium | `notification_events.sender_id` FK likely unindexed |
| DB-C2 | Low | Relationship `invitation_id` optional join unindexed |
| DB-C3 | Medium | Guest analytics would benefit from partial index `WHERE patient_id IS NULL` |
| DB-C4 | High | Matviews comment references pg_cron refresh — **no cron migration in repo** |
| DB-C5 | Low | Duplicate `CREATE INDEX IF NOT EXISTS` noise across migrations |

---

## 4. Constraints & Triggers

**Good:**
- `prevent_role_self_escalation` trigger
- Governance-on-activation trigger
- Article review-before-publish
- `handle_new_user` profile creation
- Atomic rate-limit function (service_role only)

**Risks:**
- `handle_new_user` trusts `raw_user_meta_data.role` (user-editable metadata anti-pattern for authorization — should map only safe defaults like `patient`/`clinician` with admin roles never from metadata).
- Audit immutability claimed in stub migrations; explicit DENY UPDATE/DELETE not visible in tracked SQL.

---

## 5. RLS Assessment

### Strengths
- RLS enabled on baseline PHI tables.
- `get_my_role()` SECURITY DEFINER avoids profiles recursion.
- Consent tables party-scoped.
- Rate limit log locked down after earlier openness.

### Critical / High policy findings

| ID | Severity | Policy / location | Risk |
|----|----------|-------------------|------|
| DB-B1 | Critical | `patient_prof_clinician` any clinician SELECT | Enumerate all patient profiles |
| DB-B2 | High | Broad clinician SELECT on insights/chat/gratitude/pdfs | Cross-patient PHI |
| DB-B3 | Critical | Consent RLS vs `assigned_clinician_id` RLS | Wrong allow/deny vs app |
| DB-B4 | Critical | `20260624190200` notes/messages policies | Insert/read without relationship check |
| DB-B5 | Critical | Admin matview/RPC grants to `authenticated` | Population analytics leakage |
| DB-B6 | High | Incomplete revoke — demographics matview remains | Residual exposure |
| DB-B7 | Medium | Packages readable including drafts | Premature content exposure |
| DB-B8 | High | Audit self-insert for authenticated | Forgeable audit trail |

**Note:** Views should use `security_invoker` (stub claims this; not verifiable in repo SQL).

---

## 6. RPC / Function Privilege Model

| Function | Definer | Grants | Issue |
|----------|---------|--------|-------|
| `get_my_role()` | Yes | authenticated (intended) | OK if anon revoked |
| `submit_assessment_atomic()` | Yes | authenticated | Called via **service_role** → `auth.uid()` NULL → should fail auth check |
| `check_and_record_rate_limit()` | Yes | service_role | ✅ |
| `generate_patient_access_code()` | Yes | unclear PUBLIC revoke | Medium |
| `check_relationship_permission()` | Yes | authenticated | Defined; unused by app |
| Admin dashboard RPCs | No | authenticated | **No admin guard** |

### DB-E1 — Atomic submit caller mismatch (Critical)

```sql
-- function requires auth.uid() = p_patient_id
```

```ts
// app/api/submit-assessment/route.ts
const db = createAdminClient()
await db.rpc('submit_assessment_atomic', { p_patient_id: user.id, ... })
```

Under service_role, `auth.uid()` is null → raises `Not authenticated` unless remote function differs from repo. This is either a **production outage** risk or evidence of **schema drift** from stubs.

**Fix:** Call with user JWT client, or add a service-role-safe overload that asserts caller is trusted server after route auth.

---

## 7. Migration Hygiene

| ID | Severity | Finding |
|----|----------|---------|
| DB-F1 | Critical | ~73/100 migrations are empty stubs |
| DB-F2 | Medium | Duplicate triplets for submission constraints & package FK fixes |
| DB-F3 | High | Matviews reference `full_name`, `email`, `user_type` — live schema uses `full_name_en`, `role`, no email column |
| DB-F4 | High | Comments say guests use separate table; app still writes main table |
| DB-F5 | Medium | Baseline snapshot may not replay cleanly on greenfield |
| DB-F6 | High | Known Issues: remote migration versions not in local dir (blocks Vercel Supabase preview) |

`KNOWN_ISSUES.md` documents active Supabase Preview sync failure.

---

## 8. Scalability

1. RLS EXISTS subqueries + role function per row — OK early; optimize with `(select auth.uid())` pattern already partially applied.
2. Unbounded `audit_log` growth.
3. `chat_sessions.messages` jsonb monolith.
4. Matviews without refresh = stale or unused.
5. Heavy service-role usage scales ops risk, not DB RLS load.
6. `max_rows` in config may truncate large admin pulls.

---

## 9. Healthcare-Specific DB Controls

| Control | Status |
|---------|--------|
| Consent documents + user_consents | ✅ Model present |
| Relationship permissions | ✅ Tables; ⚠️ not wired to RLS/app |
| Audit immutability | ⚠️ Incomplete in tracked SQL |
| Guest PHI separation | ❌ Co-mingled / conflicting constraints |
| High-risk flags | ✅ Column + server notify |
| Minimum necessary access | ❌ Broad clinician policies |
| Retention / deletion cascades | ⚠️ Partial; app delete incomplete |

---

## 10. Prioritized DB Fixes

| Priority | ID | Fix | Effort (hrs) |
|----------|-----|-----|--------------|
| P0 | DB-F1 | Export remote schema/migrations into git | 16–24 |
| P0 | DB-B5/B6 | Revoke matview/RPC from authenticated; admin-only wrappers | 6–8 |
| P0 | DB-B1/B3/B4 | Rewrite clinician policies to relationships + permissions | 16–24 |
| P0 | DB-E1 | Align submit RPC with caller JWT model | 4 |
| P0 | DB-D4 | Implement real guest table or revert NOT NULL | 8–12 |
| P1 | DB-B8/D5 | Audit immutability + nullable system actor | 6 |
| P1 | DB-D1 | Role CHECK + signup role allowlist | 2 |
| P1 | DB-C4/F3 | Fix/remove matviews + schedule refresh | 6–8 |
| P2 | Indexes & FK alignment | 4 |

---

## Database Scorecard

| Domain | Score |
|--------|-------|
| Schema design | 70 |
| Constraints | 55 |
| Indexes | 72 |
| RLS correctness | 35 |
| RPC privilege | 40 |
| Migration hygiene | 25 |
| Healthcare controls | 50 |
| Scalability readiness | 55 |
| **Overall** | **48** |

**Verdict:** ❌ Database layer is **not go-live ready** until Critical items above are resolved and stub SQL is recovered into source control.
