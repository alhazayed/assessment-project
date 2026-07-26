# V Welfare — FINAL PRODUCTION RELEASE PACKAGE v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-PKG-100` |
| **Document version** | `1.0.0` |
| **Document status** | `AUTHORITATIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Release Manager |
| **Custodian** | Senior DBA |
| **Approver** | Release Manager + Security Lead + Clinical / Compliance |
| **Document type** | Operator-grade maintenance-window runbook |
| **Release** | `v1.0.0` (first production GA) |
| **Platform** | V Welfare Mental Health Assessment Platform |
| **Production alias** | `https://app.vwelfare.com` |
| **Alternate host** | `https://vwelfare.vercel.app` |
| **Supabase project** | `wyzezyctpvlohuuhzyof` (vwelfare-platform) |
| **GitHub repo** | `alhazayed/assessment-project` |
| **Production branch** | `main` |
| **Postgres** | Supabase-managed PostgreSQL 17 |
| **App runtime** | Vercel (Next.js) |
| **DR objectives** | RTO **4 hours** · RPO **&lt; 1 hour** (`BACKUP_AND_DISASTER_RECOVERY.md`) |
| **Hierarchy** | Rank 2 — authoritative execution (`docs/release/00_DOCUMENT_CONTROL_INDEX.md`) |
| **Prerequisite reviews** | Architecture, ownership, dependency, and migration reviews are **CLOSED**. All findings below are **VERIFIED**. Do not re-investigate. |

**Audience:** Senior DBA + Release Manager + Security Lead executing the maintenance window.  
**Assumption:** Operator has CLI access to GitHub, Vercel, and Supabase (linked project), plus SQL Editor access on production.  
**Rule:** Execute steps in order. Stop at any failed Decision Gate. Do not skip verification queries.  
**Decision labels (only):** `GO LIVE` · `GO LIVE WITH CONDITIONS` · `NO GO`.

**Companion controlled documents (mandatory for GA evidence):**

| Doc ID | Path |
|---|---|
| `REL-DOC-INDEX` | `docs/release/00_DOCUMENT_CONTROL_INDEX.md` |
| `REL-RACI-100` | `docs/release/RACI_AND_APPROVAL_CHAIN_v1.0.0.md` |
| `REL-CAB-100` | `docs/release/CHANGE_ADVISORY_RECORD_v1.0.0.md` |
| `REL-FRZ-100` | `docs/release/RELEASE_FREEZE_CERTIFICATE_v1.0.0.md` |
| `REL-CFG-100` | `docs/release/CONFIGURATION_FREEZE_RECORD_v1.0.0.md` |
| `REL-ABT-100` | `docs/release/ABORT_MATRIX_v1.0.0.md` |
| `REL-EVD-100` | `docs/release/EVIDENCE_REGISTER_v1.0.0.md` |
| `REL-MWL-100` | `docs/release/MAINTENANCE_WINDOW_LOG_v1.0.0.md` |
| `REL-OPL-100` | `docs/release/OPERATOR_LOG_v1.0.0.md` |
| `REL-VAL-100` | `docs/release/PRODUCTION_VALIDATION_RECORD_v1.0.0.md` |
| `REL-RSK-100` | `docs/release/RISK_REGISTER_AND_RESIDUAL_ACCEPTANCE_v1.0.0.md` |
| `REL-EXC-100` | `docs/release/SECURITY_EXCEPTION_REGISTER_v1.0.0.md` |
| `REL-MON-100` | `docs/release/POST_RELEASE_MONITORING_v1.0.0.md` |
| `REL-CLS-100` | `docs/release/RELEASE_CLOSURE_REPORT_v1.0.0.md` |

---

## 1. Executive Summary

This package cuts and promotes **V Welfare v1.0.0** to the production alias during a controlled maintenance window.

**What ships**

- Application security controls already certified on `main` (PHI scrubbing before Gemini, forgot-password redirect allow-list, authorized PDF export, admin RPC lockdown, RLS-scoped clinician access).
- Database authorization model already live and fingerprint-certified (no unexpected DDL in this window unless Gate A dry-run shows only the accepted idempotent pending migration).
- Operational controls: leaked-password protection enablement, security-advisor ERROR = 0, live HTTP security suite, smoke tests, and formal sign-off.

**What does not ship in this window**

- MFA for admin/clinician (deferred post-GA).
- Email confirmation enablement (deferred pending SMTP/templates).
- Mobile SecureStore + anon-key rotation (separate mobile release).
- Centralized immutable admin audit trail (deferred).
- BAAs/DPAs finalization (tracked separately).

**Verified posture (do not re-audit)**

| Control | Verified baseline |
|---|---|
| Cross-patient PHI isolation | Pass (live RLS impersonation) |
| Clinician-without-consent | Fail-closed |
| Admin analytics RPCs (8) | `service_role` EXECUTE only |
| `has_clinician_access` body md5 | `06aedade9e809c61a3da2ee5a4764efc` |
| RLS fingerprint | clinical_notes **4** / messages **5** / assessment_assignments **3** / patient_profiles **4** / clinician_patient_relationships **3** |
| SECURITY DEFINER `search_path` | Pinned on all 12 public SECURITY DEFINER functions |
| Anon EXECUTE on `check_relationship_permission` / `get_my_role` | Revoked |
| Supabase security advisors | **0 ERROR** (WARN backlog accepted or toggled in-window) |
| Backups / PITR | Enabled (RTO 4h / RPO &lt;1h) |

**Release decision model**

- Proceed only if **all Decision Gates (Section 8)** pass.
- Final tag `v1.0.0` is cut **only after** Section 14 sign-off.
- Verdict target after successful window: **GO LIVE** (or **GO LIVE WITH CONDITIONS** only if a pre-accepted residual remains and is explicitly signed).

