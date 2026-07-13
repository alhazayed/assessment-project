# V Welfare UI and Workflow Audit

**UI/UX score:** **68/100**  
**Assessment:** complete static page/component/mobile review plus public production route probes

## Scope note

All TSX/JSX/CSS files in this checkout were reviewed. Public production routes were verified to return successfully. Authenticated patient, clinician, admin, payment, and destructive workflows were not executed against production. Production is 45 commits ahead, so branch-only visual defects require confirmation on the production commit.

## Page inventory

### Public/auth

`/`, `/clinicians`, `/contact`, `/privacy`, `/terms`, `/sample-result`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/connect/[token]`, `/connect/[token]/accept`.

### Patient

`/dashboard`, `/assessments`, `/assessments/[id]`, `/packages`, package detail/result, `/mood`, `/journal`, `/insights`, `/messages`, `/profile`, `/patient/clinicians`, `/adhd-zones`.

### Clinician

`/patients`, `/clinician/connect`, `/clinician/verification`, shared `/messages`.

### Admin/research

`/x/control/overview`, analytics/research, users, assessments, packages, results, risk, platform, announcements, audit; separate legacy `/admin/settings` and KPI dashboard.

### Mobile

Expo auth/onboarding, dashboard, assessments/results, resources, profile/settings, mood, journal, messages, AI, emergency, privacy/terms.

## Design strengths

- Central design tokens and reusable classes in `app/globals.css`.
- Strong patient-facing card, form, empty-state, and error patterns.
- Root `lang`/`dir`, Arabic font support, and broad bilingual copy.
- Dark mode anti-flash script and extensive dark selectors.
- Skip link and visible focus baseline.
- Assessment flow supports resume and one-question focus.
- Crisis banner provides emergency direction without presenting the app as diagnosis.

## Critical/high UI findings

### UI-01 — Clinician messages are not mobile responsive

`app/(app)/messages/page.tsx:190-192` uses fixed `w-64` plus `h-screen`. Master/detail content is not converted into a small-screen picker.

**Impact:** a core clinician/patient communication flow can become unusable on phones.

**Fix:** responsive conversation list route/sheet, safe-area-aware height, sticky composer, keyboard handling, and tested long Arabic content.

**Effort:** 8–12 hours.

### UI-02 — Registration terms control is a non-native checkbox

`app/(auth)/register/page.tsx:344-351` uses a clickable `div`.

**Impact:** keyboard and assistive-technology users cannot reliably provide informed agreement; this is also a consent-evidence risk.

**Fix:** native required checkbox with label, document version, timestamp, and linked terms/privacy.

**Effort:** 2–4 hours.

### UI-03 — Arabic feature parity is incomplete

`components/adhd-zone-checker.tsx:8-107,219` accepts `lang` but serves English-only content. Admin login/KPI screens and portions of admin chrome are also English/LTR-centric.

**Impact:** misleading bilingual promise, unsafe comprehension for mental-health guidance.

**Fix:** clinically reviewed Arabic translations and RTL QA; do not machine-translate clinical content without review.

**Effort:** 12–24 engineering/content hours plus clinical translation review.

### UI-04 — Connected clinician workflow does not unlock clinical tools

The new consent relationship does not update the legacy assignment used by messages, notes, assignments, and reports.

**Impact:** users complete connection/approval and encounter empty or blocked screens.

**Fix:** unify relationship source of truth before UI polish; show precise status and permission reasons.

**Effort:** architecture fix 24–40 hours across DB/API/UI.

### UI-05 — Payment UI cannot be certified from this branch

Local source has no Stripe checkout/payment flow, while live database has payment tables and production source is ahead.

**Impact:** real-payment requirements—price authority, retries, cancellation, receipts, refunds, entitlement—are unverified.

**Fix:** audit production source and run Stripe test-mode E2E with webhook evidence.

**Effort:** 8–16 audit/test hours after source reconciliation.

## Responsive/mobile findings

| ID | Location | Finding | Effort |
|---|---|---|---:|
| UI-06 | patients master/detail | hardcoded light styles and dense panel need phone/tablet validation | 6–10h |
| UI-07 | admin navigation | drawer always enters from left; incorrect in RTL | 2–4h |
| UI-08 | sample result header | CTAs do not collapse cleanly on narrow screens | 2–3h |
| UI-09 | mood trigger chips | wrapping can become dense on narrow Arabic layouts | 2–3h |
| UI-10 | mobile tab structure | mood/journal/messages screens exist but navigation parity is unclear | 4–8h |
| UI-11 | mobile messages | uses `recipient_id`, unlike web schema fields | 6–10h |

## Dark mode and consistency

Hardcoded light surfaces remain in:

- `app/error.tsx:23-29`;
- admin KPI dashboard;
- clinician patients list;
- ADHD zone cards;
- package development banner;
- portions of crisis banner and severity badges.

Admin functionality is split between `/x/control/*` and `/admin/*`, with different styling and authorization. Consolidation should follow authorization remediation.

## Loading, empty, and error states

Good coverage exists on assessments, dashboard, messages, journal, mood, profile, and admin risk. Weaknesses:

- many loading states are plain text without `aria-busy`;
- dynamic failures are inconsistently announced;
- payment/upload retry states are absent locally;
- global error is light-only;
- profile delete uses an English-only native confirm;
- notification middleware references `/notifications`, but this checkout has no page.

## Patient workflow audit

| Step | Status | Evidence/issue |
|---|---|---|
| Signup | Implemented, **security fail** | role metadata escalation |
| Verification | Route implemented | live configuration not fully certified |
| Profile/onboarding | Implemented | demographics and consent captured |
| Assessments | Web strong | guest schema conflict; mobile bypass |
| Results/history | Implemented | package/report paths exist |
| Appointments | **Absent** | no scheduling model/UI found |
| Payments | Not in checkout | live schema only |
| Messaging | Implemented | relationship model disconnect/mobile layout |
| Packages | Feature flagged | payment entitlement unverified |
| Data export/delete | Implemented | export hardening needed |

## Clinician workflow audit

| Step | Status | Issue |
|---|---|---|
| Registration | Implemented | role trust is unsafe |
| Email verification | Partial | config/state mismatch |
| Profile completion | Implemented |
| License verification | Record workflow exists |
| Certificate upload | **Not implemented** | URL array only |
| Admin approval | Implemented | API bypasses admin HMAC |
| Dashboard | Generic/shared; no complete clinician dashboard |
| Appointments | **Absent** |
| Assessments | Assignment UI/API exists | broad read policy and legacy relation |
| Messaging | Implemented | mobile/responsive and relationship issues |
| Notifications | Split systems |
| Reports | clinician export permission is not integrated |

## Admin workflow audit

| Feature | Status |
|---|---|
| Dashboard/analytics | Present; aggregation scalability concerns |
| Users/roles | Present; initial role path is unsafe |
| Clinicians/certificates/approvals | Present; no real upload control |
| Notifications | Present but split |
| Assessments/packages/results/risk | Present |
| Payments | absent in checkout; cannot certify |
| Exports | Present; re-identification/formula risks partially handled |
| Research | admin analytics only; no governed research workflow |
| Settings/flags | duplicated across two admin areas |
| Audit | present |

## Research workflow

There is no researcher role, protocol approval, study consent, cohort freeze, purpose limitation, de-identification review, or controlled export workflow. Admin cross-tabs should not be marketed or treated as a compliant research platform.

## Public SEO/brand observations

Production `/`, auth, clinicians, contact, legal, and sample-result routes returned 200. Logo and OG image returned 200 in production, although assets are absent from this checkout. The sitemap omits `/clinicians` and `/contact` despite both being public.

## Required device/browser validation

Static review cannot certify:

- iPhone Safari, Android Chrome;
- iPad/tablet;
- desktop Chrome, Edge, Firefox, Safari;
- virtual keyboard and safe areas;
- 200%/400% zoom;
- Arabic screen readers and dynamic type;
- reduced motion;
- payment SDK/browser redirects.

These must be executed against a production-equivalent build after critical security fixes.

## UX release blockers

1. Registration consent control.
2. Mobile web messaging.
3. Broken clinician relationship-to-tools continuity.
4. Incomplete Arabic clinical feature parity.
5. Uncertified payment and upload experiences.
6. Missing appointments despite stated workflow expectation.

