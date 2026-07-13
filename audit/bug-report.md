# V Welfare — Bug & Code Quality Report

**Audit date:** 2026-07-13
**Scope:** Logic errors, dead code, duplicate code, race conditions, missing validations, memory leaks, and workflow-breaking defects that don't fit neatly into the Security/Database/UI/Accessibility reports. Cross-references are provided where a finding is detailed more fully elsewhere.

---

## Critical

### BUG-1 — Mobile app computes assessment scores client-side and writes directly to the database, bypassing all server-side validation
**Location:** `mobile/app/(app)/assessments/[id].tsx:108-131`
**Problem:** The mobile client sums response values, determines the severity band, and evaluates the high-risk flag entirely in JavaScript, then inserts the result directly into `assessment_submissions`/`assessment_responses` via the Supabase client — never calling `/api/submit-assessment`, which is where the equivalent web flow does this correctly and safely.
```108:126:mobile/app/(app)/assessments/[id].tsx
    const totalScore = responses.reduce((sum, r) => sum + r.response_value, 0)
    const band = calcBand(def.scoring_logic as ScoringBand[], totalScore)
    ...
    const { data: submission } = await supabase.from('assessment_submissions').insert({
      patient_id: user.id, definition_id: def.id, total_score: totalScore,
      severity_band: band?.severity_en ?? null, high_risk_flag: highRisk, is_self_initiated: true,
    })
```
**Why it matters:** For a clinical assessment platform, the score is the product. A modified client (or a scripted call replaying the same request shape) can submit any score, any severity band, and — critically — suppress the `high_risk_flag` that's supposed to trigger a suicidal-ideation safety alert. RLS on `assessment_submissions` only checks row ownership (`patient_id = auth.uid()`), not score correctness, so the database provides no backstop.
**Risk:** Direct clinical-safety and data-integrity failure; also a potential legal/liability exposure if a suppressed high-risk flag is later discovered.
**Recommended fix:** Route mobile submissions through `/api/submit-assessment`, adding Bearer-token support to that route (it currently only reads the cookie session) so the mobile client can call it with the Supabase access token, mirroring the pattern already used for `/api/ai-chat` and `/api/user/push-token`.
**Effort:** High (mobile client change + API route auth extension + regression test that mobile and web produce identical scores for identical answers).

---

## High

### BUG-2 — Two coexisting, non-integrated clinician-access data models
**Location:** Cross-cutting — `profiles.assigned_clinician_id` (legacy) vs. `clinician_patient_relationships`/`relationship_permissions` (new consent system)
**Problem:** The newer, patient-controlled consent flow (access codes, invitations, approve/reject) never writes `assigned_clinician_id`. But `patients-content.tsx` (clinician patient list), `messages/page.tsx`, `clinical-notes` route, and `assignments` route all still gate on `assigned_clinician_id`.
**Symptom:** A patient can successfully approve a clinician's access request through the new UI, see it reflected as "approved" on their own side, and the clinician still sees an empty patient list, cannot message the patient, and cannot write notes — the connection appears successful but delivers none of the promised functionality.
**Why it matters:** This is not a cosmetic bug — it makes the newer, more privacy-respecting consent system (which is presumably the intended long-term model, given how much more granular and patient-controlled it is) functionally useless for anything beyond generating a "connected" status. Every clinician using only the new flow (no admin-assigned relationship) is stuck.
**Recommended fix:** See Architecture Report §3.3 and Roadmap R-1 — either populate `assigned_clinician_id` as a side effect of relationship approval (fast, low-risk patch) or rewrite the dependent features to check `clinician_patient_relationships` (correct long-term fix, higher effort).
**Effort:** Low for the patch (sync `assigned_clinician_id` on approval), High for the full rewrite.