---

## 2. Preconditions

Complete **every** item before T0. If any item fails, **abort the window** and reschedule.

### 2.1 People and access

| Role | Required | Ready? |
|---|---|---|
| Release Manager (commander) | Owns go/no-go | ☐ |
| Senior DBA | Executes SQL + migration commands | ☐ |
| Security Lead | Advisors + security suite gate | ☐ |
| App/DevOps on-call | Vercel promote / rollback | ☐ |
| Clinical/Compliance (async OK) | Sign-off §14 | ☐ |

Access checklist:

- [ ] GitHub write access to `alhazayed/assessment-project` (`main` protected; CI required).
- [ ] Vercel project access for `assessment-project` (Production promote + rollback).
- [ ] Supabase project `wyzezyctpvlohuuhzyof` — Owner or sufficient roles for Auth settings, Backups, SQL Editor, Advisors.
- [ ] Local machine with: `git`, `node`/`npm`, `npx`, `curl`, `jq` (optional), Supabase CLI (`supabase`) linked to production, Vercel CLI (`vercel`) authenticated.
- [ ] Seeded test accounts available for smoke + security suite: Patient A, Patient B (attacker), Clinician (consented), Clinician (unrelated), Admin. Cookies/sessions obtainable for `ATTACKER_COOKIE`.

### 2.2 Environment variables (Production — Vercel)

Confirm in **Vercel → Project → Settings → Environment Variables → Production**:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | YES | Production project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | YES | Publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | YES | Server-only; never `NEXT_PUBLIC_` |
| `ADMIN_PIN` | YES | 6–8 digit numeric |
| `ADMIN_SESSION_SECRET` | YES | ≥32 chars |
| `NEXT_PUBLIC_SITE_URL` | YES | `https://app.vwelfare.com` |
| `GEMINI_API_KEY` | YES for AI features | Server-only |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Recommended | Fail-closed CAPTCHA in prod |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Error monitoring |
| Stripe keys | Only if payments live | Publishable + secret + webhook |

### 2.3 Code / CI preconditions

- [ ] Local checkout of `main` is clean and matches `origin/main`.
- [ ] Required GitHub status checks on `main` are green on the release commit (web CI gate: lint, typecheck, security-unit, build).
- [ ] No open P0/P1 incidents.
- [ ] Supabase status page: no active incident affecting Auth/DB (`https://status.supabase.com`).
- [ ] Vercel status page: no active incident (`https://www.vercel-status.com`).

### 2.4 Communication & governance preconditions

- [ ] Maintenance notice prepared (internal + optional status page).
- [ ] Rollback owner named and reachable for the full window (**rollback authority:** Release Manager accountable; DevOps executes — `REL-RACI-100`).
- [ ] Incident channel open (Slack/Teams) with Release Manager, DBA, Security, DevOps.
- [ ] **Change Advisory Record** approved: `docs/release/CHANGE_ADVISORY_RECORD_v1.0.0.md` (`REL-CAB-100`).
- [ ] **Configuration Freeze Record** started: `docs/release/CONFIGURATION_FREEZE_RECORD_v1.0.0.md` (`REL-CFG-100`).
- [ ] **Release Freeze Certificate** signed: `docs/release/RELEASE_FREEZE_CERTIFICATE_v1.0.0.md` (`REL-FRZ-100`) — all six attestations checked.
- [ ] **Evidence Register** / **Maintenance Window Log** / **Operator Log** opened for append-only use (`REL-EVD-100`, `REL-MWL-100`, `REL-OPL-100`).

---

## 3. Backup Requirements

**Mandatory before any production change.** Mental-health PHI — treat restore readiness as a hard gate.

### 3.1 Verify automated backups exist

**Why:** Confirm a recoverable snapshot exists before the window.

**Where:** Supabase Dashboard → Project `wyzezyctpvlohuuhzyof` → **Database → Backups**.

**Expected:**

- Latest backup status: **Success**
- Timestamp within the last 24 hours (daily full) and PITR window open
- PITR earliest recovery point ≥ 7 days ago (or configured retention)
- Backup size non-trivial (order of hundreds of MB+ depending on data volume)

**If different:**

- Status Failed / missing → **ABORT**. Do not proceed. Open incident with Supabase; reschedule window.
- PITR window shorter than policy → **ABORT** unless Security Lead explicitly accepts in writing for this window.

### 3.2 Record backup baseline (write into the run log)

Capture and paste into the release log:

```text
BACKUP_TIMESTAMP_UTC=
BACKUP_SIZE=
PITR_EARLIEST=
PITR_LATEST=now
POSTGRES_VERSION=
OPERATOR=
```

### 3.3 Optional logical dump (recommended for DBA belt-and-suspenders)

Run only if the operator has a secure vault for the dump (encrypted disk; never commit).

```bash
# WHY: Extra logical snapshot independent of dashboard UI, for forensic compare after rollback.
# PREREQ: DATABASE_URL is the production connection string from Supabase → Settings → Database.
# WARNING: Contains PHI. Store encrypted. Delete after successful post-window retention policy.

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --file="vwelfare_pre_v1.0.0_$(date -u +%Y%m%dT%H%M%SZ).dump"
```

**Expected output:** File created; exit code `0`; file size &gt; 0.

**If different:** Non-zero exit → fix credentials/network; retry once. If still failing, proceed **only** if Dashboard backups + PITR verified (Section 3.1) and Release Manager accepts; note the dump failure in the log.

### 3.4 Confirm restore path is known (no restore executed pre-window)

Document the restore path you will use if Gate fails after DDL (this release expects **no required DDL**; restore is last resort):

