# V Welfare — Bug & Issue Report

**Audit date:** 2026-07-13  
**Scope:** Full repository code audit (web, API, DB migrations, mobile)  
**Rule:** Issues are evidence-based. Effort is engineering hours, not calendar time.

---

## Verdict Snapshot

| Area | Ready? |
|------|--------|
| Patient self-assessments (web) | Mostly |
| Packages (flagged) | Mostly |
| Clinician-connected care | **No** |
| Admin analytics | Partial |
| GDPR delete/export | **No** |
| Payments | **Absent** |
| Mobile parity / scoring integrity | **No** |

---

## Critical

### BUG-C001 — Dual clinician access model breaks care workflows
- **Location:** `app/api/connect/[token]/route.ts`, `app/api/access-requests/[id]/route.ts`, `app/(app)/messages/page.tsx`, `app/api/assignments/route.ts`, `app/api/clinical-notes/route.ts`, RLS in `20260619120000_schema_baseline.sql`
- **Problem:** Consent creates `clinician_patient_relationships`; messaging/assignments/notes/RLS require `profiles.assigned_clinician_id`, which app code never sets.
- **Why it matters:** Clinicians cannot message, assign, or note patients after “successful” consent. Care pathway is non-functional.
- **Risk:** Clinical ops failure; unsafe future hotfix that sets assignment without permission checks.
- **Solution:** Pick one model. Prefer relationships + `check_relationship_permission()` everywhere; migrate RLS and APIs; remove or sync `assigned_clinician_id` deliberately.
- **Effort:** 24–40h

### BUG-C002 — Clinician patients API queries non-existent `user_id`
- **Location:** `app/api/clinician/patients/route.ts` lines 83–96
- **Problem:** Selects `assessment_submissions.user_id`; schema uses `patient_id`.
- **Why it matters:** Latest assessment data always missing/errors; clinician dashboard wrong.
- **Risk:** Silent clinical information failure.
- **Solution:** Replace with `patient_id`; add regression test.
- **Effort:** 0.5–1h

### BUG-C003 — Admin package export selects missing columns
- **Location:** `app/api/admin/packages/export/route.ts`
- **Problem:** `.select('id, full_name, email')` — profiles have `full_name_en`/`full_name_ar`, no `email`.
- **Why it matters:** Export broken; admins may ship empty/wrong CSV.
- **Risk:** Operational failure; attempted PII export incorrectly designed.
- **Solution:** Use `full_name_en`; join `auth.users` for email only if justified + audited.
- **Effort:** 2–4h

### BUG-C004 — GDPR account deletion is non-functional
- **Location:** `app/api/user/delete-request/route.ts`
- **Problem:** Inserts audit row and returns “scheduled within 30 days”; no job, anonymization, or `auth.admin.deleteUser`.
- **Why it matters:** GDPR Art. 17 / user trust; false compliance claim.
- **Risk:** Regulatory and reputational.
- **Solution:** Soft-delete → grace period → cascade/anonymize → delete auth user; admin queue UI.
- **Effort:** 16–24h

### BUG-C005 — Mobile assessments bypass server scoring API
- **Location:** `mobile/app/(app)/assessments/[id].tsx`
- **Problem:** Client-side score + direct Supabase insert vs web `/api/submit-assessment`.
- **Why it matters:** Score integrity, high-risk server notify, validation, audit trail diverge.
- **Risk:** Manipulated scores; missed crisis alerts.
- **Solution:** Call web API with Bearer auth; remove client scoring as source of truth.
- **Effort:** 8–12h

### BUG-C006 — Admin PHI accessible without PIN step-up
- **Location:** RLS admin policies; `app/api/reports/route.tsx`; normal `/login` for admin roles
- **Problem:** `admin_session` not required for DB/API PHI when role is admin.
- **Why it matters:** Step-up MFA/PIN is bypassed for mental-health data.
- **Risk:** Insider threat / stolen session blast radius.
- **Solution:** Enforce `requireAdmin()` on all admin PHI APIs; bind RLS or force service-role-only admin reads.
- **Effort:** 12–20h

### BUG-C007 — Overly broad clinician RLS on patient profiles (+ related)
- **Location:** baseline `patient_prof_clinician`; similar broad clinician SELECTs; messages/notes policy regression
- **Problem:** Any clinician can SELECT all patient_profiles; notes/messages policies lack relationship checks.
- **Why it matters:** Horizontal PHI breach via PostgREST.
- **Risk:** Mass privacy incident.
- **Solution:** Scope with relationship/assignment EXISTS; restore hard checks.
- **Effort:** 12–24h