### BUG-3 — High-risk (crisis) notifications are fire-and-forget, admin-only, and can silently fail
**Location:** `app/api/submit-assessment/route.ts:7-42, 209-212`; same pattern in `app/api/submit-assessment-guest/route.ts:327`
```209:212:app/api/submit-assessment/route.ts
    if (highRisk) {
      notifyAdminsHighRisk(submissionId as string, definition_id, user.id).catch(() => {})
    }
```
```40:42:app/api/submit-assessment/route.ts
  } catch (err) {
    console.error('[notifyAdminsHighRisk] error (non-fatal):', err instanceof Error ? err.message : 'unknown')
  }
```
**Problem:** The high-risk flag is correctly computed and persisted, but the notification of that flag to a human is: (a) not awaited before responding to the client, (b) wrapped in an empty `.catch(() => {})` that swallows any failure with no retry/alerting, (c) sent only to admins, not to the patient's assigned clinician, and (d) in-app only — no email/SMS/push, despite a `push_tokens` table and registration endpoint existing elsewhere in the codebase with no code path found that actually sends a push for this event.
**Why it matters:** This is the single most safety-critical code path in the entire application. A database hiccup, a bug in `notifyAdminsHighRisk`, or simply an admin who isn't looking at their notification bell at that moment means a patient who just flagged suicidal ideation may receive no human follow-up at all, and nobody would know it failed, because the failure is deliberately silenced.
**Recommended fix:** At minimum, `await` the notification and log failures to a monitored channel (not just `console.error`) rather than swallowing them; extend delivery to the assigned/relationship-connected clinician, not just admins; add a push/email channel as a second delivery path; consider a periodic "unacknowledged high-risk alerts" sweep as a safety net.
**Effort:** Medium (notification logic) + Medium-High (new delivery channel).