1. Supabase → Database → Backups → Restore / PITR to timestamp **before T0**.
2. Re-run Section 6 verification queries.
3. Redeploy last-known-good Vercel production deployment (Section 9).

**RTO / RPO (verified policy):** RTO 4 hours · RPO &lt; 1 hour.

### 3.5 Application rollback artifact

Identify and record the **current production deployment ID** (last-known-good) **before** promote:

```bash
# WHY: Instant Vercel rollback target if the new build misbehaves.
vercel ls --prod
```

**Expected:** Lists current Production deployment(s) with Ready status and commit SHA.

**If different:** Cannot identify LKG → **ABORT**. Do not promote blindly.

Record:

```text
LKG_DEPLOYMENT_ID=
LKG_COMMIT_SHA=
LKG_RECORDED_AT_UTC=
```

---

## 4. Maintenance Window Timeline

Times are relative to **T0** (start of change window). Adjust absolute clock with stakeholders; keep order and durations.

| Phase | Clock | Owner | Activity |
|---|---|---|---|
| **T−90m** | Pre-window | RM | CAB approved (`REL-CAB-100`) |
| **T−60m** | Pre-window | All | Preconditions §2 complete; backup §3 complete; sign Freeze Certificate + Configuration Freeze; open evidence/operator/window logs; freeze non-release merges to `main` |
| **T−30m** | Pre-window | Release Manager | Announce maintenance; confirm on-call present |
| **T−15m** | Gate A | DBA | Migration dry-run + migration list (§5.1–5.2) |
| **T−10m** | Gate B | DBA | Pre-change SQL fingerprint baseline (§6.1) |
| **T0** | Start | Release Manager | **GO / NO-GO** for execution |
| **T0–T+10m** | Auth config | Security | Enable leaked-password protection (§5.3) |
| **T+10–T+25m** | Deploy | DevOps | Confirm `main` green → Production alias serves release commit (§5.4–5.5) |
| **T+25–T+40m** | DB verify | DBA | Post-change SQL verification (§6.2–6.5) |
| **T+40–T+55m** | Advisors | Security | Security advisor validation (§11) |
| **T+55–T+85m** | Security suite | Security | Live `test:security` (§5.6) |
| **T+85–T+115m** | Smoke | QA/DevOps | Smoke checklist (§12) |
| **T+115–T+130m** | Accept | Release Manager | Acceptance criteria (§13) + Decision Gates (§8) + Validation Record (`REL-VAL-100`) |
| **T+130–T+145m** | Tag | Release Manager | Annotated tag `v1.0.0` + GitHub Release (§5.7) **only after §14** |
| **T+145m** | Close | All | Sign-off (§14); start Closure Report (`REL-CLS-100`); monitoring watch begins (`REL-MON-100`) |
| **T+24h / T+48h** | Watch | On-call | Post-release monitoring (§10.2 + `REL-MON-100`) |
| **≤48h** | Closure | RM | Release Closure Report signed; freeze ends |
| **≤10 business days** | Improve | RM | Lessons Learned (`FRM-LL-100`) |

**Planned downtime:** Prefer **zero** (Vercel promote is blue/green). If a DB restore is required, expect **20–45 minutes** unavailability — communicate explicitly.

**Hard stop:** If not green by **T+145m**, execute rollback (§9) unless Release Manager extends the window in writing.

---

## 5. Exact Commands

> Convention for every command block: **Why** · **Command** · **Expected** · **If different**.

### 5.1 Align local repo to production source of truth

```bash
# WHY: Ensure the operator is executing against the exact main tip that CI certified.
cd /path/to/assessment-project
git fetch origin main
git checkout main
git pull origin main
git rev-parse HEAD
git status
```

**Expected:**

- `git rev-parse HEAD` prints a 40-char SHA (record as `RELEASE_COMMIT`).
- `git status` → `working tree clean`, `Your branch is up to date with 'origin/main'`.

**If different:**

- Dirty tree → stash/discard only with owner approval; prefer a fresh clone.
- Behind/ahead unexpectedly → resolve before T0; do not deploy a divergent tip.

### 5.2 Migration alignment (dry-run) — Gate A

```bash
# WHY: Prove repo ↔ production migration histories are aligned before any promote.
# PREREQ: `supabase link` already done for project wyzezyctpvlohuuhzyof.

supabase migration list
```

**Expected:**

- Local and Remote columns aligned for applied versions.
- Per certified reconciliation: **0 production-only** versions missing from repo.
- At most **one** accepted local-only pending: idempotent `ipip120` (scoring bands) — if present, note it; do not invent other pendings.

**If different:**

- Any **prod-only** version missing from repo → **ABORT**. Open drift incident per `docs/PRODUCTION_GOVERNANCE_POLICY.md`. Do not `db push`.
- Unexpected pending migrations (not the accepted idempotent `ipip120`) → **ABORT**. Investigate offline; do not apply during window without a reviewed migration PR.

```bash
# WHY: Show exactly what would be applied without mutating production.
supabase db push --dry-run
```

**Expected:**

- Either: **no pending migrations**, or **only** the accepted idempotent `ipip120` migration listed.
- No destructive statements (DROP TABLE of PHI, policy wipes, etc.).

**If different:** Any unexpected SQL → **ABORT**. Do not run `supabase db push` without a new reviewed PR.

#### 5.2.1 Apply accepted pending migration ONLY if dry-run shows solely `ipip120`

```bash
# WHY: Bring remote schema_migrations in sync for the one accepted idempotent local-only migration.
# DO NOT RUN if dry-run was empty or showed anything else.

supabase db push
```

**Expected:** Apply succeeds; `supabase migration list` now shows Local/Remote aligned; exit 0.

