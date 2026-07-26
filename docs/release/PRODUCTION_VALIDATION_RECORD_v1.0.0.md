# V Welfare — Production Validation Record v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-VAL-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | Security Lead |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |

---

## 1. Scope

Post-promote validation that production is safe for mental-health PHI workloads: isolation, headers, advisors, clinical export denial, smoke P0.

---

## 2. Security validation

| Check | Method | Pass ☐ | Evidence ID | Notes |
|---|---|---|---|---|
| Patient isolation | Live `test:security` | ☐ | E-013 / E-020 | |
| Clinician isolation | Live `test:security` | ☐ | E-013 | |
| Private notes protection | Live `test:security` | ☐ | E-013 | |
| Admin RPC unauth denial | Live suite / grants SQL | ☐ | E-010 / E-013 | |
| PDF non-owner denial | Live suite | ☐ | E-014 | **Must not return PHI** |
| Security headers | `curl -sI` | ☐ | E-017 | |
| Advisors 0 ERROR | Dashboard/MCP | ☐ | E-012 | |
| Leaked-password enabled | Auth UI | ☐ | E-007 | Or signed exception |
| AI PHI scrub path | Smoke S18 | ☐ | E-015 | |
| Redirect allow-list | Smoke S19 | ☐ | E-015 | |

---

## 3. Clinical safety validation

| Check | Pass ☐ | Notes |
|---|---|---|
| Assessment submit + server-side score path works | ☐ | |
| Interpretation displays without client score injection trust | ☐ | |
| High-risk presentation behaves per product rules (no silent drop) | ☐ | |
| Emergency / crisis messaging still visible where designed | ☐ | |
| Disclaimer / privacy notice reachable | ☐ | |

---

## 4. Operational validation

| Check | Pass ☐ | Evidence ID |
|---|---|---|
| `/api/health` healthy | ☐ | E-016 |
| Production alias = RELEASE_COMMIT | ☐ | E-009 |
| Backup baseline recorded | ☐ | E-001 |
| Monitoring receiving events (Sentry/Vercel) | ☐ | |

---

## 5. Validation decision

| Decision | Select one |
|---|---|
| VALIDATED — proceed to sign-off | ☐ |
| VALIDATED WITH CONDITIONS — see REL-RSK-100 / REL-EXC-100 | ☐ |
| NOT VALIDATED — abort/rollback per Abort Matrix | ☐ |

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| Security Lead | | | | |
| Senior DBA (SQL section) | | | | |
| Release Manager | | | | |