### BUG-C008 — Admin dashboard RPCs/matviews granted to authenticated
- **Location:** `20260627220000_*`, `20260627220100_*`, partial revoke `20260628071704_*`
- **Problem:** EXECUTE/SELECT to `authenticated` without admin assert; broken column refs; demographics revoke incomplete.
- **Why it matters:** Population analytics / high-risk leakage to any logged-in user.
- **Risk:** Platform-wide PHI aggregate exposure.
- **Solution:** Revoke all; service-role or admin-checked DEFINER only; fix columns.
- **Effort:** 6–10h

### BUG-C009 — Clinician dashboard shows patient UI
- **Location:** `app/(app)/dashboard/page.tsx`
- **Problem:** No role branch; crisis banner and patient widgets for clinicians.
- **Why it matters:** Confusing clinical UX; wasted clinician time.
- **Risk:** Mis-triage; trust loss.
- **Solution:** Clinician overview (caseload, high-risk, tasks); hide patient-only widgets.
- **Effort:** 8–12h

---

## High

### BUG-H001 — Login/signup rate limit & CAPTCHA client-only
- **Location:** `app/(auth)/login/page.tsx`, `register/page.tsx`, `/api/auth/check-*-limit`
- **Problem:** Attacker calls Supabase Auth directly with anon key.
- **Solution:** Server login/register routes enforcing Turnstile + RL.
- **Effort:** 6–10h

### BUG-H002 — Password reset open `redirectTo`
- **Location:** `app/api/auth/forgot-password/route.ts`
- **Solution:** Allowlist origin/path against `NEXT_PUBLIC_SITE_URL`.
- **Effort:** 1h

### BUG-H003 — AI routes skip `scrubPHI`
- **Location:** `app/api/ai-chat`, `synthesis`, `clinical-notes` PUT
- **Solution:** Scrub all outbound Gemini payloads; vendor DPA/BAA.
- **Effort:** 4–6h

### BUG-H004 — Clinician verification: no upload UI; admin approval API orphaned
- **Location:** `clinician/verification/page.tsx`, `/api/admin/clinician-verifications`
- **Solution:** Storage upload + admin clinicians page wired to API + HMAC.
- **Effort:** 16–28h

### BUG-H005 — Inconsistent admin auth (HMAC / superadmin)
- **Location:** `clinician-verifications`, `kpis/[kpiId]/alert`
- **Solution:** Standardize on `requireAdmin()`.
- **Effort:** 4–6h

### BUG-H006 — Guest submit non-atomic
- **Location:** `submit-assessment-guest/route.ts`
- **Solution:** Atomic RPC supporting null patient / guest table.
- **Effort:** 3–5h

### BUG-H007 — Connect accept race; approve without status guard
- **Location:** `connect/[token]`, `access-requests/[id]`
- **Solution:** Conditional update + unique (clinician, patient); status machine.
- **Effort:** 5–8h

### BUG-H008 — Risk dashboard returns patient names
- **Location:** `app/api/admin/dashboard/risk/route.ts`
- **Solution:** Pseudonymize or clinical-need + audit.
- **Effort:** 2–4h

### BUG-H009 — Reports deny consenting clinicians
- **Location:** `app/api/reports/route.tsx`
- **Solution:** Permission-gated clinician access.
- **Effort:** 2–3h

### BUG-H010 — `submit_assessment_atomic` + service_role mismatch
- **Location:** RPC migration + `submit-assessment/route.ts`
- **Solution:** User JWT RPC call or service-role-safe function.
- **Effort:** 4h

### BUG-H011 — Shared `ADMIN_PIN`
- **Location:** env + admin login
- **Solution:** Per-admin TOTP/WebAuthn.
- **Effort:** 16–24h

### BUG-H012 — Mobile crisis numbers US-centric; core tabs hidden
- **Location:** `mobile/app/emergency.tsx`, `(app)/_layout.tsx`
- **Solution:** MENA helplines; expose Mood/Messages hub.
- **Effort:** 6–8h

### BUG-H013 — ADHD zone English-only despite `lang` prop
- **Location:** `components/adhd-zone-checker.tsx`
- **Solution:** Full i18n keys + RTL.
- **Effort:** 16–24h

### BUG-H014 — Stub migrations / remote sync failure
- **Location:** `supabase/migrations/*`, `KNOWN_ISSUES.md`
- **Solution:** Dump remote SQL into repo; fix preview sync.
- **Effort:** 16–24h

### BUG-H015 — Guest vs `patient_id NOT NULL` schema conflict
- **Location:** constraint migrations vs guest route
- **Solution:** Dedicated guest table or aligned CHECK.
- **Effort:** 8–12h

---

## Medium

