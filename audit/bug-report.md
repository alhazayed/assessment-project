# V Welfare Prioritized Findings and Bug Report

**Audit date:** 2026-07-13  
**Status notation:** `LIVE` = verified in deployed configuration; `SOURCE` = verified in this checkout; `DRIFT` = branch/production mismatch

## Critical

| ID | Status | Location | Problem | Why it matters / risk | Recommended solution | Effort |
|---|---|---|---|---|---|---:|
| C-01 | LIVE | `handle_new_user`; baseline `:597-602` | signup role comes from user-editable metadata | unauthenticated privilege escalation to clinician/admin/superadmin | force patient role; server-only audited elevation; review accounts/revoke sessions | 6–10h |
| C-02 | LIVE | RLS on patient profiles, AI insights, chat, journals, PDFs, personality, assignments | any clinician can read unrelated patients | cross-patient mental-health PHI breach | relationship- and permission-scoped RLS with adversarial tests | 20–32h |
| C-03 | LIVE | clinical-notes/messages policies; baseline + `20260624190200` | weaker permissive policies OR with strict policies | private notes readable; unassigned notes/messages allowed | drop overlaps and create one explicit policy set per operation | 12–20h |
| C-04 | DRIFT | local migrations vs live | 17 production migrations absent locally | cannot reproduce, recover, or audit production; missing payment/security code | reconcile migrations and clean-build schema in CI | 16–32h |
| C-05 | SOURCE/LIVE | guest API `:293-307`; live `patient_id NOT NULL` | guest submissions insert NULL into NOT NULL column | deterministic workflow failure/data-model conflict | separate minimized guest table or remove persistence | 12–20h |
| C-06 | SOURCE | clinician relationship APIs/types/SQL | permission names and two relationship models conflict | consent approval fails or access differs from user intent | one canonical permission enum and relationship source of truth | 24–40h |

## High

| ID | Status | Location | Problem | Risk | Recommended solution | Effort |
|---|---|---|---|---|---|---:|
| H-01 | SOURCE | Gemini routes | raw chat/notes/scores sent without consistent PHI scrub | processor/privacy breach | data minimization, DPA/BAA, consent, de-identification, audit | 16–32h + legal |
| H-02 | SOURCE | admin clinician verification and KPI alert routes | bypass PIN/HMAC admin session | admin action with only compromised Supabase session | use centralized API admin guard | 4–8h |
| H-03 | SOURCE | `package.json:22`; lockfile | npm audit: 4 high, 1 moderate | known Next.js/request handling vulnerabilities | supported patched upgrade and full regression | 12–24h |
| H-04 | SOURCE | `app/api/clinician/patients/route.ts:85-86` | queries submission `user_id` instead of `patient_id` | clinician patient metrics fail | use schema-generated types and correct column | 1–3h |
| H-05 | SOURCE | `/patients`, `/admin/settings` pages | missing role-specific server gate | role-inappropriate access; dependence on RLS accidents | enforce clinician/admin layouts/guards | 2–4h |
| H-06 | SOURCE | mobile assessment submit `:115-131` | bypasses API validation, atomicity, limits, risk notification | corrupt or misleading clinical data | use validated API/RPC that recomputes score | 8–16h |
| H-07 | SOURCE | messages `:190-192` | fixed sidebar/full-screen layout on phones | core communication unusable | responsive master/detail and keyboard/safe-area QA | 8–12h |
| H-08 | SOURCE | register checkbox `:344-351` | clickable div, not native control | inaccessible consent and unreliable submission | native required checkbox + consent version | 2–4h |
| H-09 | SOURCE | mobile UI | no accessibility labels/roles | VoiceOver/TalkBack unusable | accessibility inventory and device testing | 16–32h |
| H-10 | SOURCE | clinician verification | only caller-supplied document URLs; no upload controls | license evidence can be forged/exposed | private storage, signed upload, MIME/size/AV, ownership | 16–32h |
| H-11 | SOURCE | assessment client imports | all narrative content shipped client-side | poor mobile load and bundle growth | split by scale/locale or render server-side | 8–16h |
| H-12 | SOURCE | admin analytics/research | up to 5,000 rows aggregated in functions | inaccurate/slow analytics at scale | authorized SQL aggregates/materialized views | 12–24h |
| H-13 | SOURCE | appointments domain | no scheduling workflow/model found | stated patient/clinician production workflow absent | define clinical scheduling, timezone, reminders, cancellation, audit | 32–60h |
| H-14 | DRIFT | payment implementation | live DB has payment tables; checkout has no code/migrations | real payment behavior cannot be certified | audit production source and Stripe test E2E | 8–16h audit |

## Medium

