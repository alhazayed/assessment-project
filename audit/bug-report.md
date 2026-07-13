# V Welfare Prioritized Issue Register
**Evidence standard:** current committed source and migrations. Historical reports were reviewed but not accepted where contradicted by code.

## Critical
| ID | Location | Problem / risk | Recommended solution | Effort |
|---|---|---|---|---|
| C-01 | Auth trigger migration | User-controlled signup metadata can create privileged roles; PHI/admin data exposure | Force `patient` at signup, service-role role provisioning, remediate existing rows | 2–4 h |
| C-02 | Clinical notes/messages RLS migration | Permissive policy collision can expose PHI or private clinician notes | Replace full policy sets with relationship-permission RLS and pairwise JWT tests | 6–10 h |
| C-03 | Gemini routes | PHI/clinical narrative sent to Gemini without consistent minimization/consent governance | Disable or redesign AI data processing with legal/vendor controls and redaction | 12–20 h + legal |
| C-04 | Guest route vs NOT NULL constraint | Guest assessment fails after committed constraint migration | Dedicated guest model or coherent nullable design | 4–8 h |
| C-05 | Admin materialized views | Non-existent columns make view/RPC refresh fail | Correct schema references and stage refresh test | 4–6 h |
| C-06 | Permission vocabulary | DB/API/UI permission keys conflict; consent outcomes unreliable | Canonical enum/constants, migration/backfill, tests | 6–10 h |

## High
| ID | Location | Problem / risk | Recommended solution | Effort |
|---|---|---|---|---|
| H-01 | consent vs `assigned_clinician_id` | revocation and authorization use competing models | migrate every route/RLS check to active relationship permission | 20–32 h |
| H-02 | patient/AI/journal RLS | broad clinician direct reads, particularly from mobile | scope policies to active consented relationship | 8–14 h |
| H-03 | admin RPC grants | authenticated users may invoke analytics/risk RPCs | revoke grants and add guarded wrappers | 3–5 h |
| H-04 | forgot password | caller controls reset redirect | fixed allowed site URL / relative path validation | 1 h |
| H-05 | admin authentication | shared low-entropy PIN; one route weaker than `requireAdmin` | per-user MFA and uniform guard | 12–24 h |
| H-06 | clinician patient API | wrong `user_id` column breaks last-assessment data | use `patient_id`; set-based latest query | 2–4 h |
| H-07 | admin package export | selects nonexistent profile columns | use actual name columns and approved email retrieval | 1–2 h |
| H-08 | research endpoint | no research-consent/k-anonymity gate | explicit opt-in, de-identification, small-cell suppression | 8–12 h |
| H-09 | mobile assessment | direct writes bypass server score authority | authenticated API submission and remove direct insert policy | 6–10 h |
| H-10 | dependency | Next 14.2.35 remains despite old reports claiming upgrade | current supported patched upgrade with regression validation | 4–8 h |

## Medium
- **M-01:** `notification_events` is written but unconsumed; relationship notices can be invisible. (4–6 h)
- **M-02:** no committed storage buckets/policies despite credential document URL workflow. (4–8 h)
- **M-03:** analytics/research in-memory aggregation does not scale. (8–12 h)
- **M-04:** no consistent route loading/error boundaries. (6–10 h)
- **M-05:** account deletion only records a request; GDPR execution/retention workflow is absent. (12–20 h + legal)
- **M-06:** rate/cost controls have coverage and atomicity gaps. (4–8 h)
- **M-07:** no demonstrated central monitoring, RUM, or executable end-to-end critical-flow suite. (12–20 h)
- **M-08:** assessment controls, progress, heatmap, checkbox and charts fail key accessibility semantics. (12–20 h)
- **M-09:** responsive messages/patient views require mobile redesign. (12–18 h)
- **M-10:** migration history/stubs prevent reproducible fresh database verification. (12–24 h)

## Low
- **L-01:** Turnstile globally loads on every route. (2 h)
- **L-02:** Gemini API key appears in request URL. (1 h)
- **L-03:** health endpoint reveals integration configuration. (1 h)
- **L-04:** no reduced-motion handling and physical LTR admin CSS. (4–6 h)
- **L-05:** page metadata/detail SEO coverage is incomplete; not a safety blocker. (2–4 h)

## Confirmed product gaps (not bugs)
Appointments and payments are not implemented. No supported production claim should state that the platform accepts real payments or manages clinical appointments without separately implementing and auditing those capabilities.