| ID | Location | Problem | Effort |
|----|----------|---------|--------|
| BUG-M001 | `admin/research/route.ts` | `totalUsers` counts submission ids | 1h |
| BUG-M002 | `admin/packages` PATCH | Mass-assign arbitrary fields | 1–2h |
| BUG-M003 | `admin/flags` PATCH | Weak validation | 1h |
| BUG-M004 | `clinician/verification` | Unvalidated `document_urls` | 4–8h |
| BUG-M005 | `user/export-data` | Incomplete GDPR export | 4–6h |
| BUG-M006 | `score-assessment` | Public, no CAPTCHA | 2h |
| BUG-M007 | `notify-high-risk` | Redundant dead client path | 1h |
| BUG-M008 | `connect/[token]/page` | Decline link 404 | 2–3h |
| BUG-M009 | `connect/.../accept` | Wrong `/auth/login` path | 0.5h |
| BUG-M010 | App layout / middleware | `is_active` not enforced | 2–3h |
| BUG-M011 | permissions vs API keys | Schema drift | 4h |
| BUG-M012 | Admin results | In-memory filters vs count | 4–6h |
| BUG-M013 | KPI alerts | Not persisted (TODO) | 6–8h |
| BUG-M014 | Rate limit fail-closed | Auth availability DoS | 2h |
| BUG-M015 | Redis rate limit unused | Doc/code drift | 3–4h |
| BUG-M016 | Patients/messages mobile | Unusable master-detail | 12–16h |
| BUG-M017 | Shared Page* components missing | Inconsistent states | 6–8h |
| BUG-M018 | Assessment a11y radios | WCAG fail | 4–6h |
| BUG-M019 | Dark mode gray pages | Patients/error | 6–8h |
| BUG-M020 | Register enumeration | `error.message` leak | 1h |
| BUG-M021 | Admin session deterministic HMAC | Stolen cookie reuse | 4–6h |
| BUG-M022 | Onboarding consent optional | Ethical/compliance gap | 2h |
| BUG-M023 | `profiles.role` no CHECK | Injection via metadata | 2h |
| BUG-M024 | Audit log forge/immutability | Authenticated insert; no deny update | 6h |

---

## Low

| ID | Problem | Effort |
|----|---------|--------|
| BUG-L001 | Payments entirely absent | Product scope (large) |
| BUG-L002 | `/clinicians` marketing “Coming Soon” vs live clinician app | 2h |
| BUG-L003 | Duplicate admin surfaces `/admin` vs `/x/control` | 4h |
| BUG-L004 | CSP `style-src unsafe-inline` | Hard; document |
| BUG-L005 | Health endpoint `hasAiKey` | 0.5h |
| BUG-L006 | Reset password weaker policy | 1h |
| BUG-L007 | Hardcoded sidebar EN strings | 2h |
| BUG-L008 | Auth BrandLogo inconsistency | 1h |
| BUG-L009 | Select chevron RTL CSS | 2h |
| BUG-L010 | Chart accessibility alternatives | 6h |
| BUG-L011 | Package interpret raw Gemini fetch vs shared helper | 2h |
| BUG-L012 | Next 14.2.35 CVE upgrade pending | 8–16h (regression) |

---

## Workflow Audit Summaries

### Clinician workflow
| Step | Status |
|------|--------|
| Registration | Partial (shared signup) |
| Email verification | Supabase-native |
| Profile completion | Partial |
| License verification form | Partial |
| Certificate upload | ❌ Coming soon |
| Admin approval | ❌ API only, no UI |
| Dashboard | ❌ Patient dashboard |
| Appointments | ❌ Not implemented |
| Assessments assign | ❌ Broken (assignment model) |
| Messaging | ❌ Broken |
| Notifications | Partial |
| Reports | ❌ Clinicians blocked |

### Patient workflow
| Step | Status |
|------|--------|
| Signup / verify | Partial (RL/CAPTCHA bypass) |
| Profile / onboarding | ✅ / ⚠️ |
| Assessments | ✅ web |
| Appointments | ❌ |
| Payments | ❌ |
| Messaging | ❌ without assignment |
| Results / history | ✅ |
| Packages | ✅ flag-gated |
| GDPR export/delete | ⚠️ / ❌ |

### Admin workflow
| Feature | Status |
|---------|--------|
| Dashboard / analytics | ⚠️ matview issues |
| Users | ✅ |
| Clinicians / certificates | ❌ |
| Approvals | ❌ UI |
| Assessments / packages | ✅ |
| Payments | ❌ |
| Exports | ⚠️ bugs |
| Research | ⚠️ bugs |
| Settings / flags / announcements | ✅ |
| KPI alerts | ❌ stub |

---

## Dead / Duplicate Code Notes

- `/api/notify-high-risk` redundant with server notify in submit.
- `lib/rate-limit/redis.ts` unused.
- Permission helper SQL unused by routes.
- Duplicate admin KPI surfaces.
- Patients list logic duplicated (page query vs `/api/clinician/patients`).

---

## Counts

| Severity | Count |
|----------|-------|
| Critical | 9 |
| High | 15 |
| Medium | 24 |
| Low | 12 |

**Total tracked issues: 60** (grouped; sub-findings exist in other reports)
