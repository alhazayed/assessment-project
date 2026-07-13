# V Welfare — Accessibility Audit Report

**Audit Date:** 2026-07-13  
**Standard:** WCAG 2.2 Level AA (target)  
**Method:** Static code analysis of ARIA attributes, semantic HTML, keyboard patterns, color/contrast configs, RTL support  
**Note:** Automated axe/Lighthouse scans and screen reader testing were not performed in this environment.

---

## Accessibility Score: 66/100

| WCAG Principle | Score | Status |
|----------------|-------|--------|
| Perceivable | 68/100 | Good fonts/RTL; contrast unverified |
| Operable | 65/100 | Skip link present; keyboard gaps |
| Understandable | 70/100 | Bilingual labels; error messages present |
| Robust | 62/100 | ARIA usage inconsistent |

**Estimated WCAG 2.2 AA Compliance: ~60%** — Not ready for AA certification without remediation.

---

## Strengths

### Skip Navigation
**Location:** `app/layout.tsx` lines 77–80
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute ...">
```
✅ Skip link present — becomes visible on keyboard focus.

### Semantic Language & Direction
**Location:** `app/layout.tsx` line 70
```tsx
<html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
```
✅ Correct `lang` and `dir` attributes for bilingual RTL support.

### Font Loading
- `display: 'swap'` prevents invisible text during font load (WCAG 1.4.4 related)
- Separate Arabic font (Tajawal) for proper Arabic glyph rendering

### Crisis Banner
**Location:** `components/crisis-banner.tsx`
✅ Emergency resources accessible — critical for mental health platform.

### Clinician Pages — Good ARIA Coverage
| Page | ARIA Attributes |
|------|----------------|
| clinician/connect/page.tsx | ~20 aria-* attributes |
| clinician/verification/page.tsx | ~24 aria-* attributes |
| connect/[token]/page.tsx | ~14 aria-* attributes |

### Form Labels
- Auth pages (login, register) have associated labels
- Clinician verification form has explicit labels for file inputs
- Assessment questions render question text as visible labels

### Focus Management
- Skip link focus styling with visible ring
- Sidebar navigation items are focusable links
- Modal/dropdown focus in notification bell (partial)

---

## WCAG 2.2 Criteria Assessment

### Level A Failures

| Criterion | Issue | Location | Fix |
|-----------|-------|----------|-----|
| 1.1.1 Non-text Content | Some icons lack aria-label | sidebar.tsx icon-only buttons | Add aria-label to icon buttons |
| 2.1.1 Keyboard | Assessment option buttons need keyboard test | assessment-content.tsx | Verify Enter/Space activation |
| 2.4.1 Bypass Blocks | ✅ Skip link present | app/layout.tsx | — |
| 3.3.1 Error Identification | Some API errors shown as generic alerts | Various pages | Associate errors with fields |
| 4.1.2 Name, Role, Value | Custom toggle buttons may lack roles | dark-mode-toggle, language-toggle | Add role="switch" or aria-pressed |

### Level AA Failures

| Criterion | Issue | Location | Severity |
|-----------|-------|----------|----------|
| 1.4.3 Contrast (Minimum) | Brand blue on white — unverified ratio | tailwind.config.ts #1D6296 | Medium — measure |
| 1.4.3 Contrast | Dark mode text colors — unverified | dark: classes throughout | Medium |
| 1.4.4 Resize Text | Layout uses rem/tailwind — likely OK | Global CSS | Low |
| 1.4.10 Reflow | Admin tables may require horizontal scroll | /x/control/* | Medium |
| 1.4.11 Non-text Contrast | Focus indicators — partial | Various | Medium |
| 2.4.3 Focus Order | Modal focus trap not verified | notification-bell.tsx | Medium |
| 2.4.6 Headings and Labels | Some admin pages lack h1 | Admin panel pages | Low |
| 2.4.7 Focus Visible | Tailwind focus: classes present on skip link | Inconsistent elsewhere | Medium |
| 3.2.4 Consistent Identification | Two admin nav systems | /x/control vs /admin | Low |
| 4.1.3 Status Messages | No aria-live regions for async updates | Notifications, form submits | High |

---

## Keyboard Navigation

| Component | Tab Order | Enter/Space | Escape | Status |
|-----------|-----------|-------------|--------|--------|
| Skip link | ✅ First focusable | ✅ | N/A | ✅ |
| Sidebar nav | ✅ | ✅ | N/A | ✅ |
| Auth forms | ✅ | ✅ Submit | N/A | ✅ |
| Assessment options | ⚠️ Unverified | ⚠️ | N/A | Needs test |
| Notification dropdown | ⚠️ | ⚠️ | ⚠️ No trap verified | Needs test |
| Dark mode toggle | ⚠️ | ⚠️ | N/A | Add role |
| Language toggle | ⚠️ | ⚠️ | N/A | Add aria |
| Admin data tables | ⚠️ | N/A | N/A | Row actions may not be keyboard accessible |
| Mobile menu | ✅ | ✅ | ⚠️ | landing-mobile-menu.tsx |
| Modal dialogs | ❌ None identified | — | — | N/A |

---

## Screen Reader Compatibility

### Expected Behavior
- Page title via Next.js metadata ✅
- Route changes announced via page title change ✅ (default Next.js)
- Form field labels associated ✅ (auth pages)
- Assessment progress — ⚠️ no aria-valuenow on progress bar
- Real-time messages — ❌ no aria-live region for new messages
- Notification bell count — ⚠️ badge may not announce count
- High-risk alerts — ❌ no aria-live for crisis content post-assessment

### Recommended aria-live Regions
```tsx
// Messages page — announce new messages
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {latestMessageAnnouncement}
</div>

