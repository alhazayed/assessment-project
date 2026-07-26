# V Welfare — Maintenance Window Log v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-MWL-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Operator |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |

---

## 1. Window header

| Field | Value |
|---|---|
| Window planned start (UTC) | |
| Window planned end (UTC) | |
| Actual start (UTC) | |
| Actual end (UTC) | |
| RELEASE_COMMIT | |
| LKG_DEPLOYMENT_ID | |
| LKG_COMMIT_SHA | |
| RM on duty | |
| DBA on duty | |
| SEC on duty | |
| OPS on duty | |
| Outcome | `IN_PROGRESS` / `GO LIVE` / `GO LIVE WITH CONDITIONS` / `ABORTED` / `ROLLED_BACK` |

---

## 2. Timeline log (append-only)

| Time (UTC) | Phase | Gate | Action | Result | Operator | Notes (no PHI) |
|---|---|---|---|---|---|---|
| | T−60m | — | Freeze certificate signed | | | |
| | T−15m | G1 | Migration list + dry-run | | | |
| | T−10m | G2 | Pre-change SQL fingerprint | | | |
| | T0 | — | RM GO / NO-GO call | | | |
| | T0+ | G3 | Leaked-password enable | | | |
| | | G5 | Production promote / alias confirm | | | |
| | | G6 | Post-change SQL verify | | | |
| | | G7 | Advisors | | | |
| | | G8 | Live security suite | | | |
| | | G9 | Smoke P0 | | | |
| | | G11 | Sign-off | | | |
| | Close | — | Tag / closure | | | |

---

## 3. Abort / rollback events

| Time (UTC) | Trigger | Matrix action | Executed by | Verified LKG health ☐ |
|---|---|---|---|---|
| | | | | ☐ |

---

## 4. Closure

- [ ] Evidence Register updated  
- [ ] Artifact Inventory completed  
- [ ] Release Closure Report drafted  
- [ ] Stakeholders notified of outcome  

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Operator | | | | |
| Release Manager | | | | |
