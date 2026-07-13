# V Welfare — UI/UX Audit Report

**Audit date:** 2026-07-13
**Method:** Source-level review of JSX/TSX, `globals.css`, and Tailwind config (no live browser/visual testing was performed in this session — findings are grounded in code evidence with file:line citations). Accessibility-specific findings that overlap with WCAG criteria are summarized here and detailed fully in `accessibility-report.md`.

---

## 1. Loading / Error / Empty States

There is no shared `PageLoading`/`PageError`/`PageEmpty` component in the codebase today (one was proposed in a prior in-repo backlog document but was never implemented) — each page hand-rolls its own pattern, leading to inconsistency.

### UI-H1 — [HIGH] Insights page can spin forever if the user session lookup returns no user
```70:73:app/(app)/insights/page.tsx
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
```
`loading` starts `true` and is never set `false` on the `!user` branch — a legitimate edge case (session expired mid-visit) leaves the user staring at an infinite spinner with no escape except manual navigation.
**Fix:** `if (!user) { setLoading(false); return }`, plus wrap the whole effect body in try/catch to also handle network failure with a retry affordance.
**Effort:** Trivial.

### UI-M1 — [MEDIUM] No `try/catch` around the Insights data fetch
Any Supabase error during load leaves `loading === true` indefinitely with no retry UI — same root cause as UI-H1, broader scope.

### UI-M2 — [MEDIUM] Profile and Messages pages show bare, unstyled loading text
```288:profile/page.tsx / 153:messages/page.tsx
  if (loading) return <div className="p-7" ...>{t('mood.loading', lang)}</div>
```
No spinner/skeleton — inconsistent with the nicer skeleton treatment already used on `journal` and `mood`.

### UI-M3 — [MEDIUM] KPI trend charts show an error message but no retry action
Users on the admin KPI dashboard hit a dead end on error with no way to recover without a full page reload.

### UI-L1 — [LOW] Assessments catalog has no empty state if `allDefinitions` is empty

### Reference: pages doing this well
`journal`, `mood`, SSR `dashboard`, `packages`, `patient/clinicians` (which has its own excellent local `LoadingSkeleton`/`EmptyState` pattern that should be extracted into a shared component and reused everywhere else), and `assessment-content.tsx`.

**Recommendation:** Extract the `patient/clinicians/page.tsx` local loading/empty/error components into `components/ui/page-states.tsx` and roll it out across `insights`, `journal`, `messages`, `mood`, `patients`, `profile`, and the KPI dashboard, replacing the ad hoc per-page implementations.
**Effort:** Medium (one new shared component + ~7 call sites).

---

## 2. Responsive Design (Desktop / Tablet / Mobile)

### UI-H2 — [HIGH] Messages page layout can overflow/double-scroll on mobile
```36:app/(app)/layout.tsx
        className="flex-1 min-w-0 overflow-auto pt-16 lg:pt-0 lg:ms-[248px]"
```
```190:app/(app)/messages/page.tsx
    <div className="flex h-screen max-h-screen overflow-hidden">
```
The messages page's own root claims `h-screen` while it's nested inside a `<main>` that already has 64px of top padding on mobile (`pt-16`) — the two height calculations conflict, risking content extending below the viewport fold with an extra internal scroll region layered on top of the outer page scroll.
**Fix:** Use `h-[calc(100dvh-4rem)]` (matching the `pt-16` offset) on mobile, or restructure the messages page to participate in the normal document flow inside `<main>` rather than claiming its own full-viewport height.
**Effort:** Low-Medium (needs visual verification across breakpoints after the fix).

### UI-H3 — [HIGH] Clinician patients table has no responsive fallback
```257:268:app/(app)/patients/patients-content.tsx
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th ...>  <!-- 6 columns -->
```
No `overflow-x-auto` wrapper and no mobile card-layout alternative — a 6-column table will overflow or force horizontal scroll on phone-width viewports, and this is a clinician-facing, work-critical page (not a marginal one).
**Fix:** Wrap in `<div className="overflow-x-auto">` at minimum; better, add a `sm:hidden` card-list alternative view for narrow screens (a pattern the detail panel already uses elsewhere in the same file — `hidden md:block`).
**Effort:** Medium.

