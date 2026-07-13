# V Welfare Accessibility Audit

**Target:** WCAG 2.2 AA  
**Static accessibility score:** **61/100**  
**Conformance claim:** **Not conformant / not certifiable**

## Scope and limitations

All web/mobile UI source was reviewed for semantic controls, labels, keyboard behavior, focus, announcements, RTL, contrast risks, and responsive behavior. No formal axe/Lighthouse run, screen-reader session, computed-color measurement, switch-control test, or 400% zoom test was possible from this checkout. A WCAG conformance statement must not be issued until manual and automated testing is complete.

## Existing strengths

- Skip-to-content link: `app/layout.tsx:77-82`.
- Global `:focus-visible`: `app/globals.css:125-130`.
- Root `lang` and `dir`: `app/layout.tsx:70`.
- Auth fields generally use labels and error associations.
- Sidebar uses `aria-current`.
- Notification bell includes accessible name, expanded state, live announcements, Escape handling, and focus management.
- Verification forms include labels and alert semantics.
- Reduced visual complexity in one-question assessment flow.

## Critical findings

### A11Y-01 — Registration agreement is not keyboard/AT operable

**WCAG:** 2.1.1 Keyboard, 3.3.2 Labels, 4.1.2 Name/Role/Value  
**Location:** `app/(auth)/register/page.tsx:344-351`

A clickable `div` emulates a checkbox without native focus, state, or form semantics.

**Fix:** `<input type="checkbox" required>` with explicit label, visible focus, error association, and document-version evidence.

**Effort:** 2–4 hours.

### A11Y-02 — Journal cards are pointer-only controls

**WCAG:** 2.1.1, 2.4.7, 4.1.2  
**Location:** `app/(app)/journal/page.tsx:162-166`

Clickable `div` elements open entries without keyboard behavior or button semantics.

**Fix:** use button/link semantics and expose expanded state.

**Effort:** 2–4 hours.

### A11Y-03 — Mobile app has no explicit accessibility metadata

No `accessibilityLabel` or `accessibilityRole` usage was found across mobile TSX. Icon-only touch targets, password toggles, send buttons, tabs, and settings controls are therefore unreliable for VoiceOver/TalkBack.

**Fix:** inventory every touchable, apply labels/roles/states/hints, test dynamic type, focus order, and screen readers.

**Effort:** 16–32 hours plus device testing.

## High findings

| ID | WCAG | Location | Problem | Effort |
|---|---|---|---|---:|
| A11Y-04 | 4.1.2 | messages send button `:284-291` | icon-only, no accessible name | 1h |
| A11Y-05 | 4.1.2 | journal editor close `:87-93` | unlabeled X button | 1h |
| A11Y-06 | 1.3.1, 3.3.2 | profile fields `:347+` | labels lack `htmlFor`; inputs lack IDs | 3–6h |
| A11Y-07 | 1.3.1, 3.3.2 | mood sliders `:153-164` | labels not programmatically associated | 2–4h |
| A11Y-08 | 4.1.2 | assessment options `:425-445` | selected state not exposed | 2–4h |
| A11Y-09 | 1.3.1, 4.1.2 | assessment/dashboard progress | no progressbar role/value | 2–4h |
| A11Y-10 | 2.4.3, 4.1.2 | landing mobile drawer `:31-42` | no dialog semantics/focus trap | 3–5h |
| A11Y-11 | 4.1.3 | message thread `:252-265` | new messages not announced | 2–4h |
| A11Y-12 | 3.1.2 | ADHD checker | English content under Arabic page language | 8–16h + review |

## Medium findings

- Dynamic API/form errors often lack `role="alert"` or a live region.
- Assessment loading spinner lacks `aria-busy`.
- Duplicate skip links appear in root and app layouts.
- Admin drawer direction/focus behavior is not RTL-correct.
- Table heading alignment is physically left-based.
- Select chevrons and directional icons are not consistently mirrored.
- Hardcoded light severity badges require measured contrast in dark mode.
- Touch target dimensions are not systematically enforced.
- Timeouts/session expiry do not provide accessible warning or extension controls.
- Charts do not consistently expose equivalent tabular summaries.

## WCAG principle assessment

### Perceivable

**Partial fail.** Text structure is generally sound, but progress, charts, dynamic messages, and control state are not consistently exposed. Contrast is unverified and hardcoded dark-mode gaps increase risk.

### Operable

**Fail.** Registration agreement, journal cards, and mobile touch controls lack keyboard/AT semantics. Drawer focus handling is incomplete.

### Understandable

**Partial fail.** Auth errors are relatively clear, but bilingual coverage is incomplete and some destructive confirmations are English-only. Clinical content needs human-reviewed Arabic parity.

### Robust

**Fail.** Several controls use `div`/icon implementations without name, role, value, or state. Mobile accessibility APIs are largely unused.

## RTL and language accessibility

Strengths:

- document language/direction set at root;
- Arabic font stack;
- many patient pages use bilingual translations.

Failures:

- English-only ADHD clinical content;
- admin login/KPI portions;
- physical left/right CSS in navigation, tables, selects, and icons;
- untranslated accessible labels on toggles;
- no evidence of Arabic screen-reader pronunciation testing.

## Cognitive and mental-health considerations

Healthcare usability should additionally provide:

- plain-language explanations and non-diagnostic framing;
- consistent emergency escalation;
- predictable navigation and no surprise data sharing;
- ability to pause/resume long assessments;
- explicit save status;
- calm motion and reduced-motion support;
- clear distinction between AI output and clinician-reviewed information;
- no color-only severity meaning.

The assessment resume pattern and crisis banner are positive. AI provenance and clinician review status need stronger presentation.

## Required test matrix

### Automated

- axe on every public/authenticated template;
- eslint JSX accessibility rules;
- contrast checks in light/dark, English/Arabic;
- accessible-name snapshot for forms/icon buttons.

### Manual web

- keyboard-only full workflows;
- NVDA + Firefox/Chrome;
- VoiceOver + Safari;
- 200% and 400% zoom;
- reflow at 320 CSS px;
- high contrast/forced colors;
- reduced motion;
- session expiry and error recovery.

### Mobile

- VoiceOver and TalkBack;
- dynamic type/font scaling;
- switch control;
- orientation where supported;
- software keyboard and safe-area behavior;
- accessible notifications.

## Remediation order

1. Native registration consent.
2. Keyboard semantics for journal and all clickable cards.
3. Accessible names for icon buttons.
4. Labels/IDs for profile and mood controls.
5. Progress and selection states.
6. Drawer/dialog focus.
7. Mobile accessibility inventory.
8. Arabic clinical translation and RTL audit.
9. Contrast and chart alternatives.
10. Automated accessibility gate in CI.

## Verdict

WCAG 2.2 AA release readiness: **FAIL**. Critical workflows contain keyboard and name/role/value failures, and the mobile app lacks an accessibility implementation baseline.