**If different:** Non-zero exit / policy already exists errors → **STOP**. Do not retry blindly. Capture error text; prepare rollback decision with Release Manager (usually **no DB rollback** if apply failed cleanly with zero changes; if partial apply, treat as incident).

### 5.3 Enable leaked-password protection — Gate config

**Why:** Closes verified WARN `auth_leaked_password_protection` before GA.

**UI path (authoritative for this control):**

1. Supabase Dashboard → **Authentication** → **Providers / Attack Protection** (or **Auth → Settings** depending on dashboard revision).
2. Enable **Leaked password protection** (Have I Been Pwned check).
3. Save.

**Expected:** Toggle shows **Enabled**.

**If different:** Cannot enable → **NO-GO for unconditional GA**. Either fix Auth permissions and retry, or Release Manager records **CONDITIONAL GO** with explicit acceptance (not preferred).

**Rollback of this toggle:** Disable the same toggle (instant; no data impact).

### 5.4 Confirm CI green on RELEASE_COMMIT

```bash
# WHY: Never promote a commit that failed the required web CI gate.
gh run list --branch main --limit 5
gh run view --commit "$(git rev-parse HEAD)"
```

**Expected:** Latest workflow for `RELEASE_COMMIT` shows **success** for lint, typecheck, security-unit, build.

**If different:** Failures → **ABORT promote**. Fix on a PR; do not hotfix production from the window.

### 5.5 Production deploy / alias confirmation — Gate deploy

Prefer **Vercel auto-deploy of `main`** already Ready; then confirm alias. If Production is not yet on `RELEASE_COMMIT`:

```bash
# WHY: Deploy the certified main tip to Production (human-controlled promote).
vercel --prod --yes
```

**Expected:** Build succeeds; deployment **Ready**; URL printed.

**If different:** Build fail → do not alias; fix forward or abort. Partial Ready with errors in logs → treat as failed deploy.

```bash
# WHY: Confirm the production hostname serves the release commit.
curl -sI "https://app.vwelfare.com" | head -n 20
# Also confirm in Vercel UI: Production Deployment commit SHA == RELEASE_COMMIT
```

**Expected:**

- HTTP `200` (or documented redirect to localized landing) over HTTPS.
- Security headers present (see §10.1).
- Vercel UI: Production deployment commit = `RELEASE_COMMIT`.

**If different:**

- Alias on wrong commit → **Promote correct deployment** or rollback to LKG (§9). Do not continue security suite against the wrong build.
- TLS/5xx → rollback (§9).

### 5.6 Live HTTP security suite — Gate security

```bash
# WHY: Prove runtime PHI isolation + PDF export authorization on the live production build.
# PREREQ: Network-permitted runner; seeded Patient B session cookie in ATTACKER_COOKIE.

export BASE_URL="https://app.vwelfare.com"
export ATTACKER_COOKIE="<patient-B-session-cookie>"
npm ci
npm run test:security
```

**Expected (minimum):**