### UI-M4 — [MEDIUM] Clinician messages sidebar is a fixed `w-64` with no mobile collapse
No responsive behavior for the conversation-list sidebar on small screens — it will squeeze the chat pane uncomfortably on phones.

### UI-M5 — [MEDIUM] Auth layout brand panel is a fixed `w-[440px]`
Only shown `lg+` (`hidden lg:flex`), so it's not a mobile bug per se, but worth flagging since it's a large fixed-width element that doesn't scale with very large/small desktop viewports either.

### UI-L2 — [LOW] Admin package scoring editor uses a fixed-column CSS grid
`grid-cols-[60px_60px_1fr_1fr_80px_28px]` in `x/control/(panel)/packages/page.tsx` will overflow on mobile — low priority since this is an admin-only, desktop-expected workflow, but worth a mobile-friendly pass eventually.

### Positive findings
Dashboard and assessments catalog consistently use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` responsive grids; the insights mood calendar correctly wraps in `overflow-x-auto` with a `min-w` floor.

---

## 3. Spacing, Alignment, Typography, Branding — Design System Fragmentation

`globals.css` defines a reasonably complete design system (`.btn-accent`, `.card`, `.badge-*`, `.input`, `.alert-*`, CSS custom properties for text/surface colors), but adoption across the codebase is **partial**, producing visible inconsistency:

| Pattern | Canonical token | Fragmented usage found |
|---|---|---|
| Buttons | `.btn-accent` | Legacy `.btn-primary` alias still used in `in-progress-assessments.tsx`, `adhd-zone-checker.tsx` |
| Cards | `.card` (uses CSS vars, dark-mode aware) | `patients-content.tsx` hardcodes `bg-white border-gray-200` (breaks in dark mode — see Accessibility Report) |
| Text color | `var(--text-primary)` / `var(--text-muted)` | Raw Tailwind `text-gray-900`, `text-gray-500`, `text-gray-400` scattered across `synthesis-card.tsx`, `in-progress-assessments.tsx`, `crisis-banner.tsx`, `patients-content.tsx`, `error.tsx` |
| Badges | `.badge-minimal` / `.badge-mild` / etc. | Inline ad hoc styles in `dashboard/page.tsx`; a separate `badge-info` variant used elsewhere |
| Loading | `.skeleton` | At least 4 different loading treatments across the app (skeleton, plain text, local one-off skeleton components, spinner) |

**Recommendation:** This is not urgent from a compliance standpoint, but it directly affects perceived product quality/trust for a healthcare brand and should be addressed as a dedicated design-system consolidation pass rather than fixed piecemeal — piecemeal fixes on individual pages will keep drifting back out of sync without a shared linting rule (e.g., an ESLint rule or Tailwind plugin flagging raw `text-gray-*`/`bg-white` in favor of the CSS variables) to enforce it going forward.
**Effort:** Medium-High for full consolidation; a `stylelint`/custom ESLint rule to prevent regression is a good low-effort complement.

---

## 4. Dark Mode

Implemented via `darkMode: 'class'` + CSS variable overrides in `.dark`, with an anti-flash inline script before paint. This is architecturally sound. Gaps:

### UI-M6 — [MEDIUM] Severity badges have no dark-mode-adjusted text/background pairing
Light pastel badge backgrounds (`.badge-minimal`, `.badge-mild`, etc.) don't have `.dark` overrides, risking poor contrast for clinically meaningful color-coded information (severity bands) in dark mode — this overlaps with an Accessibility finding since color-coded severity is exactly the kind of information that must remain legible/distinguishable regardless of theme.

### UI-M7 — [MEDIUM] `patients-content.tsx` and `app/error.tsx` hardcode light-only palettes
`bg-white`, `text-gray-900`, `bg-gradient-to-br from-brand-50 via-white to-blue-50` — these will render with poor contrast or a jarring light card on an otherwise dark UI.

### UI-L3 — [LOW] Crisis banner also ignores dark-mode tokens
Lower priority than the badges/error page since the crisis banner has its own bright, deliberately attention-grabbing styling, but should still be verified for contrast in dark mode given its safety-critical content.

### UI-L4 — [LOW] Packages "under development" banner and insights "no mood data" calendar cell use hardcoded hex colors that may be invisible on dark backgrounds

---

## 5. Forms

### UI-H4 — [HIGH] Register page's "I agree to terms" is a styled `<div>` with `onClick`, not a real checkbox
See Accessibility Report ACC-H2 for full detail — this is both a UX and an accessibility defect (not keyboard operable, no `aria-checked`).

### UI-M8 — [MEDIUM] Several forms show required-field asterisks but never wire `aria-required`/`htmlFor` (profile, onboarding, mood sliders)
Visual affordance without the corresponding semantic markup — works for sighted mouse users, breaks for screen-reader and some keyboard users. Full detail in Accessibility Report.

### UI-L5 — [LOW] Register submit button stays enabled when the terms checkbox is unchecked
Validation only fires on submit rather than disabling the button proactively — minor friction, not a blocker.

### UI-L6 — [LOW] Reset-password page surfaces the raw Supabase error message
Inconsistent with the login page's localized, generic error handling.

### Positive findings
Login, register, forgot-password, and reset-password all correctly disable submit buttons during in-flight requests (preventing double-submit), use proper `autoComplete` attributes, and (login/forgot-password) show clear rate-limit messaging.

---

## 6. Navigation

- Skip-to-content links exist at both the root layout and the app-shell layout, which means keyboard users tab through **two** skip links in sequence on authenticated pages — a minor redundancy (Low), not a broken pattern.
- Several fully-implemented pages are unreachable from any sidebar/nav (`/admin/kpi-dashboard`, the admin clinician-verification review flow, which doesn't exist as a UI at all) — this is covered in depth in the Architecture Report §16 and Bug Report, since it's as much a functional gap as a navigation one.
- One notification deep-link points at a route that returns 404 (`/clinician/patients` instead of the real `/patients`) — see Bug Report.

---

## 7. Consistency & Branding

The brand system (logo component, color tokens, Inter/Tajawal font pairing for EN/AR) is applied consistently at the shell level (headers, sidebar, auth layout). The inconsistency findings in §3 are component-level, not brand-identity-level — i.e., the platform "looks like V Welfare" everywhere, but individual list/table/card components don't consistently draw from the same design tokens.

---

## 8. React-Level UI Anti-Patterns (UX-adjacent)

- Click-only interaction on non-interactive elements (journal entry cards, patient table rows) — covered fully in Accessibility Report as keyboard-access failures, but also a plain UX problem: mouse users get a "cursor-pointer" affordance that touch/keyboard users don't get an equivalent for.
- A disabled assessment CTA is rendered as a `<span>` styled like a button rather than a real `<button disabled>` — loses the native disabled/focus/hover semantics browsers give you for free.
- Index-as-key on a couple of chart-label lists (`insights/page.tsx`) — low risk since the lists are stable-length, but worth cleaning up opportunistically.

---

## 9. Summary Scorecard

| Category | Score | Top blocker |
|---|---|---|
| Loading states | 65/100 | Insights infinite spinner; no shared component |
| Responsive design | 68/100 | Messages page height conflict; patients table has no mobile fallback |
| Dark mode | 72/100 | Severity badges, patients page, error page ignore dark tokens |
| Forms | 70/100 | Fake checkbox on register; missing label associations |
| Consistency | 60/100 | Design-token adoption is partial; raw Tailwind gray creeping back in |
| Navigation | 78/100 | A few orphaned pages and one broken deep link, otherwise solid |

**UI/UX Score: 69/100** — a workable, mostly-consistent product with a handful of concrete, fixable defects rather than a systemic design failure. See `accessibility-report.md` for the WCAG-specific subset of these findings and `implementation-roadmap.md` for sequencing against the Critical/High security and data-integrity work, which should take priority over most items in this report.
