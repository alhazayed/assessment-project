# V Welfare — Final Release Package Integrity Review

**Date:** 2026-07-26  
**Scope:** Documentation-only review of the final release package  
**Out of scope:** Code, SQL, GitHub runtime checks, Supabase live verification  
**Authoritative package anchors:** `docs/RELEASE_CHECKLIST_v1.0.0.md`, `docs/PRODUCTION_GOVERNANCE_POLICY.md`, plus the certification / ops docs they incorporate by reference

**Verdict on package integrity:** The package is **not internally consistent**. An operator cannot execute a single unambiguous go-live path without resolving contradictory verdicts, stale gate checkboxes, and missing named operator steps.

---

## 1. Contradictions

### 1.1 Launch verdict conflict (blocker for operators)

| Document | Date | Stated decision |
|---|---|---|
| `docs/RELEASE_CHECKLIST_v1.0.0.md` | 2026-07-19 | ⚠️ CONDITIONAL GO — tag only after §6 fully green |
| `RELEASE_CANDIDATE_SECURITY_CERTIFICATION.md` | 2026-07-18 | ⚠️ CONDITIONAL GO |
| `PRODUCTION_RELEASE_REPORT.md` | 2026-07-18 | ✅ GO (merge + one live check) |
| `FINAL_CERTIFICATION.md` | 2026-07-10 | 🟡 CERTIFIED WITH MINOR CONDITIONS |
| `GO_LIVE_CERTIFICATION_2026_07_01.md` | 2026-07-01 | 🟡 GO LIVE WITH CONDITIONS |
| `FINAL_GO_LIVE_CERTIFICATION_REPORT_2026_06_30.md` | 2026-06-30 | ✅ CERTIFIED FOR PUBLIC PRODUCTION |
| `FINAL_GO_LIVE_AUDIT_REPORT_2026_06_30.md` | 2026-06-30 | ✅ GO LIVE |
| `ENVIRONMENT_VERIFICATION_AND_CHECKLIST.md` | 2026-06-30 | ✅ AUTHORIZED / READY |
| `OPERATIONAL_HARDENING_COMPLETION_SUMMARY.txt` | 2026-06-30 | ✅ CERTIFIED FOR PUBLIC PRODUCTION |
| `RELEASE_NOTES.md` | 2026-06-30 | ✅ Production Ready / **Released** |

**Gap:** No document declares which prior certifications are superseded. Operators have both “authorized for immediate public production” and “do not cut `v1.0.0` until seven open gates close.”

### 1.2 Tag / release-state conflict

- `RELEASE_NOTES.md` and `DEPLOYMENT_VERIFICATION.md` treat `v1.0.0` as already cut/released (commits `f4fa238` vs `649cef6` — also inconsistent with each other).
- Authoritative checklist says the annotated `v1.0.0` tag is cut **only after** §6 gates 1–7 are ✅ and §8 is signed — and those boxes are still ☐.

### 1.3 Stale release-gate checkboxes vs package history

Checklist §6 still shows open:

1. ☐ Migration reconciliation merged (PR #80)  
2. ☐ Web CI gate merged (PR #83)  
3. ☐ Governance policy merged (PR #81)  

Those PRs are already present on `main` as docs/commits in this package history (`#80`, `#81`, `#83`, then checklist `#84`). The authoritative gate board therefore disagrees with the package’s own merge narrative. Operators cannot tell whether to re-run those steps or mark them done.

### 1.4 Governance policy status vs merge gate

- `docs/PRODUCTION_GOVERNANCE_POLICY.md` header: **Status: Proposed (v1.0)**  
- Checklist treats merge of PR #81 as a hard GA gate  
- Policy text reads as adopted process (“non-negotiable”) while remaining labeled Proposed  

**Gap:** No Adopted / Effective date, no signatory, no “supersedes Proposed” line.

### 1.5 Capability claims vs deferred risks

| Claim | Source | Contradicted by |
|---|---|---|
| “MFA support” | `RELEASE_NOTES.md` | Checklist §3: MFA **not implemented**, deferred post-GA |
| “Complete audit trail of all system actions” | `RELEASE_NOTES.md` | Checklist §3 + Governance §6: no centralized immutable admin audit trail; only failed admin login today |
| “Email confirmation links working” / registration confirmation verified | Final cert + Email infra docs | Checklist §3 + Hardening plan: `enable_confirmations = false`; confirmation deferred |
| “Incident-response runbook” deferred post-GA | Checklist §7 | Final cert / Ops summary: Phase 8 IR runbook ✅ COMPLETE (`INCIDENT_RESPONSE_RUNBOOK.md` exists) |
| Appointments / notifications as shipped features | `RELEASE_NOTES.md` | `GO_LIVE_CERTIFICATION_2026_07_01.md`: appointments (and related systems) **absent / uncertifiable** |

### 1.6 Disaster-recovery objectives conflict

| Source | RTO | RPO | PITR posture |
|---|---|---|---|
| `docs/DISASTER_RECOVERY.md` | **8 hours** | **4 hours** | PITR may require Team plan; “Action required: Confirm…” |
| `BACKUP_AND_DISASTER_RECOVERY.md` | **4 hours** | **\<1 hour** | PITR 7 days claimed |
| `RELEASE_NOTES.md` / Final cert | **4 hours** | **\<1 hour** | PITR enabled |
| Checklist §5 recovery | Restore from automated backup / PITR “if enabled” | — | Ambiguous |

Operators do not have one binding RTO/RPO or a single PITR confirmation step.

### 1.7 Deploy / merge policy conflict

| Topic | Governance policy | Other package docs |
|---|---|---|
| Production promote | Deliberate human action; **no auto-promote** of unreviewed builds | `PRODUCTION_RELEASE_REPORT.md`: “Vercel **auto-deploys**”; `DEPLOYMENT_ACTION_PLAN.md` / notes imply automatic production deploy on merge |
| Merge style | **Squash-merge** | `PRODUCTION_RELEASE_REPORT.md`: **fast-forward** merge |

### 1.8 Anon-oracle / leaked-password residual conflict

- Checklist §1 (Verified): “Anonymous authorization oracle **Closed**”  
- Same checklist §3/§6: leaked-password still ☐ to enable before GA  
- `RELEASE_CANDIDATE_SECURITY_CERTIFICATION.md` §7 and `PRODUCTION_RELEASE_REPORT.md` deferred list still require **revoke anon EXECUTE** on `check_relationship_permission`  

Package does not reconcile whether the oracle item is closed, still open, or closed only for a subset of functions.

### 1.9 “Procedures complete” vs “execution complete”

Final certification and ops summary mark Phase 6 (load) and Phase 7 (live E2E) **COMPLETE / CERTIFIED**, while those same docs admit the suites are “ready for execution” / post-launch checkboxes. That conflates *documentation readiness* with *execution evidence*, undermining the checklist’s later requirement that live `test:security` be green before the tag.

---

## 2. Missing operator steps

The authoritative checklist (§6–§8) names gates but does not provide a single ordered runbook. Missing concrete steps:

1. **Gate board refresh** — Who updates §6 after `#80`/`#81`/`#83` merge? What evidence string is recorded (commit SHA / PR URL / date)?
2. **Migration dry-run ownership** — Gate 1 requires `supabase db push --dry-run`, but not: who runs it, from which machine, with which credentials, what “only idempotent `ipip120` pending” looks like as a pasted result, or where the artifact is filed.
3. **Required CI status-check wiring** — Gate 2 says CI is “made a required status check on `main`”; no operator steps for branch-protection UI (which checks, who has admin rights, screenshot/evidence).
4. **Governance adoption** — No step to change policy Status from Proposed → Adopted, with effective date and owner signature, after merge.
5. **Live `test:security` prerequisites** — Command is given; missing: how to create/seed Patient A/B + clinician accounts, how to obtain `ATTACKER_COOKIE`, which environment (preview vs `app.vwelfare.com`), pass/fail artifact location, and stop/go rule if only a subset fails.
6. **Leaked-password enablement** — Gate 5 is a one-liner. Missing: dashboard path, bilingual UX check on rejected password, who verifies advisors WARN clears, rollback confirm.
7. **Production alias confirmation** — Gate 6 lacks how to read the serving commit SHA from Vercel meta and compare it to the signed `main` commit before tag.
8. **Sign-off RACI** — §8 roles exist as blank rows; no named individuals, no quorum rule (all three required? majority?), no what “CONDITIONAL” means relative to §6.
9. **Tag + GitHub Release procedure** — “tag annotated `v1.0.0` and publish release” lacks exact `git tag`/`gh release` commands, changelog source of truth, and whether `RELEASE_NOTES.md` must be rewritten first (it currently claims already Released).
10. **Post-tag patient-open decision** — RC cert says do not open to patients if live suite fails; checklist stops at tag/sign-off. Missing explicit “traffic open / feature-flag / DNS” step and owner.
11. **Weekly drift check (§7 governance)** — Procedure listed, but no calendar owner, evidence log location, or first-run-before-GA requirement.
12. **Quarterly DR validation** — Referenced in governance + checklist recovery; no pre-GA confirmation that PITR tier matches the chosen RPO.
13. **BAA/DPA execution** — Checklist defers BAAs/DPAs (Gemini, Supabase, Vercel) post-GA while RC §7 requires Gemini data-processing/no-retention confirmation before opening to patients. No single compliance gate owner.
14. **Emergency contact activation** — IR runbook and env checklist still use `[Name]` / `[Number]` placeholders; no step to populate before GA.
15. **Status page** — IR runbook directs updates to `status.vwelfare.com` “(if configured)” with no pre-launch verify/create step.
16. **Supersession notice** — No operator instruction to mark June 30 unconditional GO docs as historical so they are not used as launch authority.

---

## 3. Governance gaps

1. **No single source-of-truth hierarchy** — Checklist claims authority, but older unconditional certifications and release notes remain marked production-ready/released without a supersession banner.
2. **Policy not formally adopted** — Governance remains “Proposed” after merge; adoption, exceptions, and violation handling are undefined.
3. **Human promote vs auto-deploy unresolved** — Change-control policy forbids auto-promote; release execution docs assume auto-deploy. PHI platforms need one binding rule.
4. **Break-glass vs hardening Option B** — Governance §5 emergency SQL requires same-day backfill migration; Hardening plan Option B allows hotfix + `schema_migrations` insert. Package does not state which wins.
5. **Sign-off theater** — Multiple docs show ✅ AUTHORIZED / CERTIFIED with blank signature blocks. Governance does not forbid unsigned “authorized” stamps.
6. **Healthcare vendor agreements** — BAAs/DPAs deferred post-GA while product handles mental-health PHI and sends data to Gemini; no documented risk acceptance with a named compliance owner and expiry.
7. **Audit completeness overclaim** — Marketing/release notes claim complete audit trails; governance admits admin/superadmin immutability gap. Regulated onboarding criteria are not tied to a GA vs post-GA decision matrix.
8. **Production test-account guidance** — `PHASE_7_FINAL_LIVE_VERIFICATION.md` instructs creating known-password test accounts **in production**. No governance control for unique secrets, rotation, or post-test disablement.
9. **Incident-response deferral inconsistency** — Checklist §7 defers the IR runbook while the package already ships one with placeholder contacts — so “deferred” may mean “unstaffed,” which is not stated.
10. **Mobile vs web GA boundary** — Checklist is web-centric GA; mobile hardening is deferred; Play/internal-testing docs are parallel. No explicit statement whether `v1.0.0` includes mobile patient traffic.
11. **Evidence retention** — Weekly verification, dry-run outputs, live security suite logs, and sign-off artifacts have no required retention location or retention period.
12. **Doc/change-isolation vs release bundling** — Governance §3 forbids mixing docs with other concerns; the release package itself spans many historical cert docs without an index of which are in-force.

---

## 4. Recommended package fixes (docs only)

Priority order for making the package executable:

1. Add a **Supersession / In-Force** section to `docs/RELEASE_CHECKLIST_v1.0.0.md` declaring it the only launch authority and listing superseded GO docs.
2. Refresh §6 checkboxes for already-merged `#80`/`#81`/`#83` **or** replace them with “verify still true” evidence steps (SHA + date).
3. Change governance header from Proposed → **Adopted** (or keep Proposed and remove it as a GA gate until signed).
4. Rewrite `RELEASE_NOTES.md` / `DEPLOYMENT_VERIFICATION.md` so they do not claim `v1.0.0` Released until §6–§8 complete; align commit SHA.
5. Publish one **Operator Runbook** appendix: ordered commands, owners, evidence artifacts, stop/go rules for gates 4–7.
6. Reconcile RTO/RPO/PITR to one binding pair; add a pre-GA PITR confirmation checkbox.
7. Resolve auto-deploy vs human promote; resolve squash vs fast-forward in one policy line.
8. Fill emergency contacts and status-page readiness before any “AUTHORIZED” stamp is allowed.
9. Align MFA / audit-trail / email-confirmation / IR-runbook language across Release Notes, Checklist §3/§7, and Governance §6.
10. Add explicit risk-acceptance records (owner + expiry) for deferred BAAs/DPAs and deferred admin audit trail if GA proceeds without them.

---

## 5. Bottom line

The final release package contains a usable checklist skeleton and a governance policy draft, but as a set it **contradicts itself on whether GA already happened, which gates remain open, what RTO/RPO apply, whether production auto-deploys, and which security/compliance items are closed vs deferred**. Several operator-critical steps (seeded live security run, branch-protection wiring, alias SHA confirmation, named sign-off, contact roster) are named as gates without executable instructions. Until supersession, gate hygiene, and a single operator runbook are fixed, the package is not a reliable launch control.
