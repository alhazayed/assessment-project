# V Welfare Accessibility Report (WCAG 2.2 AA)
**Scope:** static source audit; no assistive-technology, contrast-tool, browser, or device execution. Statuses are risks to validate, not conformance certification.

## Summary
The app contains valuable foundations: a skip link, `focus-visible` styles, RTL direction, labeled login controls, and a relatively well-handled notification overlay. It is not ready to claim WCAG 2.2 AA because core assessment, chart, calendar, navigation, and custom-control semantics are incomplete.

## Priority findings
| Priority | Location | WCAG risk | Required correction | Effort |
|---|---|---|---|---|
| Critical | `assessments/[id]/assessment-content.tsx:421-447` | 1.3.1, 4.1.2 — answer buttons do not expose a single-choice radiogroup | use native radio inputs inside `fieldset`/`legend`, or complete radiogroup keyboard/checked semantics | 4–6 h |
| Critical | assessment/dashboard progress divs | 4.1.2 — progress unavailable to screen readers | add `role=progressbar`, label, min/max/current values | 1–2 h |
| Critical | `insights/page.tsx:177-183` mood heatmap | 1.1.1, 1.4.1, 2.1.1 — color-only, non-keyboard cells | accessible date/score labels, keyboard targets and tabular/list alternative | 4–6 h |
| High | `register/page.tsx:344-357` | 2.1.1, 4.1.2 — terms control is a clickable div | native checkbox with label and error association | 1 h |
| High | app/auth/admin layouts | 2.4.1 — duplicate/broken/missing skip targets | one skip link per shell, matching `main#main-content` in auth and admin | 2–3 h |
| High | messages/journal/icon actions | 2.1.1, 4.1.2 — icon-only/send/interactive divs missing names or keyboard behavior | buttons with names, selected state and keyboard navigation | 3–5 h |
| High | `mental-health-radar.tsx` | 1.1.1 — chart lacks equivalent alternative | visible or toggleable data table and summary | 2–3 h |
| Medium | sidebars/drawers | 2.4.3, 2.4.7 — no demonstrated focus trap/restoration | reusable dialog/drawer focus management | 3–5 h |
| Medium | global styles and tiny text | 1.4.3, 1.4.4 — contrast and 10–11px text unverified | test all token pairs; set 12px minimum body-adjacent text and fix failures | 3–6 h |
| Medium | animations | 2.3.3 / user preference | add `prefers-reduced-motion` styling | 1–2 h |
| Medium | RTL admin nav/CSS | 1.3.2 / usability | replace physical `left`/`border-left` with logical properties and test Arabic keyboard order | 3–5 h |

## Test protocol before release
1. Run axe on every public, patient, clinician and admin page in English and Arabic.
2. Keyboard test: tab order, visible focus, skip link, dialogs/drawers, assessment answers, messaging, delete confirmation.
3. Test NVDA+Firefox and VoiceOver+Safari for login, registration, assessment completion, result, crisis alert and admin role changes.
4. Measure color contrast with actual rendered states, including dark mode, disabled/hover/error/high-risk badges.
5. Test touch targets (minimum 24×24 CSS px under WCAG 2.2, preferably 44×44 for clinical mobile flows) and text zoom to 200%.

Do not treat the presence of ARIA attributes as a substitute for native semantic controls or user testing.
