# V Welfare UI, UX, Mobile and Workflow Report
**Method:** static review of web/mobile route files and components. Browser/device/screen-reader testing remains required.

## Design and route assessment
The web application uses an App Router public/authenticated/admin structure with shared CSS tokens, `next/font`, RTL direction, a responsive sidebar and dark-mode support. The Expo app has independent i18n/theme/auth implementations. This is a useful foundation, but it increases parity risk: web and mobile do not share UI, data, or workflow abstraction.

## High-priority UX findings
| ID | Location | Finding | Recommendation | Effort |
|---|---|---|---|---|
| UI-01 | `app/(app)/messages/page.tsx:190-192` | fixed-width split panel and `h-screen` layout are likely unusable on small web screens | use responsive single-pane/drawer navigation below `lg`, preserve scroll/focus | 6–8 h |
| UI-02 | `patients/patients-content.tsx` | desktop master-detail workflow requires a dedicated small-screen review | introduce patient picker/drawer and test 320–768px | 6–10 h |
| UI-03 | `app/(app)/adhd-zones`, `components/adhd-zone-checker.tsx` | component accepts language but contains English-only labels/questions | provide clinical-review-approved Arabic content or hide route for Arabic until validated | 8–12 h |
| UI-04 | no `loading.tsx` routes; client fetch pages vary between blank/plain loading copy | weak feedback during slow/failing clinical workflows | shared loading/error/empty patterns plus route skeletons | 6–10 h |
| UI-05 | notifications are split between `notifications` and unconsumed `notification_events` | relationship/access workflow alerts may not reach users | consolidate delivery/read model and show status/escalation feedback | 4–6 h |
| UI-06 | direct mobile scoring path | result integrity diverges from web and undermines patient trust | route mobile submissions through server-verified scoring before release | 6–10 h |

## Workflow status
- **Patient:** registration, consent/onboarding, assessment, mood/journal, results, export and clinician management are implemented, but guest submissions can conflict with current DB constraints; deletion is a request log, not demonstrated erasure.
- **Clinician:** verification, access requests/invites, patient list, notes and messages exist. Permission-model drift means UI approval/revocation cannot yet be considered authoritative. No appointment workflow was found.
- **Admin:** broad screens and APIs exist. Clinician-verification API lacks a matching admin panel screen; materialized analytics definitions are invalid; research views lack research-consent safeguards.
- **Payments:** not implemented. No checkout, billing, provider, entitlement or payment schema was found.

## Visual/responsive quality
Strengths: coherent tokens, Arabic font selection, app/sidebar responsive intent, good use of `next/image`, emergency/crisis content, and many labeled auth controls. Risks: admin navigation is physically left-aligned rather than logical RTL; many full client pages produce inconsistent states; charts need compact/mobile representation; tiny 10–11px text risks legibility; no reduced-motion policy was found.

## Required manual QA
Test Chrome, Firefox, Safari, Edge plus iOS/Android/tablet. Exercise network loss, slow 3G, refresh/resume assessment, RTL direction, dark/light/system theme, long Arabic names, 320px mobile width, keyboard-only navigation, and all error/empty/high-risk states. Validate crisis contact numbers with regional clinical governance; a hardcoded or transformed telephone string must not be assumed safe.
