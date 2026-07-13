# V Welfare — Accessibility Audit Report (WCAG 2.2 AA)

**Audit date:** 2026-07-13
**Method:** Source-level review against WCAG 2.2 AA success criteria (no automated axe-core/Lighthouse run was performed in this session — no live URL was available; findings are derived from reading the actual JSX/CSS with file:line evidence). This is a **code-review-based accessibility audit**, not a certified conformance test — treat as a strong starting point for remediation, and confirm with automated + manual assistive-technology testing before making a conformance claim.

---

## 1. Critical Findings

### ACC-C1 — [CRITICAL] ADHD Zone Checker is entirely English, ignoring the app's bilingual requirement
```219:components/adhd-zone-checker.tsx
export default function ADHDZoneChecker({ lang }: { lang: 'en' | 'ar' }) {
```
The `lang` prop is accepted but **never used** anywhere in the component — all copy (zone names, instructions, option text) is hardcoded English. For a platform whose core product commitment is bilingual EN/AR support, an entire clinical self-regulation tool being English-only for Arabic-speaking users is both an accessibility (WCAG 3.1.2 Language of Parts) and a product-equity failure — Arabic-speaking patients get a materially degraded version of a mental-health tool.
**Fix direction:** Localize all copy through the existing `lib/i18n.ts` pattern used elsewhere, or gate the route behind a "coming soon in Arabic" notice until localized, rather than silently serving English.
**Effort:** Medium (translation content + wiring).

---

## 2. High Findings

### ACC-H1 — [HIGH] Profile page has zero `htmlFor`/`id` pairing across ~15+ form fields
```347:352:app/(app)/profile/page.tsx
                <label className="label">
                  {t('profile.dob', lang)} <span className="text-red-500">*</span>
                </label>
```
Labels wrap visible text but are never associated with their inputs via `htmlFor`/`id`. Screen reader users cannot reliably determine which label belongs to which field throughout the entire profile form — one of the most-used forms in the product (demographics, emergency contact, medications, consent).
**Fix direction:** Add matching `id`/`htmlFor` pairs to every label/input pair on this page (and audit `app/onboarding/page.tsx`, which has the same defect).
**Effort:** Medium (many fields, mechanical but needs care not to introduce ID collisions).

### ACC-H2 — [HIGH] Registration "I agree to terms" control is not a real checkbox
```344:351:app/(auth)/register/page.tsx
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="mt-0.5 w-5 h-5 rounded ..." onClick={() => setAgreedToTerms(!agreedToTerms)}>
```
A `<div onClick>` inside a `<label>` stands in for `<input type="checkbox">`. It is not operable via the Space key, exposes no `role="checkbox"`/`aria-checked` state to assistive technology, and fails WCAG 4.1.2 (Name, Role, Value) and 2.1.1 (Keyboard). This is on the **account registration form** — a legally significant consent gate (terms acceptance) that must be operable by all users.
**Fix direction:** Replace with a real `<input type="checkbox" checked={agreedToTerms} onChange={...} className="sr-only peer" />` paired with a styled label using `peer-checked:` Tailwind variants, preserving the current visual design.
**Effort:** Low-Medium.

### ACC-H3 — [HIGH] Journal entries are keyboard-inaccessible expandable cards
```162:166:app/(app)/journal/page.tsx
              <div key={entry.id} className="card-hover p-5 cursor-pointer" onClick={() => setExpandedId(...)}>
```
`onClick` on a `<div>` with no `role="button"`, `tabIndex={0}`, or `onKeyDown` handler for Enter/Space. Keyboard-only users cannot expand a journal entry at all.
**Fix direction:** Either convert to a real `<button>` wrapping the card content, or add `role="button" tabIndex={0]` + an `onKeyDown` handler that triggers the same toggle on Enter/Space.
**Effort:** Low per instance.

### ACC-H4 — [HIGH] Clinician patient-list table rows are keyboard-inaccessible
```283:287:app/(app)/patients/patients-content.tsx
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer ..." onClick={() => openPatient(p)}>
```
Same defect as ACC-H3, on a clinician's primary work surface — clinicians who use keyboard navigation (including some clinicians with motor disabilities, a real population for a healthcare product to support) cannot open a patient record at all.
**Fix direction:** Add a "View" button/link within the row instead of relying on row-level click, or add the same `role="button"`/`tabIndex`/`onKeyDown` pattern.
**Effort:** Low.

---

## 3. Medium Findings