| ID | Location | Problem / risk | Recommended solution | Effort |
|---|---|---|---|---:|
| M-01 | live SECURITY DEFINER grants | relationship oracle executable by anon | revoke anon/PUBLIC; validate caller | 2–4h |
| M-02 | live Auth | leaked-password protection disabled | enable and enforce strength policy | 1–2h |
| M-03 | forgot password `:27-28` | caller-controlled redirect | canonical server-generated redirect | 1–2h |
| M-04 | consent notifications | `notification_events` not consumed by bell | consolidate notifications or project events into user inbox | 6–10h |
| M-05 | consent notification links | points to `/clinician/patients`, actual `/patients` | use typed route constants and route tests | 1–2h |
| M-06 | middleware | `/notifications` referenced but page absent locally | add page or remove links/prefix | 2–4h |
| M-07 | reports route | granular clinician `export_reports` permission unused | authorize through canonical relationship permission | 4–8h |
| M-08 | mobile messages | `recipient_id` differs from web message schema | align generated types and API | 6–10h |
| M-09 | live DB advisors | 17 unindexed FKs | add indexes used by joins/cascades | 3–6h |
| M-10 | live DB advisors | 19 duplicate indexes | compare/drop exact redundancies | 3–6h |
| M-11 | live DB advisors | 199 overlapping permissive policy warnings | consolidate after security redesign | 8–16h |
| M-12 | live DB advisors | 51 auth init-plan warnings | use scalar auth subqueries | 4–8h |
| M-13 | profiles triggers | duplicate role/timestamp triggers | retain one each | 2–4h |
| M-14 | admin matviews | no refresh cron observed | schedule concurrent refresh and monitor freshness | 3–6h |
| M-15 | Vercel/Supabase | functions observed in `iad1`, DB `eu-central-1` | cross-region latency/residency concern | measure and align with residency decision | 4–8h |
| M-16 | logging/ops | no structured logs, APM, alerts, correlation IDs | poor incident detection | privacy-safe telemetry and on-call alerts | 12–24h |
| M-17 | CI | no workflows | lint/type/test/build/security drift not gated | add CI with migration/RLS tests | 8–16h |
| M-18 | DR | PITR not confirmed, no restore evidence | RPO/RTO unproven | enable/verify PITR and run restore drill | 8–16h |
| M-19 | SEO sitemap | omits `/clinicians`, `/contact` | reduced discoverability | include public routes and locale metadata | 1–2h |
| M-20 | canonical config | differing source defaults; env undocumented | duplicate/incorrect canonical risk | one required `NEXT_PUBLIC_SITE_URL` | 1–2h |
| M-21 | admin/KPI/patients UI | hardcoded light/LTR styling | dark/RTL inconsistency | migrate to tokens/logical properties | 6–12h |
| M-22 | ADHD checker | English-only content in Arabic mode | comprehension/clinical safety | clinically reviewed Arabic content | 8–16h + review |
| M-23 | profile/mood forms | labels not associated | screen-reader failure | IDs, `htmlFor`, descriptions/errors | 4–8h |
| M-24 | progress/options | missing progress and selected ARIA state | AT cannot understand assessment progress/choice | add native/ARIA semantics | 3–6h |
| M-25 | journal cards | pointer-only clickable div | keyboard inaccessible | button/link semantics | 2–4h |
| M-26 | landing drawer | no focus trap/dialog behavior | keyboard focus escapes | accessible dialog/menu implementation | 3–5h |
| M-27 | user export | no rate/recent-auth requirement | bulk sensitive export after session theft | rate limit, reauth, audit delivery | 3–6h |
| M-28 | AI key transport | Gemini key in query string | infrastructure log leakage | header/server SDK | 2–4h |
| M-29 | health endpoint | response requires DB/AI and took 1.21s sample | slow/noisy availability signal | split liveness/readiness and define dependencies | 2–4h |
| M-30 | admin routes | duplicated `/admin/*` and `/x/control/*` | inconsistent auth and UX | consolidate after security fixes | 8–16h |
| M-31 | research analytics | no protocol/purpose/consent governance | inappropriate “research” use of patient data | scoped research module or relabel admin analytics | 16–40h |

## Low

| ID | Location | Problem | Recommendation | Effort |
|---|---|---|---|---:|
| L-01 | `tailwind.config.ts` | scans nonexistent Pages Router path | remove dead glob | 0.5h |
| L-02 | components | unused synthesis, demographics, Turnstile components | integrate or remove after reference verification | 1–3h |
| L-03 | rate-limit Redis module | documented but unused | wire deliberately or remove docs/module | 2–4h |
| L-04 | dark mode toggle | mount placeholder may shift | reserve dimensions/server theme hint | 1–2h |
| L-05 | root/app layouts | duplicate skip links | retain one correctly targeted link | 0.5–1h |
| L-06 | app error page | light-only | use design tokens/dark mode | 1–2h |
| L-07 | UI copy | “V Welfare” / “Vwelfare” inconsistency | brand content pass | 1–2h |
| L-08 | docs | no root README, stale contradictory reports | canonical setup/architecture/runbook | 4–8h |
| L-09 | mobile | no lockfile | commit reproducible lockfile | 1–2h |
| L-10 | `mobile/app.json` | public Supabase key hardcoded | inject per environment for rotation clarity; key is not secret | 2–4h |
| L-11 | CSP | lacks `object-src 'none'` | add and test | 1h |
| L-12 | audit details | deletion request stores email | minimize to actor/user ID | 1–2h |

## Confirmed strengths, not bugs

- Supabase service-role key is server-only.
- Production logo and OG image return HTTP 200 (despite absence in this stale checkout).
- Production health returned 200 and Vercel showed no runtime error clusters in 24 hours.
- All observed live public base tables have RLS enabled.
- Materialized views deny anon/authenticated direct SELECT live.
- Rate-limit cleanup cron is active.
- HSTS, nonce CSP, frame denial, nosniff, permissions and referrer headers are live.
- Guest abuse routes include Turnstile/rate-limit/circuit-breaker controls; the schema mismatch still breaks persistence.

## Launch blockers only

1. C-01 signup role escalation.
2. C-02 cross-patient clinician RLS.
3. C-03 notes/messages policy bypass.
4. C-04 unreproducible production schema/source.
5. C-05 guest schema conflict if guest workflow remains enabled.
6. C-06 contradictory consent/relationship authorization.
7. H-01 ungoverned PHI transfer to Gemini.
8. H-02 inconsistent admin factor enforcement.
9. H-03 known vulnerable framework dependencies.
10. H-06 mobile clinical-data validation bypass.
11. H-08/H-09 accessibility blockers.
12. Payment/upload/appointment workflows must be either certified or clearly unavailable before launch claims.