- Patient isolation assertions pass.
- Clinician isolation assertions pass.
- Private-notes protection passes.
- Admin RPC unauth → 401/403.
- PDF export non-owner → **403 or 404** (never 200 with another user's PHI).
- Exit code `0`.

**If different:**

- Any PHI-isolation or export-authorization failure → **ROLLBACK application immediately (§9)**. **Do not open to patients.**
- `fetch failed` / network errors → fix runner network; re-run. Do not interpret infra errors as security pass.
- Missing cookie → obtain seeded session; re-run. Do not skip.

Offline unit suite (may run anytime; does not replace live suite):

```bash
# WHY: Confirm offline security contracts still green on RELEASE_COMMIT.
npm run test:security:unit
```

**Expected:** All unit tests pass (certified baseline: 60/60 offline security suites).

**If different:** Failures on `main` tip → **ABORT**; do not tag.

### 5.7 Cut annotated release tag (ONLY after Gates + §14)

```bash
# WHY: Immutable release marker for GA; must match the deployed production commit.
git tag -a v1.0.0 "$(git rev-parse HEAD)" -m "V Welfare v1.0.0 GA — production release"
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes-file docs/RELEASE_CHECKLIST_v1.0.0.md
```

**Expected:** Tag on `RELEASE_COMMIT`; GitHub Release published.

**If different:** Tag on wrong SHA → delete remote tag only with dual approval, retag correct SHA; never move a published GA tag silently.

---

## 6. SQL Verification Queries

Run in **Supabase SQL Editor** against production (read-only). Paste outputs into the release log.

### 6.1 Pre-change baseline fingerprint (T−10m)

```sql
-- WHY: Capture authorization fingerprint before any window change.
-- EXPECTED: Matches certified baseline counts and md5 below.

-- A) has_clinician_access body fingerprint
SELECT md5(pg_get_functiondef('public.has_clinician_access(uuid,uuid,text)'::regprocedure)) AS has_clinician_access_md5;
-- EXPECTED: 06aedade9e809c61a3da2ee5a4764efc
```

**If different:** md5 mismatch → **ABORT**. Authorization drift from certified baseline. Do not deploy until explained and re-certified.

```sql
-- B) RLS policy counts on PHI fingerprint tables
SELECT c.relname AS table_name, COUNT(p.polname) AS policy_count
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'clinical_notes',
    'messages',
    'assessment_assignments',
    'patient_profiles',
    'clinician_patient_relationships'
  )
GROUP BY c.relname
ORDER BY c.relname;
```

**Expected:**

| table_name | policy_count |
|---|---:|
| assessment_assignments | 3 |
| clinical_notes | 4 |
| clinician_patient_relationships | 3 |
| messages | 5 |
| patient_profiles | 4 |

**If different:** Count drift → **ABORT**. Reconcile with certified policy names before proceed.

```sql
-- C) Named policy fingerprint (must match certified set)
SELECT c.relname AS table_name, p.polname
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'clinical_notes',
    'messages',
    'assessment_assignments',
    'patient_profiles',
    'clinician_patient_relationships'
  )
ORDER BY c.relname, p.polname;
```

**Expected names (exact):**

- `clinical_notes`: `clinician_own_notes`, `notes_admin_all`, `notes_patient_read_nonprivate`, `superadmin_can_delete_any_clinical_note`
- `messages`: `messages_insert`, `messages_read`, `messages_update`, `msg_admin_read`, `superadmin_can_delete_any_message`
- `assessment_assignments`: `assign_admin_write`, `assign_clinician_own_patients`, `assign_read`
- `patient_profiles`: `patient_prof_own`, `patient_prof_clinician`, `patient_prof_admin_write`, `superadmin_can_delete_any_patient_profile`
- `clinician_patient_relationships`: `cpr_clinician_insert`, `cpr_parties_read`, `cpr_patient_update`

**If different:** Missing/extra names → **ABORT**.

### 6.2 Admin RPC EXECUTE grants (post-deploy)

```sql
-- WHY: Prove analytics RPCs remain service_role-only (no anon/authenticated EXECUTE).
SELECT p.proname AS function_name,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_admin_dashboard_stats',
    'get_top_assessments',
    'get_high_risk_patients',
    'get_user_engagement_metrics',
    'get_assessment_completion_funnel',
    'get_demographics_breakdown',
    'get_assessment_performance_comparison',
    'get_patient_risk_profile'
  )
ORDER BY p.proname;
```

**Expected:** For all 8 rows: `anon_exec = false`, `authenticated_exec = false`, `service_role_exec = true`.

**If different:** Any `true` for anon/authenticated → **CRITICAL**. Revoke immediately with reviewed SQL / migration; consider rollback of any related change; do not open to patients.

### 6.3 Anon lockout on authorization helpers

```sql
-- WHY: Confirm authorization-oracle hardening remains in force.
SELECT 'check_relationship_permission' AS fn,
       has_function_privilege('anon', 'public.check_relationship_permission(uuid,uuid,text)', 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', 'public.check_relationship_permission(uuid,uuid,text)', 'EXECUTE') AS authenticated_exec,
       has_function_privilege('service_role', 'public.check_relationship_permission(uuid,uuid,text)', 'EXECUTE') AS service_role_exec
UNION ALL
SELECT 'get_my_role',
       has_function_privilege('anon', 'public.get_my_role()', 'EXECUTE'),
       has_function_privilege('authenticated', 'public.get_my_role()', 'EXECUTE'),
       has_function_privilege('service_role', 'public.get_my_role()', 'EXECUTE')
UNION ALL
SELECT 'has_clinician_access',
       has_function_privilege('anon', 'public.has_clinician_access(uuid,uuid,text)', 'EXECUTE'),
       has_function_privilege('authenticated', 'public.has_clinician_access(uuid,uuid,text)', 'EXECUTE'),
       has_function_privilege('service_role', 'public.has_clinician_access(uuid,uuid,text)', 'EXECUTE');
```

**Expected:**

| fn | anon_exec | authenticated_exec | service_role_exec |
|---|---|---|---|
| check_relationship_permission | false | true | true |
| get_my_role | false | true | true |
| has_clinician_access | false | true | true (or false if never granted — authenticated must be true) |

**If different:** anon `true` → re-apply grants from migration `20260719081042_security_revoke_anon_rpc_execute.sql` via **governance-compliant** path (reviewed migration / emergency procedure with same-day backfill). authenticated `false` on helpers → **STOP** (app authz broken).

### 6.4 SECURITY DEFINER search_path pin check

```sql
-- WHY: Prevent search_path injection on privileged functions.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       pg_get_functiondef(p.oid) LIKE '%SET search_path%' AS has_search_path_pin
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;
```

**Expected:** Every public SECURITY DEFINER function shows `has_search_path_pin = true` (certified: 12 functions).

**If different:** Any `false` → **NO-GO**. Schedule hardening migration; do not tag GA.

### 6.5 Migration history sanity

```sql
-- WHY: Confirm applied migration tip; detect unexpected new versions.
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 15;
```

**Expected:** Tip matches reconciled repo history; no unknown versions applied during the window except the accepted `ipip120` if pushed in §5.2.1.

**If different:** Unknown version → treat as drift incident; freeze further changes.

### 6.6 RLS enabled on fingerprint tables

```sql
-- WHY: Fail closed — RLS must remain enabled on PHI tables.
SELECT c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'clinical_notes',
    'messages',
    'assessment_assignments',
    'patient_profiles',
    'clinician_patient_relationships',
    'assessment_submissions',
    'assessment_responses'
  )
ORDER BY c.relname;
```

**Expected:** `rls_enabled = true` for all listed tables.

**If different:** Any `false` → **CRITICAL STOP** + rollback/incident.

---

## 7. Expected Outputs

| Check | Pass criteria (copy into log) |
|---|---|
| `git rev-parse HEAD` | Equals Vercel Production commit SHA |
| `supabase migration list` | 0 prod-only drift; Local/Remote aligned after optional `ipip120` |
| `supabase db push --dry-run` | Empty **or** only accepted `ipip120` |
| `has_clinician_access` md5 | `06aedade9e809c61a3da2ee5a4764efc` |
| RLS counts | 4 / 5 / 3 / 4 / 3 (notes/messages/assignments/profiles/cpr) |
| Admin RPC grants | 8 × service_role only |
| Anon helpers | anon EXECUTE false on `check_relationship_permission`, `get_my_role` |
| Advisors security | **0 ERROR** |
| Leaked-password | **Enabled** |
| `curl -sI https://app.vwelfare.com` | HTTPS; HSTS; `X-Frame-Options: DENY`; nosniff |
| `/api/health` | JSON status ok; DB check ok |
| `npm run test:security` | Exit 0; PDF non-owner not 200-with-PHI |
| Smoke §12 | All P0 rows checked |
| Tag | `v1.0.0` → `RELEASE_COMMIT` |

---

## 8. Decision Gates

Execute in order. **Any FAIL = stop and follow the action.**  
**Normative abort/rollback detail:** `docs/release/ABORT_MATRIX_v1.0.0.md` (`REL-ABT-100`) — this table and the Abort Matrix must not disagree; if they ever do, **Abort Matrix wins** for action selection, then amend this package.

| Gate | Question | Pass | Fail action |
|---|---|---|---|
| **G0** | Backups + LKG deployment recorded (§3)? CAB + Freeze signed? | Yes | **ABORT** window |
| **G1** | Migration dry-run acceptable (§5.2)? | Yes | **ABORT**; drift incident |
| **G2** | Pre-change SQL fingerprint matches baseline (§6.1)? | Yes | **ABORT**; re-certify |
| **G3** | Leaked-password protection enabled (§5.3)? | Yes | **NO GO** or `GO LIVE WITH CONDITIONS` only with signed `REL-EXC-100` |
| **G4** | CI green on `RELEASE_COMMIT` (§5.4)? | Yes | **ABORT** promote |
| **G5** | Production alias serves `RELEASE_COMMIT` (§5.5)? | Yes | Fix alias / **ROLLBACK** |
| **G6** | Post-change SQL grants + RLS (§6.2–6.6) pass? | Yes | **ROLLBACK** app; DB incident if grants wrong |
| **G7** | Security advisors 0 ERROR (§11)? | Yes | **HOLD** then **ABORT/ROLLBACK** |
| **G8** | Live `test:security` exit 0 (§5.6)? | Yes | **Immediate app ROLLBACK**; do not open to patients |
| **G9** | Smoke P0 checklist complete (§12)? | Yes | **ROLLBACK** or **HOLD** per Abort Matrix (no undocumented hotfix) |
| **G10** | Acceptance criteria (§13) all true? Validation Record signed? | Yes | Do not tag |
| **G11** | Sign-off block (§14) signed `GO LIVE` or `GO LIVE WITH CONDITIONS`? | Yes | Do not publish `v1.0.0` |

**Release Manager GO phrase (only if G0–G11 pass):**  
`GO LIVE — promote complete; tag v1.0.0 authorized.`  
(or `GO LIVE WITH CONDITIONS — …` with `REL-RSK-100` / `REL-EXC-100` attached)

**NO-GO phrase:**  
`NO GO — execute Section 9 Rollback / Abort Matrix; do not tag.`

---

## 9. Rollback Procedure

### 9.1 Application rollback (primary — expected path if Gate fails)

**When:** Live security suite fails, smoke P0 fails, health red, or wrong commit on alias.  
**DB note:** This GA window expects **no required destructive DDL**. App rollback does **not** require DB restore.

```bash
# WHY: Instantly restore last-known-good production traffic.
# Replace with LKG_DEPLOYMENT_ID recorded in §3.5.

vercel rollback "$LKG_DEPLOYMENT_ID" --yes
```

**Alternative (UI):** Vercel → Project → Deployments → select LKG Production deployment → **Promote to Production**.

**Expected:** Alias `app.vwelfare.com` serves `LKG_COMMIT_SHA` within minutes; `/api/health` ok.

**If different:** Rollback command fails → use UI promote; if both fail, escalate Vercel support + route traffic only after health restored.

```bash
# WHY: Confirm rollback took effect.
curl -sI "https://app.vwelfare.com" | head -n 20
# Verify commit SHA in Vercel Production UI == LKG_COMMIT_SHA
```

### 9.2 Auth config rollback

**When:** Leaked-password enablement causes unexpected Auth lockouts (unlikely).

**Action:** Supabase Auth → disable **Leaked password protection**.

**Expected:** Toggle off; login flows recover for affected edge cases.

### 9.3 Migration rollback (only if §5.2.1 applied and caused failure)

**Rule (governance):** Never edit applied migration history. Apply a new forward inverse migration, or restore from backup if corruption.

1. If apply failed with **zero** schema change → no DB action; fix forward.
2. If apply succeeded but breaks scoring → deploy inverse migration via reviewed PR (not dashboard SQL), or PITR to pre-`T0` with Release Manager approval.
3. Re-run §6 fingerprints after any DB action.

### 9.4 Full database restore (last resort — P1 data corruption only)

1. Freeze writes / consider disabling Production deploy.
2. Supabase → Database → Backups → Restore / PITR to timestamp **before T0** (use §3.2 values).
3. Wait for restore completion (typically 20–45 minutes).
4. Re-run §6 verification queries + §11 advisors.
5. Ensure app points at restored project; run §10 + §12.
6. Open incident record; same-day governance backfill if any emergency SQL was used.

### 9.5 Rollback communication

- Announce: severity, user impact, ETA, next update time.
- Update status page if public users affected.
- After restore: postmortem within 24h per incident runbook.

---

## 10. Post-Deployment Validation

### 10.1 Immediate (0–15 minutes)

```bash
# WHY: Prove edge + app respond on the production alias.
curl -sS -o /tmp/vw_health.json -w "%{http_code}" "https://app.vwelfare.com/api/health"
echo
cat /tmp/vw_health.json
```

**Expected:** HTTP `200`; JSON includes overall healthy/ok status and database check ok (field names may be `status`, `checks.database`).

**If different:** Non-200 / DB not ok → investigate env vars + Supabase; rollback if not recovered in 10 minutes.

```bash
# WHY: Confirm security headers still emitted on production responses.
curl -sI "https://app.vwelfare.com" | tr -d '\r' | grep -iE 'strict-transport|x-frame|x-content-type|referrer-policy|content-security-policy|permissions-policy'
```

**Expected (presence):**

- `strict-transport-security` with long max-age (preload acceptable)
- `x-frame-options: DENY` (or equivalent CSP frame-ancestors deny)
- `x-content-type-options: nosniff`
- `referrer-policy` set
- `content-security-policy` present (nonce-based)
- `permissions-policy` present

**If different:** Missing HSTS/CSP/XFO → **Security Lead NO-GO** until fixed or rolled back.

### 10.2 Extended watch (first 24 hours)

| Metric | Pass |
|---|---|
| Uptime | ≥ 99.9% |
| Organic runtime errors (Sentry/Vercel) | 0 Critical unexplained |
| API latency (p95 interactive) | Acceptable (&lt;500ms target for key APIs) |
| Auth login/register/reset | Functional |
| Assessment submit + score | Functional |
| PDF export | Owner succeeds; non-owner denied |
| Admin dashboard | Loads; no grant regressions |
| Backup job | Next scheduled backup Success |

---

## 11. Security Advisor Validation

### 11.1 Run advisors (Dashboard)

**Why:** Confirm no ERROR-level misconfigurations after the window.

**Path:** Supabase Dashboard → **Advisors** → **Security** (also review Performance separately; Performance WARNs are non-blocking).

**Expected:**

- Security **ERROR count = 0**
- Leaked-password WARN **gone** after §5.3
- Remaining WARNs only from the accepted backlog (document any leftover)

**If different:** Any new ERROR → **block GA**; remediate or rollback the change that introduced it.

### 11.2 MCP / API equivalent (if operator uses Supabase MCP)

Use the project’s `get_advisors` security report for `wyzezyctpvlohuuhzyof`.

**Expected:** Identical to Dashboard — **0 ERROR**.

**If different:** Trust the stricter result; investigate discrepancies before sign-off.

### 11.3 Advisor acceptance log template

```text
ADVISOR_RUN_AT_UTC=
SECURITY_ERROR_COUNT=0
SECURITY_WARN_COUNT=
WARN_NOTES=
OPERATOR=
SECURITY_LEAD_INITIALS=
```

---

## 12. Smoke Test Checklist

Mark each row. **P0 failures block GA.**

### 12.1 Unauthenticated / guest (P0)

| # | Step | Expected | ☐ |
|---|---|---|---|
| S1 | Open `https://app.vwelfare.com` | Landing loads; no console crash | ☐ |
| S2 | Language switch EN ↔ AR | Copy swaps; RTL layout correct for AR | ☐ |
| S3 | Navigate to login/register | Forms render; Turnstile if configured | ☐ |
| S4 | `GET /api/health` | 200 + healthy | ☐ |

### 12.2 Patient (P0)

| # | Step | Expected | ☐ |
|---|---|---|---|
| S5 | Register or login patient | Session established | ☐ |
| S6 | Start assessment; answer; refresh mid-flow | Progress retained or clean resume per product behavior | ☐ |
| S7 | Submit assessment | Score/interpretation shown; no client-injected score trust | ☐ |
| S8 | Open results history | Own results only | ☐ |
| S9 | Export PDF for **own** submission | 200 PDF download | ☐ |
| S10 | Attempt PDF for **another** submission id | 403/404; no PHI body | ☐ |
| S11 | Logout | Session cleared; protected routes redirect | ☐ |

### 12.3 Clinician (P0)

| # | Step | Expected | ☐ |
|---|---|---|---|
| S12 | Login consented clinician | Patient list shows consented patients only | ☐ |
| S13 | View consented patient results | Allowed per permissions | ☐ |
| S14 | Unrelated clinician → patient PHI URL/API | Denied | ☐ |

### 12.4 Admin (P0)

| # | Step | Expected | ☐ |
|---|---|---|---|
| S15 | Admin login | Session cookie set; invalid PIN locked/rate-limited | ☐ |
| S16 | Dashboard overview/analytics | Loads; no 500 | ☐ |
| S17 | Unauthenticated `GET /api/admin/*` | 401/403 | ☐ |

### 12.5 AI / security regressions (P0)

| # | Step | Expected | ☐ |
|---|---|---|---|
| S18 | AI chat / clinical notes draft with sample identifiers | Request succeeds or controlled error; **no raw PHI forwarded** (scrubbed path) | ☐ |
| S19 | Forgot-password with foreign `redirectTo` | Rejected / sanitized to allow-listed reset URL | ☐ |

### 12.6 Mobile web (P1 — strongly recommended same window)

| # | Step | Expected | ☐ |
|---|---|---|---|
| S20 | iPhone Safari critical path | Usable; no horizontal overflow on public+authed shells | ☐ |
| S21 | Android Chrome critical path | Same | ☐ |

---

## 13. Release Acceptance Criteria

All must be **TRUE** before tag:

1. G0–G11 Decision Gates passed (or explicitly waived in §14 with severity ≤ accepted residual).
2. Production alias `app.vwelfare.com` serves `RELEASE_COMMIT`.
3. SQL fingerprints match Section 6 baselines.
4. Security advisors: **0 ERROR**; leaked-password **Enabled**.
5. `npm run test:security` against production **exit 0**.
6. Smoke P0 checklist (§12.1–12.5) complete with no open P0 defects.
7. No Critical/High severity incidents open.
8. Backup baseline recorded; LKG rollback path verified.
9. Monitoring (Sentry/Vercel) receiving events; no unexplained Critical spike post-deploy.
10. Release Manager + Security Lead (+ Clinical/Compliance) signed §14.

**Acceptance statement (paste when true):**

> V Welfare v1.0.0 meets production acceptance criteria on commit `RELEASE_COMMIT` at `app.vwelfare.com`. Authorization fingerprints unchanged from certified baseline. Live security suite green. Advisors 0 ERROR. Approved to tag and open to users.

---

## 14. Production Sign-off Checklist

### 14.1 Operator completion checklist

- [ ] CAB approved (`REL-CAB-100`)
- [ ] Release Freeze Certificate signed (`REL-FRZ-100`)
- [ ] Configuration Freeze Record completed (`REL-CFG-100`)
- [ ] §2 Preconditions complete
- [ ] §3 Backups + LKG recorded
- [ ] §5 Commands executed with outputs archived in Operator Log (`REL-OPL-100`)
- [ ] §6 SQL verification outputs archived
- [ ] §8 All gates Pass (Abort Matrix consulted on any fail)
- [ ] §9 Rollback path dry-reviewed (commands ready)
- [ ] §10 Immediate validation Pass
- [ ] §11 Advisors Pass
- [ ] §12 Smoke P0 Pass
- [ ] §13 Acceptance criteria true
- [ ] Production Validation Record signed (`REL-VAL-100`)
- [ ] Evidence Register complete (`REL-EVD-100`)
- [ ] Residual risks / exceptions filed if needed (`REL-RSK-100`, `REL-EXC-100`)
- [ ] Tag `v1.0.0` pushed (only after signatures below)
- [ ] Stakeholders notified of final decision
- [ ] Post-release monitoring started (`REL-MON-100`)
- [ ] Release Closure Report scheduled (`REL-CLS-100`, ≤48h)

### 14.2 Formal signatures

| Role | Name | Decision (`GO LIVE` / `GO LIVE WITH CONDITIONS` / `NO GO`) | Conditions (if any) | Date (UTC) | Signature |
|---|---|---|---|---|---|
| Release Manager | | | | | |
| Senior DBA | | | | | |
| Security Lead | | | | | |
| Clinical / Compliance | | | | | |

### 14.3 Final decision (exactly one)

Record the window outcome:

- ☐ **GO LIVE** — all gates green; tag published; users may use production.
- ☐ **GO LIVE WITH CONDITIONS** — list conditions in `REL-RSK-100` / `REL-EXC-100`; Security Lead + Clinical/Compliance must countersign.
- ☐ **NO GO** — abort/rollback executed or never promoted; tag **not** published. *(Equivalent phrase: DO NOT GO LIVE.)*

**Conditions (only if CONDITIONAL):** record in `REL-RSK-100` / `REL-EXC-100` (do not invent a third list).

### 14.4 Evidence archive

Complete `REL-EVD-100`. Store binaries in the secure evidence vault (no raw PHI):

- [ ] Pre/post SQL query outputs
- [ ] `supabase migration list` + dry-run transcripts
- [ ] Vercel deployment URLs + SHAs (LKG + release)
- [ ] Advisor screenshots/exports
- [ ] `test:security` console log
- [ ] Smoke checklist marked copy
- [ ] This document signed (PDF or scanned §14.2)
- [ ] Maintenance Window Log + Operator Log
- [ ] Freeze + Configuration Freeze + CAB records

### 14.5 Release closure

Within 48 hours: complete and sign `docs/release/RELEASE_CLOSURE_REPORT_v1.0.0.md`.  
Within 10 business days: complete `docs/release/LESSONS_LEARNED_TEMPLATE.md`.  
Freeze ends when Closure Report is **CLOSED** unless RM extends for an open incident.

---

## Appendix A — Quick reference identifiers

| Item | Value |
|---|---|
| Supabase project ref | `wyzezyctpvlohuuhzyof` |
| Production URL | `https://app.vwelfare.com` |
| Document control index | `docs/release/00_DOCUMENT_CONTROL_INDEX.md` |
| Governance policy | `docs/PRODUCTION_GOVERNANCE_POLICY.md` |
| Release checklist | `docs/RELEASE_CHECKLIST_v1.0.0.md` |
| Abort Matrix | `docs/release/ABORT_MATRIX_v1.0.0.md` |
| Incident runbook | `INCIDENT_RESPONSE_RUNBOOK.md` |
| DR / backups (authoritative) | `BACKUP_AND_DISASTER_RECOVERY.md` |
| `has_clinician_access` md5 | `06aedade9e809c61a3da2ee5a4764efc` |
| Anon revoke migration | `supabase/migrations/20260719081042_security_revoke_anon_rpc_execute.sql` |

## Appendix B — Emergency contacts (fill before T0)

| Role | Name | Phone | Channel |
|---|---|---|---|
| Release Manager | | | |
| Senior DBA | | | |
| Security Lead | | | |
| Vercel/Supabase escalation | | | |

## Appendix C — Run log header (copy per window)

```text
RELEASE=v1.0.0
WINDOW_START_UTC=
WINDOW_END_UTC=
RELEASE_COMMIT=
LKG_DEPLOYMENT_ID=
LKG_COMMIT_SHA=
BACKUP_TIMESTAMP_UTC=
DB_PUSH_APPLIED=none|ipip120
LEAKED_PASSWORD=enabled
TEST_SECURITY=pass|fail
ADVISORS_ERROR_COUNT=
FINAL_DECISION=
COMMANDER=
```

---

*End of Production Release Package v1.0.0. Execute in order. Stop on failed gates. Do not improvise DDL.*