### ACC-M1 — Duplicate `<h1>` on desktop auth pages
Both the brand panel (`app/(auth)/layout.tsx:41`) and the login form itself (`app/(auth)/login/page.tsx:148`) render an `<h1>` at `lg+` widths — violates the "one `<h1>` per page" heading-hierarchy convention that screen-reader users rely on for page structure navigation.
**Fix:** Demote the brand panel's `<h1>` to a `<p>` or `<div role="presentation">` styled the same way, or demote the form heading to `<h2>`.

### ACC-M2 — Messages page has no page-level heading at all
Headers render as `<p>` tags, not `<h1>`/`<h2>` — screen-reader users navigating by heading (a primary AT navigation strategy) get nothing on this page.

### ACC-M3 — Several icon-only buttons are missing `aria-label`
| File:Line | Control |
|---|---|
| `app/(app)/journal/page.tsx:87-93` | Close editor (X icon) |
| `app/(app)/messages/page.tsx:284-291` | Send message |
| `app/(auth)/reset-password/page.tsx:77-84` | Show/hide password |
| `components/synthesis-card.tsx:66-68` | Expand/collapse |

### ACC-M4 — Form errors mostly lack `role="alert"`
Login's error is a plain `<div>` (`login/page.tsx:157-160`); contrast with `clinician/connect/page.tsx:719`, which correctly uses `role="alert"`. Screen-reader users on most forms are not proactively notified when a submission fails.

### ACC-M5 — Mood calendar cells rely on `title` attribute only
```177:182:app/(app)/insights/page.tsx
                    <div key={day} title={`${day}: ${label}${score != null ? ` (${score}/10)` : ''}`} ...>
```
`title` tooltips are not reliably exposed to screen readers and are inaccessible to touch/keyboard users entirely (no hover). Mood-by-day data is invisible to non-mouse users on this view.
**Fix:** Add `aria-label` with the same content, and ensure the cell is at minimum focusable/announced if it conveys unique information not available elsewhere.

### ACC-M6 — Profile/onboarding required fields show a visual `*` with no `aria-required`
Contrast with the clinician verification page, which correctly uses `aria-required="true"` — this pattern exists in the codebase but wasn't applied consistently.

### ACC-M7 — Mood range sliders have no programmatic label association
```153:157:app/(app)/mood/mood-content.tsx
                  <label className="label flex items-center gap-1.5 mb-2">...</label>
                  <input type="range" ... />
```
No `id`/`htmlFor` or `aria-labelledby` connecting the label to the slider.

### ACC-M8 — Directional icons are not flipped for RTL
`ChevronRight`/`ArrowRight` are used as literal "next/forward" indicators without an RTL-aware rotation (`rtl:rotate-180` or an icon swap) on `dashboard/page.tsx`, `assessments/page.tsx`, `onboarding/page.tsx`, and `register/page.tsx`. In Arabic (RTL) reading order, a right-pointing arrow for "next" is directionally backwards. One page (`packages/[id]/result/page.tsx`) already does this correctly and should be the reference pattern.

### ACC-M9 — Physical CSS properties instead of logical ones break RTL mirroring
`border-left-width`/`border-left-color`/`border-left` used in `.safety-strip`, `.nav-item-active` (`globals.css:347-348, 418-419`), and `border-l-4` in the ADHD Zone Checker and several cards — should be `border-inline-start-*`/Tailwind's `border-s-*` so the accent border correctly mirrors to the right side in RTL instead of staying pinned to the (now trailing) left.

### ACC-M10 — Select dropdown chevron position is not mirrored for RTL
```288:291:app/globals.css
  .select { @apply input pr-10 appearance-none cursor-pointer; background-position: right 12px center; }
```
No `[dir="rtl"]` override — the chevron will visually overlap Arabic text instead of sitting at the correct (now left) trailing edge.

### ACC-M11 — Color contrast: several muted-text tokens are borderline or failing WCAG AA
| Token/class | Approx. contrast on its typical background | AA requirement | Verdict |
|---|---|---|---|
| `--text-muted` (`#6B7A87` on `#F6F8FA`) | ~4.2:1 | 4.5:1 (normal text) | ⚠️ Fails for body-sized text |
| `--text-icon` (`#8A99A8` on white) | ~3.1:1 | 4.5:1 | ❌ Fails |
| `.section-label` (11px uppercase, `--text-muted`) | ~4.2:1 | 4.5:1 (small text has no exemption) | ❌ Fails |
| `text-gray-400` (used in insights, patients) | ~2.9:1 on white | 4.5:1 | ❌ Fails |
| `.badge-neutral` (`#5A6B7B` on `#F2F5F8`) | ~4.6:1 | 4.5:1 | ✅ Marginal pass |

