# V Welfare Remediation Roadmap
This roadmap intentionally does **not** implement fixes. Apply one cohesive issue per reviewed change set, with clinical/security approval and production-like staging evidence.

## Release gate: must complete before real PHI launch
| Order | Work item | Exact implementation scope | Verification |
|---|---|---|---|
| 1 | Stop role escalation | Migration changes signup trigger to literal `patient`; service-role-only elevated-role workflow; review existing elevated users | direct signup payload with `role=admin` remains patient; migration/RLS test |
| 2 | Repair authorization model | Canonical permission vocabulary; migrate legacy assignment data; replace clinician API checks and RLS with active relationship permission | patient/clinician/revoked/admin JWT matrix; direct PostgREST/API IDOR tests |
| 3 | Replace unsafe note/message RLS | Drop superseded permissive policies and recreate least-privilege policy set | `pg_policies` review plus test each SELECT/INSERT/UPDATE/DELETE actor |
| 4 | Resolve guest data model | Choose separate guest table or nullable/partitioned design, then align route, exports, retention and abuse controls | clean migration replay; authenticated and guest submission tests |
| 5 | Govern AI data processing | Disable PHI egress until contract/consent/clinical review; implement minimization/redaction, human-use disclaimer, opt-in, audit and incident controls | inspect outbound payload fixtures; vendor/legal approval; no PHI in logs |
| 6 | Fix admin data plane | correct views, revoke public RPC/view grants, standardize `requireAdmin`, replace shared PIN with per-user MFA | staged refresh, direct authenticated RPC denial, MFA recovery/lockout tests |
| 7 | Fix mobile integrity | route mobile submissions through server-authoritative scorer and remove direct submission writes | identical mobile/web scoring fixture; modified client cannot set result fields |
| 8 | Repair migration provenance | reconcile remote/local histories, retain a restore point, create reproducible schema baseline and CI migration replay | clean isolated project replay; schema/policy diff reviewed |

## Post-gate hardening
1. Research consent and de-identification, then clinician-verification UI/notification consolidation.
2. Next.js/dependency upgrade in an isolated PR with build, typecheck, security tests, and preview smoke tests.
3. Database aggregation and export streaming after view/RLS corrections; benchmark with synthetic data.
4. Add Playwright critical paths: registration/verification, consent grant/revoke, assessment, high-risk alert, export, admin authorization.
5. Accessibility work: assessment semantics first, then progress/charts/calendar, skip links, dialogs, contrast/RTL/reduced-motion.
6. Mobile responsive messaging/patient views and route-level loading/error states.
7. Monitoring, RUM without PHI, alerting, backup/PITR confirmation, restore drill and incident runbook validation.

## Change protocol for each issue
1. Define threat model and acceptance tests before code.
2. Make only the related code/migration/test/doc edits.
3. Commit and deploy to isolated staging with synthetic data.
4. Run `npx tsc --noEmit`, lint (after updating obsolete `next lint` script if needed), unit/security tests, and focused browser/API/RLS tests.
5. Review database grants/policies and rollback migration before production.
6. Record evidence, release owner approval, and post-deploy monitoring criteria.

## Final release recommendation
**❌ DO NOT GO LIVE.** The first eight gate items include privilege escalation, potential PHI disclosure, inconsistent consent enforcement, unreproducible schema history, and broken core workflows. A successful UI build or historical report does not mitigate these current-source findings.
