# Operator Runbook — V Welfare Platform v1.0.0

**Document status:** AUTHORITATIVE (Rank 2)  
**Purpose:** The **only** executable procedure from freeze → GA tag.  
**Delete / ignore duplicate deploy procedures** in superseded docs; link here instead.  
**Constants:** Version `1.0.0` · Tag `v1.0.0` · Alias `https://app.vwelfare.com` · Freeze SHA `6e219e62e9f74273595ef10e31220bb24d0945f7`

---

## Preconditions

- Read [`CANONICAL_RELEASE_STATE.md`](./CANONICAL_RELEASE_STATE.md).
- Decision is **CONDITIONAL GO** until this runbook completes.
- Engineering/SQL/migrations are **frozen** for this release window unless Governance Board reopens scope.
- Evidence: store artifacts under a dated folder named by the Release Manager (e.g. `release-evidence/v1.0.0/<YYYY-MM-DD>/`). Retention: minimum 1 year.

**Roles**

| Role | Responsibility |
|---|---|
| Release Manager | Owns runbook execution, evidence filing, tag cut |
| Security Lead | Owns §C live security suite + §D leaked-password |
| DevOps / Platform | Owns §A dry-run evidence, §B branch protection, §E alias confirm |
| Clinical/Compliance | Signs Checklist §8; BAA risk acceptance if GA proceeds with deferred vendor agreements |

---

## §A — Migration reconciliation evidence (Gate G1)

**Merge fact (already true on `main`):** PR #80 / commit `514ec7b`.  
**Still required:** operator dry-run artifact.

1. From an authorized operator workstation with Supabase CLI linked to project `wyzezyctpvlohuuhzyof`:
   - Run `supabase migration list` → Local/Remote aligned (0 unexpected drift).
   - Run `supabase db push --dry-run`.
2. **Pass criteria:** only the idempotent local-only `ipip120` (or equivalent documented idempotent leftover) may be pending; **zero prod-only gaps**.
3. Save command output as `G1-dry-run.txt`.
4. Mark Checklist §6 item 1 ✅ and Canonical Release State G1 dry-run ☐→✅.

**Stop/go:** If unexpected pending migrations appear → **STOP**. Open incident per governance; do not proceed to tag.

---

## §B — CI required status check (Gate G2)

**Merge fact (already true on `main`):** PR #83 / commit `935912d` (workflow present).  
**Still required:** branch-protection confirmation.

1. Repository Settings → Branches → rule for `main`.
2. Ensure the web CI workflow checks from PR #83 are **required** before merge.
3. Save screenshot or settings export as `G2-branch-protection.png` (or `.txt`).
4. Mark Checklist §6 item 2 ✅.

**Stop/go:** If required checks cannot be set → **STOP** (governance violation risk).

---

## §C — Live HTTP security suite (Gate G4)

1. Prepare **non-production-named** seeded accounts (or dedicated test tenants). Prefer staging/preview if available; if production must be used, use unique strong passwords, disable/delete after test, and record in evidence log. **Do not** use the well-known passwords from superseded Phase 7 docs.
2. Obtain session cookie for attacker patient B → `ATTACKER_COOKIE`.
3. From a network-permitted runner:
   ```bash
   BASE_URL=https://app.vwelfare.com ATTACKER_COOKIE='<patient-B-session>' npm run test:security
   ```
   (If validating a promoted preview first, substitute that URL, then repeat against the production alias after §E.)
4. **Pass criteria (minimum):** patient isolation, clinician isolation, private-notes protection, admin-RPC 401/403, **PDF-export non-owner 403/404**, AI checks not leaking PHI.
5. Save full output as `G4-test-security.log`.
6. Mark Checklist §6 item 4 ✅ and §2 live HTTP checkbox ✅.

**Stop/go:** Any PHI-isolation or export-authorization failure → **STOP**. Do not open to patients. Do not cut tag.

---

## §D — Leaked-password protection (Gate G5)

1. Supabase Dashboard → Authentication → Policies (or Auth settings) → enable **Leaked password protection**.
2. Spot-check register/reset with a known-breached password → expect rejection with clear user-facing error (EN/AR if applicable).
3. Record advisor/WARN review note as `G5-leaked-password.txt`.
4. Mark Checklist §6 item 5 ✅.

**Rollback:** toggle off (instant, no data impact) per Checklist §4.

---

## §E — Production alias confirmation (Gate G6)

1. Confirm deployment policy: only a **human-promoted** `main`-target build serves production (no preview/branch promote).
2. In Vercel → production deployment for `app.vwelfare.com`, read **commit SHA**.
3. Confirm SHA is the intended certified `main` commit (the commit that will be tagged, or the freeze SHA plus any Board-approved doc-only merges).
4. Save `G6-alias-sha.txt` containing: alias, deployment ID, commit SHA, UTC timestamp, operator name.
5. Mark Checklist §6 item 6 ✅.

**Stop/go:** SHA mismatch → **STOP**. Do not tag.

---

## §F — Sign-off, tag, release, state flip (Gates G7–G8)

1. Complete Checklist §8 with named humans (not blanks). All three roles required. Decision must be **GO** only if G1–G6 are ✅.
2. Cut annotated tag on the certified commit:
   ```bash
   git tag -a v1.0.0 -m "V Welfare Platform v1.0.0 — Production GA"
   git push origin v1.0.0
   ```
3. Publish GitHub Release for `v1.0.0` referencing:
   - `docs/RELEASE_CHECKLIST_v1.0.0.md`
   - `docs/release/CANONICAL_RELEASE_STATE.md`
   - this runbook
4. Update Canonical Release State:
   - Tag status → **CUT**
   - GA tag SHA → *(actual SHA)*
   - Decision → **GO**
   - Timeline T9/T10 → dated
5. Patient-open / traffic declaration is then permitted under Clinical/Compliance acknowledgment of deferred post-GA items.

---

## Rollback (single procedure)

**Application:** Vercel → Deployments → select last-known-good production deployment → **Promote to Production** (or `vercel rollback`). Confirm `app.vwelfare.com` SHA.  
**Database:** v1.0.0 app rollback requires **no** DB rollback (no new GA DDL in this release). Future migrations: forward-only inverse migration per Governance Policy.  
**Auth config:** leaked-password toggle off reverts instantly.

Detailed DR restore: `BACKUP_AND_DISASTER_RECOVERY.md` (RTO 4h / RPO \<1h). Incident handling: `INCIDENT_RESPONSE_RUNBOOK.md`.

---

## Explicitly out of scope here

- MFA enablement (post-GA; Hardening v1.1 plan)
- Email confirmation enablement (post-GA)
- Mobile SecureStore + anon-key rotation (mobile release track)
- Centralized admin audit trail (post-GA)
- BAA/DPA execution (tracked Remaining Administrative Actions — compliance may require risk acceptance before patient-open)
- Load-test execution at scale (Phase 6 procedures remain REFERENCE; schedule separately)

---

*All other deployment/verification checklists are SUPERSEDED. Link to this runbook only.*