Dark-mode tokens (e.g., `--text-muted: #8FA3B3` on `#0A1019`) generally pass comfortably — the contrast problem is specific to light mode.
**Fix direction:** Darken `--text-muted` and `--text-icon` in light mode until they clear 4.5:1 against their actual backgrounds (test with a contrast checker against each real background color, not just the page background, since some usages sit on cards/badges with different backgrounds); replace ad hoc `text-gray-400`/`text-gray-500` usages with the corrected token.
**Effort:** Low-Medium (CSS variable change + find/replace of the worst offenders; verify nothing regresses visually).

---

## 4. Low Findings

- Duplicate skip-to-content links (root layout + app-shell layout) create redundant tab stops — not broken, just slightly inefficient.
- Password-visibility-toggle `aria-label` on the auth pages is hardcoded English even when the page is rendered in Arabic (`login/page.tsx:210`).
- Crisis banner content should use `role="alert"` or `aria-live="assertive"` given its safety-critical nature — it currently dismisses correctly but doesn't proactively announce.
- `ml-auto` used instead of the RTL-safe `ms-auto` on the unread-messages badge (`components/unread-messages-badge.tsx:45`).
- Physical `borderRight` inline style on the clinician messages sidebar (`app/(app)/messages/page.tsx:192`) instead of a logical/RTL-aware equivalent.

---

## 5. Positive Findings (Do Not Regress These)

- Skip-to-content links exist and are correctly hidden until focused (`sr-only focus:not-sr-only`).
- `dir`/`lang` correctly set on `<html>` based on active language (`app/layout.tsx:70`).
- Notification bell implements a proper focus trap, `aria-live`, and `aria-modal` (`components/notification-bell.tsx`).
- Clinician verification page is the accessibility reference implementation in this codebase: correct `htmlFor`, `aria-required`, `role="alert"` on errors — this pattern should be copied to the profile and onboarding forms (ACC-H1, ACC-M6).
- Global `:focus-visible` styling is defined and applied app-wide.
- Realtime subscription cleanup (notification bell, messages, unread badge) is implemented correctly with no memory-leak risk found.
- Login/forgot-password have properly paired `htmlFor`/`id` labels and localized error messaging.

---

## 6. RTL Accessibility Summary

RTL support is a genuine strength at the shell level (`dir="rtl"` propagation, sidebar mirroring, notification panel side-flip, typography rules) but has **component-level gaps** that specifically affect Arabic-speaking users' experience: the ADHD tool is entirely unlocalized (ACC-C1), several directional icons and border accents don't mirror (ACC-M8/M9/M10), and one interactive control uses a non-RTL-aware Tailwind spacing utility (`ml-auto`). None of these break the app for Arabic users, but collectively they produce a visibly "translated, not designed for" experience in a product whose value proposition explicitly includes first-class Arabic support.

---

## 7. WCAG 2.2 AA Scorecard (Best-Effort, Code-Review Basis)

| Principle | Score | Rationale |
|---|---|---|
| Perceivable | 58/100 | Color contrast failures (ACC-M11); non-text alternative gaps (tooltip-only mood data, ACC-M5) |
| Operable | 55/100 | Multiple keyboard-inaccessible custom controls (ACC-H2/H3/H4) |
| Understandable | 68/100 | Generally clear language and error messaging where present; heading-hierarchy issues (ACC-M1/M2) |
| Robust | 65/100 | Missing label/id associations and ARIA attributes across several forms (ACC-H1, ACC-M6/M7) |

**Overall Accessibility Score: 61/100**

This is a fixable set of findings — most are low-to-medium implementation effort and localized to specific components rather than systemic architecture problems. Recommend: fix the two keyboard-trap/fake-control issues (ACC-H2, ACC-H3, ACC-H4) first since they represent complete exclusion of a user group from core flows (consent, journaling, clinician patient access), then the profile/onboarding label-association pass (ACC-H1), then the color-contrast token fix (ACC-M11), then the RTL polish items. Follow up with an automated axe-core/Lighthouse pass and, ideally, manual screen-reader testing (VoiceOver + NVDA, in both English and Arabic) once a live/staging environment is available — this static review cannot fully substitute for that.
