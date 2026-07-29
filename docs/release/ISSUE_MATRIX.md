# Issue Matrix — Release Documentation Reconciliation

**Document status:** AUTHORITATIVE  
**Board date:** 2026-07-26

| Issue | Affected Documents | Resolution | Action Taken | Risk |
|---|---|---|---|---|
| Multiple conflicting launch verdicts | Final certs, env checklist, ops summary, RC cert, checklist, release notes | Single decision: **CONDITIONAL GO** | Canonical Release State + supersession banners | High if ignored — wrong go-live |
| Checklist gates G1–G3 still ☐ after merge | `RELEASE_CHECKLIST_v1.0.0.md` | Split merge-fact ✅ vs evidence ☐ | Checklist + Canonical State updated | Medium — operators re-do or skip wrongly |
| Governance labeled Proposed after merge | `PRODUCTION_GOVERNANCE_POLICY.md` | **Adopted** 2026-07-26 | Header/status updated | Medium — policy unenforceable |
| Release Notes claim Released + wrong SHA | `RELEASE_NOTES.md` | Historical/pre-GA rewrite; tag not cut | Release Notes rewritten | High — false public status |
| Deployment Verification alternate SHA + tag created | `DEPLOYMENT_VERIFICATION.md` | SUPERSEDED by Operator Runbook | Banner added | High |
| Auto-deploy vs human promote | Production release report, deployment action plan, governance | Human promote only | Governance Adopted; reports SUPERSEDED | High — change control |
| Squash vs fast-forward | Governance vs production release report | Squash-merge | Resolution log #13 | Low |
| MFA claimed vs deferred | Release Notes vs Checklist | Not implemented; post-GA | Notes + State aligned | Medium — compliance messaging |
| Complete audit trail claimed vs gap | Release Notes vs Governance | Partial; admin trail post-GA | Notes + State aligned | Medium |
| Email confirmation verified vs disabled | Email infra / final cert vs Checklist / Hardening | Disabled; post-GA | State + Notes; email doc REFERENCE | Medium |
| IR runbook deferred vs exists | Checklist §7 vs Ops summary / IR file | Runbook ACTIVE; contacts incomplete | Checklist §7 corrected | Medium |
| RTO/RPO conflict | `docs/DISASTER_RECOVERY.md` vs `BACKUP_AND_DISASTER_RECOVERY.md` | RTO 4h / RPO \<1h; DR.md SUPERSEDED | Banner + resolution log | High for DR drills |
| PITR assumed enabled | Release notes, deployment verification, final cert | Unconfirmed admin gate | Remaining Actions | High if RPO unmet |
| Duplicate operator procedures | Env checklist, deployment verification, Phase 7, action plan | Single Operator Runbook | Runbook published; others SUPERSEDED | High — execution ambiguity |
| Blank sign-offs with AUTHORIZED stamps | Env checklist, final cert | Invalid; §8 named sign-off required | Superseded + Checklist clarified | High — governance theater |
| Placeholder emergency contacts | IR runbook, env checklist | Must complete before GA | Remaining Actions | High — P1 response failure |
| Status page unverified | IR runbook (`status.vwelfare.com`) | Confirm or document absence | Remaining Actions | Medium |
| Phase 7 known prod passwords | `PHASE_7_FINAL_LIVE_VERIFICATION.md` | SUPERSEDED; Runbook forbids those passwords | Banner + Runbook §C | High — credential hygiene |
| Integrity review findings unaddressed | (prior review; may be open PR) | Incorporated into this package | This reconciliation | — |
| BAA/DPA deferred vs PHI + Gemini | Checklist §7 vs RC historical ask | Deferred with required risk acceptance before patient-open | Remaining Actions | High — compliance |
| Break-glass Option B vs Governance §5 | Hardening plan vs Governance | Governance §5 authoritative | Resolution log #22 | Medium |
| No supersession hierarchy | Entire package | Hierarchy + matrix | `README.md` + matrix | High — was root failure |

---

*Living matrix for this reconciliation cycle.*
