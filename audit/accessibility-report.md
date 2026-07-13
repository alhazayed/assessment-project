# V Welfare — Accessibility Report

**Audit date:** 2026-07-13
**Standard:** WCAG 2.2 AA
**Method:** Static code review (markup, ARIA, Tailwind color usage). No screen‑reader / automated axe run was possible here; contrast findings are estimated from hex tokens and must be verified with a contrast checker and manual AT testing (VoiceOver/NVDA/TalkBack).

Severity key: **Critical / High / Medium / Low**.

---

## 0. Executive Summary

The foundation is above average (global skip links, `:focus-visible`, notification panel with focus trap + `aria-expanded` + live region, `lang`/`dir` on `<html>`, `aria-current` nav). But several **interactive controls are not real controls or lack accessible names**, form labels are frequently unassociated, status messages lack `role="alert"`, and the ADHD tool is untranslated for Arabic. **WCAG 2.2 AA is not yet met.**

**Accessibility Score: 58/100.**

---

## 1. Critical

- **A11Y‑C1: Register "terms" checkbox is a clickable `<div>`** inside a `<label>` — no `<input type="checkbox">`, not keyboard‑operable, no role/state (`app/(auth)/register/page.tsx:344-357`). Blocks keyboard/AT users from a **required legal consent**. WCAG 4.1.2, 2.1.1. *Fix: real checkbox.* *0.5–1h.*
- **A11Y‑C2: ADHD Zone Checker English‑only** (ignores `lang`) — an entire clinical tool inaccessible in the user's language (`components/adhd-zone-checker.tsx:219,270-273`). WCAG 3.1.1/3.1.2. *Fix: i18n.* *(shared with UI‑C3).*
- **A11Y‑C3: Crisis banner lacks `role="alert"`/`aria-live`** so AT users may miss critical safety info (`components/crisis-banner.tsx:42-83`). WCAG 4.1.3. *0.5h.*
- **A11Y‑C4: Assessment answer buttons have no selected state for AT** — no `role="radio"`/`aria-checked`/`aria-pressed`, no fieldset/legend grouping (`app/(app)/assessments/[id]/assessment-content.tsx:425-445`). Users can't perceive their selection. WCAG 4.1.2/1.3.1. *2–3h.*

---

## 2. High

- **A11Y‑H1: Profile form labels not associated** with inputs (no `htmlFor`/`id`) throughout `profile/page.tsx:347-388`. WCAG 1.3.1/3.3.2.
- **A11Y‑H2: Mood range sliders' labels not wired** to the `<input type="range">` (`mood/mood-content.tsx:153-164`); no `aria-valuetext`. WCAG 1.3.1/4.1.2.
- **A11Y‑H3: Icon‑only buttons without accessible names** — messages send (`messages/page.tsx:284-291`), journal close (`journal/page.tsx:87-93`), patients download/close (`patients-content.tsx:343-352`). WCAG 4.1.2.
- **A11Y‑H4: Clickable `<tr>` rows** with `onClick` but no keyboard handler/role (`patients-content.tsx:283-287`). WCAG 2.1.1.
- **A11Y‑H5: Form errors mostly lack `role="alert"`** (login `:157-160`, mood/journal/profile) so failures aren't announced. WCAG 4.1.3.
- **A11Y‑H6: `aria-label`s hardcoded English** on dark‑mode toggle/notification bell/password toggle even in Arabic (`dark-mode-toggle.tsx:28`, `notification-bell.tsx:149`, `login/page.tsx:210`). WCAG 3.1.2.
- **A11Y‑H7: Mobile menus lack focus trap** — landing drawer and sidebar backdrop close only on click, unlike the (good) notification bell (`landing-mobile-menu.tsx:31-94`, `sidebar.tsx:255-260`). WCAG 2.4.3.
- **A11Y‑H8: Duplicate `<h1>`** on auth pages at large screens (brand panel + form) (`(auth)/layout.tsx:41-42` + `login/page.tsx:148-149`). WCAG 1.3.1.

---

## 3. Medium

- **A11Y‑M1: Color‑only mood calendar cells** with `title` tooltip only — no text alternative (`insights/page.tsx:177-182`). WCAG 1.4.1.
- **A11Y‑M2: Progress bars lack name/value** (assessment progress, mood `ScoreBar`) — no `role="progressbar"`/`aria-valuenow` (`assessment-content.tsx:391-393`, `mood-content.tsx:16-17`). WCAG 1.1.1/4.1.2.
- **A11Y‑M3: Emoji as meaningful content** in mood UI without text equivalents (`mood-content.tsx:108-110`). WCAG 1.1.1.
- **A11Y‑M4: Contrast concerns** (verify): `--text-muted` (#6B7A87) at 10–13px (`.section-label`, insights `text-gray-400`); footer disclaimer `#2E4A62` on `#0E1A26` (`page.tsx:346-347`); auth stat labels `#6CA8CC` on navy; light‑only severity badge text (`globals.css:307`). Several likely fail 4.5:1. WCAG 1.4.3.
- **A11Y‑M5: Admin panel layout missing skip link + `id="main-content"`** (`x/control/(panel)/layout.tsx:7-11`).
- **A11Y‑M6: Skip‑link focus style** (`focus:bg-white focus:text-blue-700`, `app/layout.tsx:77-80`) may fail non‑text contrast in dark mode. WCAG 1.4.11.

---

## 4. Low / Positives

**Positives:** global skip links (`layout.tsx:77-82`, `(app)/layout.tsx:27-32`); global `:focus-visible` (`globals.css:126-130`); notification panel focus trap + Escape + `aria-expanded` + live region (`notification-bell.tsx:98-157`); BrandLogo alt text; login labels + `aria-describedby`; sidebar `aria-current="page"`; language toggle `aria-label`; bilingual crisis dismiss label; clinician verification form `htmlFor` + `role="alert"`; journal share uses a real checkbox.

---

## 5. Keyboard / Screen‑Reader / RTL Checklist (to verify manually)

| Check | Status (static) |
|---|---|
| Keyboard operable (all interactive elements) | ⚠ fails on div‑checkbox, clickable rows |
| Visible focus states | ✔ global, ⚠ verify contrast in dark |
| Form labels/associations | ⚠ profile/mood gaps |
| Status messages announced | ⚠ most errors lack `role="alert"` |
| Accessible names on controls | ⚠ icon‑only buttons |
| Heading order | ⚠ duplicate h1, inconsistent sizes |
| `lang`/`dir` + parts localized | ✔ root; ⚠ ADHD tool + aria labels |
| Color contrast AA | ⚠ several suspect combos |
| Focus management in overlays | ✔ bell; ⚠ menus/drawers |

---

## 6. Prioritized Remediation

| Priority | Items | Effort |
|---|---|---|
| P0 | A11Y‑C1–C4 | 4–7h |
| P1 | A11Y‑H1–H8 | 10–16h |
| P2 | A11Y‑M1–M6 + full axe + AT pass | 10–16h + testing |

**Accessibility verdict:** ⚠ Not WCAG 2.2 AA compliant yet. P0/P1 are achievable quickly; budget a manual AT + automated axe pass before certifying.