### BUG-4 — Guest assessment submissions are schema-inconsistent with a `NOT NULL` constraint on `patient_id`
**Location:** `app/api/submit-assessment-guest/route.ts:293-307` vs. `supabase/migrations/20260627220200_assessment_submissions_constraints.sql`
**Problem:** The guest route inserts `patient_id: null` into `assessment_submissions`; a later migration adds `patient_id SET NOT NULL` to the same table, with a comment claiming guests use a "separate table" — they do not.
**Why it matters:** If/when the constraint is active in production, every guest submission fails outright (silently, from the guest's perspective — the API would return a 500). This is a live landmine, not a theoretical one, if the constraint has been applied. Full detail in Database Report DB-H3.
**Recommended fix:** See Database Report — either a genuinely separate guest table or a conditional constraint.
**Effort:** Medium.

### BUG-5 — Assessment API allows omitting safety items, letting the web-side "must answer all questions" rule be bypassed by any direct API caller
**Location:** `app/api/submit-assessment/route.ts:132-138`
```132:138:app/api/submit-assessment/route.ts
    for (const resp of responses) {
      if (seenItemIds.has(resp.item_id)) continue
      const item = itemMap.get(resp.item_id)
      if (!item) continue // skip unknown items silently
```
**Problem:** The web UI disables submission until every item is answered, but the API itself accepts any non-empty subset — including a subset that omits the safety item(s) that would otherwise trigger `safetyItemTriggered`.
**Why it matters:** Combined with BUG-3, this is a second way (independent of the mobile bypass) that a high-risk flag could go undetected — this time via a crafted request to the *legitimate* server endpoint, not by bypassing it. It also allows partial/low-effort submissions to pollute analytics and history with incomplete data.
**Recommended fix:** Require either all items for the assessment definition, or explicitly require any item flagged `is_safety_item` to be present, before scoring; reject with a clear 400 otherwise.
**Effort:** Low-Medium.

### BUG-6 — Clinician "download report" button in the UI always returns 403
**Location:** `app/(app)/patients/patients-content.tsx:343-351` (links to `/api/reports?patient_id=...`) vs. `app/api/reports/route.tsx:108-114` (only allows self or admin/superadmin — not clinician)
**Why it matters:** A clinician-facing feature is visibly present, clickable, and silently fails for its entire target audience — this indicates the feature was never tested end-to-end from the clinician's perspective before shipping. It's also evidence of the same authorization-model fragmentation as BUG-2 (should this check `assigned_clinician_id`, or the new relationship-permission `export_reports`/`view_reports` grant? Neither is currently wired in.)
**Recommended fix:** Extend `/api/reports` to allow a clinician with an active assignment or relationship-permission grant for that patient.
**Effort:** Low-Medium.

### BUG-7 — Notification deep-link points at a route that does not exist
**Location:** `app/api/access-requests/[id]/route.ts:160`
```160:160:app/api/access-requests/[id]/route.ts
   link: '/clinician/patients',
```
No such route exists in `app/`; the real path is `/patients`. Any clinician who clicks this notification hits a 404.
**Effort:** Trivial.

### BUG-8 — Mobile PDF export calls an API route that does not exist
**Location:** `mobile/app/(app)/assessments/[id].tsx:155-157` (and two other call sites) call `${WEB_URL}/api/export/pdf/${submissionId}` — no `app/api/export/` directory exists anywhere in the Next.js app.
**Why it matters:** A visible, tappable "export PDF" feature in the mobile app is completely broken (guaranteed 404) for every user who tries it.
**Recommended fix:** Either implement the endpoint (mirroring `/api/reports`'s auth/ownership pattern, with Bearer-token support) or remove the button until it exists.
**Effort:** Medium (implement) or Trivial (remove).

### BUG-9 — Mobile GDPR export/delete calls send Bearer tokens to cookie-only routes
**Location:** Mobile calls `/api/user/export-data` and `/api/user/delete-request` with an `Authorization: Bearer` header; both routes only read the Supabase session from cookies (`createClient()` pattern), with no Bearer-token branch. These calls will fail with 401 from the mobile app.
**Effort:** Low (add the same Bearer-or-cookie branch already used in `/api/ai-chat`).

### BUG-10 — Mobile mood/journal/messages screens use column names that don't match the live schema
**Location:** `mobile/app/(app)/mood.tsx:138-144` (`logged_at`/`notes` vs. DB's `log_date`/`mood_note`), plus similar mismatches for journal (`title`/`content` vs. DB's `body`) and messages (`recipient_id`/`is_read` vs. DB's `clinician_id`/read-state fields).
**Why it matters:** These screens will throw runtime errors or silently write to nonexistent/mismatched columns if a user reaches them. They are currently hidden from the mobile tab bar (`href: null` in `_layout.tsx`), which suggests the team is aware these are unfinished — but they represent real, uncommitted work-in-progress shipped in the repository, not merely a UI gap.
**Recommended fix:** Either finish and align these screens with the current schema before re-enabling navigation to them, or remove the dead/broken screens until they're ready.
**Effort:** Medium per screen.

---

## Medium

### BUG-11 — Guest assessment submission is not transactional
**Location:** `app/api/submit-assessment-guest/route.ts:316-323` — the submission row and its response rows are inserted in two separate calls with no shared transaction and no error check on the responses insert. A failure between the two leaves an orphaned submission with no responses.
**Effort:** Low-Medium (wrap in an RPC similar to `submit_assessment_atomic`).

### BUG-12 — No idempotency protection on assessment submission
**Location:** `app/api/submit-assessment/route.ts` — a user (or a retried/duplicated client request) can submit the same assessment repeatedly within the 20/hour rate limit, each creating a new row. This inflates history/analytics and could confuse a clinician reviewing "recent" results if several near-duplicate submissions appear in quick succession.
**Recommended fix:** Consider a short (e.g., 60-second) de-dupe window keyed on `(patient_id, definition_id, response-hash)`, or at minimum surface a "you recently completed this — are you sure?" confirmation client-side.
**Effort:** Low.

### BUG-13 — Rescreening trigger is fire-and-forget with no failure visibility
**Location:** `components/rescreening-trigger.tsx:6-8`
```6:8:components/rescreening-trigger.tsx
  useEffect(() => {
    fetch('/api/check-rescreening', { method: 'POST' }).catch(() => {})
  }, [])
```
Same pattern class as BUG-3 but lower stakes (rescreening reminders, not crisis alerts) — still worth fixing as part of a broader "stop swallowing async errors silently" pass across the codebase.

### BUG-14 — Package AI interpretation call has no timeout/retry wrapper, unlike every other Gemini call site
**Location:** `app/api/packages/[id]/interpret/route.ts:130-137` uses a raw `fetch()` directly against the Gemini endpoint instead of the shared `lib/gemini.ts` helper (which provides a 15s timeout and retry-with-backoff). A hung upstream request here has no timeout protection, unlike `ai-chat`, `synthesis`, and `clinical-notes`.
**Effort:** Low (swap to the shared helper).

### BUG-15 — Several admin mutation endpoints are not written to `audit_log`
**Location:** `app/api/admin/assessments/route.ts` (visibility toggle), `app/api/admin/flags/route.ts` (feature flags), `app/api/admin/settings/route.ts` (platform settings), `app/api/admin/announcements/route.ts` (create/toggle/delete) — none of these write an audit entry, unlike user role changes, exports, and clinician-verification reviews, which do.
**Why it matters:** Inconsistent audit coverage undermines the "comprehensive audit logging" claim made elsewhere in the repo's own documentation, and makes it harder to reconstruct "who changed what, when" during an incident review — a standard expectation for a healthcare platform's admin actions.
**Effort:** Low (same pattern, four more call sites).

### BUG-16 — Several destructive/consequential admin actions have no confirmation step
**Location:** User role change / deactivate (`x/control/(panel)/users/page.tsx:46-70` — immediate PATCH on click), assessment visibility toggle (`x/control/(panel)/assessments/page.tsx:28-34`), clinical note delete (`patients-content.tsx:179-181`). Contrast with announcement delete and package delete, which correctly show a confirmation dialog.
**Effort:** Low (reuse the existing confirmation-dialog pattern from announcements/packages).

### BUG-17 — Admin users list has no pagination, relies on a hard `limit(200)`
**Location:** `app/api/admin/users/route.ts:29` — the users table loads at most 200 rows with no "load more"/pager, unlike the Results page which is correctly paginated (`PAGE_SIZE = 100` with UI controls). Beyond 200 users, the admin simply cannot see everyone.
**Effort:** Low-Medium (reuse the Results page's pagination pattern).

### BUG-18 — Orphaned/dead API endpoints and pages
| Item | Evidence | Status |
|---|---|---|
| `POST /api/score-assessment` | No UI caller found anywhere in the app | Dead — a public, unauthenticated scoring-preview endpoint with no product surface using it |
| `POST /api/packages/[id]/interpret` | Implemented; `compute` route uses a separate rule-based narrative generator instead; no UI calls `interpret` | Dead |
| `app/(app)/admin/kpi-dashboard` | Fully implemented, `requireAdmin()`-gated, but linked from no sidebar/nav anywhere | Functionally orphaned |
| `app/(app)/admin/settings` | Links-only hub, duplicates `/x/control` panel, has no admin gate (see Security Report AUTHZ-6) | Should likely be deleted |
| Admin clinician-verification **review UI** | The API (`/api/admin/clinician-verifications`) exists; no page under `app/x/control/**` calls it | Missing, not dead — a real gap, not leftover code |

**Recommended fix:** Either wire these into navigation (kpi-dashboard, clinician-verification UI) or remove them (score-assessment, packages/interpret, admin/settings) to reduce surface area and confusion. Full context in Architecture Report §16 and Workflow findings.
**Effort:** Low (removal) to Medium (building the missing clinician-verification admin UI).

### BUG-19 — Dashboard grammar bug: "Last 1 days" instead of "Last 1 day"
**Location:** `app/(app)/dashboard/page.tsx` — `` `Last ${moods.length} days` `` has no singular/plural handling. Cosmetic, but visible to every patient with exactly one mood log, which will disproportionately be new users on their first day using the product.
**Effort:** Trivial.

---

## Low

### BUG-20 — `lib/rate-limit/redis.ts` is dead code
An Upstash Redis-backed rate limiter exists but is imported nowhere in the codebase; the app-wide rate limiting path is the Postgres RPC (`check_and_record_rate_limit`), which is itself correctly atomic — so this isn't a functional gap, just unused code that should either be wired in (if Redis is meant to reduce DB load at scale) or removed to avoid confusing future maintainers about which system is actually in use.

### BUG-21 — `current_user_role()` SQL function is dormant, unused dead code with a documented footgun
See Database Report §4 — not `SECURITY DEFINER`, exists alongside the correct `get_my_role()`, with an in-repo comment warning against using it. Should be dropped rather than left as a trap for a future migration author.

### BUG-22 — Duplicate skip-to-content links
Both the root layout and the app-shell layout render one — functionally harmless, minor redundant tab stop (see Accessibility Report).

### BUG-23 — KPI dashboard type definitions reference columns/tables that don't exist in any migration
`lib/types/kpi.ts` references `user_type`, `deleted_at`, `login_attempts`, `appointments` — none of which exist in the schema. Some of this is defensively coded (`available?: false`), but it signals the KPI feature was designed against a schema that was never actually built, which will confuse anyone extending the KPI dashboard later without knowing this history.

---

## Summary Counts

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 9 |
| Medium | 9 |
| Low | 4 |

The single highest-leverage fix in this report is **BUG-1** (mobile score integrity) paired with **BUG-3** (crisis notification reliability) — both sit directly on the path between "a patient in crisis" and "a clinician finding out," which is the one failure mode a mental-health platform cannot tolerate at any severity budget. **BUG-2** (the two-model authorization split) is the second-highest priority because it silently breaks a large fraction of the clinician-facing product for any relationship established through the newer, and presumably intended-to-be-primary, consent flow.