// Assessment result — announce score
<div aria-live="assertive" role="status">
  {resultAnnouncement}
</div>

// Notification bell — announce unread count changes
<span aria-live="polite">{unreadCount} unread notifications</span>
```

---

## Color & Contrast

| Element | Colors | Estimated Ratio | WCAG AA |
|---------|--------|-----------------|---------|
| Primary button | #1D6296 on white | ~5.5:1 (estimated) | ✅ Likely pass |
| Body text | gray-900 on white | ~15:1 | ✅ |
| Muted text | gray-500 on white | ~4.6:1 | ⚠️ Borderline |
| Dark mode text | gray-100 on gray-900 | Unverified | ⚠️ |
| Error text | red-600 on white | Unverified | ⚠️ |
| Severity badges | Various colors | Unverified | ⚠️ |
| Chart colors (recharts) | Default palette | May fail for colorblind | ⚠️ |

**Action Required:** Run automated contrast audit (axe, Lighthouse) on all pages in both light and dark modes.

---

## RTL Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| Document direction | ✅ | `dir="rtl"` on html |
| Logical properties | ✅ Partial | `focus:start-4` on skip link |
| Icon mirroring | ⚠️ | Chevron/arrow icons may not flip |
| Form layout | ✅ | Tailwind handles most cases |
| Sidebar position | ⚠️ | Verify sidebar flips in RTL |
| PDF export | ❌ | English LTR only |
| Mobile RTL | ✅ | useIsRTL hook |

---

## Form Accessibility

| Form | Labels | Error Association | Required Fields | Instructions |
|------|--------|-------------------|-----------------|--------------|
| Login | ✅ | ⚠️ Generic | ✅ | — |
| Register | ✅ | ✅ Inline | ✅ | Password rules shown |
| Onboarding | ✅ | ⚠️ | ✅ | Step instructions |
| Clinician verification | ✅ Good | ⚠️ | ✅ | File type guidance |
| Assessment | ✅ Question text | N/A | Implicit all required | Progress shown |
| Admin user edit | ⚠️ | ⚠️ | ⚠️ | — |
| Connect flow | ✅ Good ARIA | ⚠️ | ✅ | — |

**Missing:** `aria-describedby` linking fields to error messages on several forms.

---

## Mobile Accessibility (Expo)

| Aspect | Status |
|--------|--------|
| Touch target size (44×44) | ⚠️ Some buttons may be small |
| Screen reader (TalkBack/VoiceOver) | ⚠️ Not verified |
| accessibilityLabel on TouchableOpacity | ⚠️ Inconsistent |
| accessibilityRole | ⚠️ Missing on most elements |
| Color contrast | ⚠️ Same palette as web — unverified |
| RTL layout | ✅ useIsRTL implemented |
| Emergency screen | ✅ Important resource — verify labels |

---

## Motion & Animation (WCAG 2.3)

| Check | Status |
|-------|--------|
| prefers-reduced-motion media query | ❌ Not implemented |
| Auto-playing animations | ✅ None identified |
| Flashing content | ✅ None |
| Assessment progress animation | ⚠️ Should respect reduced motion |

**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Healthcare-Specific Accessibility

| Requirement | Status | Notes |
|-------------|--------|-------|
| Crisis/emergency info accessible | ✅ crisis-banner, mobile emergency | |
| Assessment disclaimers visible | ✅ | Before/during assessment |
| High-risk result handling | ⚠️ | No assertive aria-live for crisis results |
| Informed consent readable | ✅ | Onboarding consent step |
| Plain language | ✅ | Bilingual plain language |
| Cognitive load | ⚠️ | Assessment pages long — progress helps |

---

## Accessibility Issues by Priority

### Critical
None — no complete blockers for basic use, but high-risk result announcement gap is ethically important.

### High

| ID | Issue | Location | WCAG | Effort |
|----|-------|----------|------|--------|
| A11Y-H01 | No aria-live for new messages | messages/page.tsx | 4.1.3 | 2h |
| A11Y-H02 | No aria-live for assessment results (esp. high-risk) | assessment-content.tsx | 4.1.3 | 2h |
| A11Y-H03 | Color contrast unverified | Global | 1.4.3 | 4h |
| A11Y-H04 | Icon-only buttons missing aria-label | sidebar.tsx, admin-nav | 1.1.1, 4.1.2 | 3h |
| A11Y-H05 | No prefers-reduced-motion | globals.css | 2.3.3 | 1h |

### Medium

| ID | Issue | Location | Effort |
|----|-------|----------|--------|
| A11Y-M01 | Notification dropdown focus trap | notification-bell.tsx | 3h |
| A11Y-M02 | Assessment progress bar missing aria-valuenow | assessment-content.tsx | 1h |
| A11Y-M03 | Admin tables not keyboard navigable | /x/control/* | 8h |
| A11Y-M04 | Error messages not linked via aria-describedby | Auth forms | 4h |
| A11Y-M05 | Dark mode toggle needs role="switch" | dark-mode-toggle.tsx | 1h |
| A11Y-M06 | Chart data not available in text alternative | insights, admin | 4h |
| A11Y-M07 | PDF reports English-only, no accessibility tags | /api/reports | 8h |
| A11Y-M08 | Mobile TouchableOpacity missing accessibilityLabel | mobile/app/* | 8h |

### Low

| ID | Issue | Location |
|----|-------|----------|
| A11Y-L01 | Some admin pages missing h1 | Admin panel |
| A11Y-L02 | RTL icon mirroring | Various |
| A11Y-L03 | Skip link target #main-content — verify id exists on all layouts | layouts |
| A11Y-L04 | Language toggle needs aria-label | language-toggle.tsx |

---

## Testing Recommendations

1. **Automated:** Integrate axe-core in CI (eslint-plugin-jsx-a11y already via eslint-config-next)
2. **Manual keyboard:** Tab through every page — verify focus order and visibility
3. **Screen readers:** Test with NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android)
4. **Contrast:** Stark or Lighthouse contrast audit on all color combinations
5. **RTL:** Full keyboard + screen reader pass in Arabic mode
6. **Mobile:** VoiceOver/TalkBack on Expo app

---

## Final Accessibility Verdict

The platform has **foundational accessibility features** (skip link, lang/dir, bilingual fonts, crisis resources, good ARIA on clinician pages) but falls short of **WCAG 2.2 AA** due to missing live regions, unverified contrast, incomplete keyboard support on admin tables, and no reduced-motion support.

For a mental health platform serving vulnerable users, **high-risk assessment result announcement (A11Y-H02)** should be treated as a priority ethical requirement, not just compliance.

**No accessibility changes applied — awaiting approval.**
