# V Welfare — Accessibility Report (WCAG 2.2 AA)

**Audit date:** 2026-07-13  
**Standard:** WCAG 2.2 Level AA  
**Method:** Source review of pages/components; no axe/VoiceOver/TalkBack live pass in this session.

---

## Executive Summary

Foundational a11y exists: skip link, `lang`/`dir` on `<html>`, `aria-current` on nav, many labeled auth/clinician forms, notification `aria-live`. The largest gaps are **assessment answer semantics**, **modal/dialog focus management**, **contrast on muted tokens**, **RTL completeness** (ADHD + admin), and **keyboard access on table rows**.

**Accessibility Score: 58/100**

---

## 1. Strengths (evidence)

| Control | Location |
|---------|----------|
| Skip to main content | `app/layout.tsx`, `app/(app)/layout.tsx` → `#main-content` |
| Document language + RTL | Root layout sets `lang`/`dir` from cookie |
| Nav current page | `components/sidebar.tsx` `aria-current="page"` |
| Auth field labels | Login/register `htmlFor` + wrappers |
| Clinician forms | Connect/verification: `aria-describedby`, `role="alert"` |
| Notifications live region | `notification-bell.tsx` `aria-live="polite"` |
| Email/number LTR in RTL | `globals.css` input rules |

---

## 2. Findings

### Critical / High

| ID | Severity | WCAG | Location | Problem | Fix |
|----|----------|------|----------|---------|-----|
| A11Y-001 | High | 4.1.2 / 1.3.1 | `assessment-content.tsx` | Answer options are plain buttons without radiogroup/`aria-checked`/fieldset | Use `fieldset`/`legend` + `role="radio"` or native radios |
| A11Y-002 | High | 1.3.1 / 4.1.2 | `mood-content.tsx` | Range inputs lack accessible name/value; chips lack `aria-pressed` | Add `aria-valuenow`/`aria-labelledby`; pressed state |
| A11Y-003 | High | 2.1.1 / 2.4.3 | `patients-content.tsx` | Clickable `<tr onClick>` not keyboard operable | Focusable control per row or button in cell |
| A11Y-004 | High | 2.4.3 / 2.1.2 | Modals/panels | No `role="dialog"`, `aria-modal`, focus trap | Native `<dialog>` or focus-trap |

### Medium

| ID | Severity | WCAG | Problem |
|----|----------|------|---------|
| A11Y-005 | Medium | 1.4.3 | `--text-muted` / admin inactive nav may fail contrast |
| A11Y-006 | Medium | 2.5.3 / 3.1.2 | Dark mode toggle aria-label English only |
| A11Y-007 | Medium | 1.3.2 / 2.4.3 | Assessment Prev/Next chevrons not mirrored in RTL |
| A11Y-008 | Medium | 4.1.3 | Some error banners missing `role="alert"` |
| A11Y-009 | Medium | 3.1.1 | ADHD zone checker ignores `lang` — English-only content |
| A11Y-010 | Medium | 1.3.2 | Admin nav fixed LTR; select chevron position not RTL-aware |
| A11Y-011 | Medium | 2.4.4 | Hardcoded sidebar labels (“My Clinicians”, etc.) not in i18n |

### Low

| ID | Severity | Problem |
|----|----------|---------|
| A11Y-012 | Low | Password show/hide aria-labels EN-only on some pages |
| A11Y-013 | Low | Crisis banner dismiss without announcing state change |
| A11Y-014 | Low | Charts (recharts) need text alternatives / data tables |
| A11Y-015 | Low | Mobile emergency styles use physical `borderLeft` |

---

## 3. Keyboard Navigation Matrix (expected)

| Surface | Tab order | Esc | Focus visible |
|---------|-----------|-----|---------------|
| Landing | OK generally | N/A | Depends on browser defaults + Tailwind |
| Auth forms | Good | N/A | Good |
| App sidebar mobile | Drawer; verify focus move into drawer | Should close on Esc (verify) | Check |
| Assessments | Buttons tabbable; semantics weak | N/A | OK |
| Patients table | **Fail** row click | Panel open unclear | Weak |
| Admin tables | Partial | N/A | Partial |

---

## 4. Screen Reader Considerations

- Assessment progress and score announcements should use polite/assertive live regions on submit/result.
- High-risk crisis content must be announced immediately (`role="alert"`).
- PDF download buttons need clear accessible names including assessment identity.
- Chart-only insights fail non-visual users without summaries.

---

## 5. RTL / Internationalization Accessibility

Bilingual support is not only SEO — it is accessibility for Arabic users:

| Area | Status |
|------|--------|
| Root `dir=rtl` | ✅ |
| Sidebar drawer direction | ✅ |
| ADHD content | ❌ English only |
| Admin shell | ❌ LTR layout |
| Global select chevron | ❌ |
| Mixed hardcoded bilingual strings | ⚠️ Drift / QA risk |

---

## 6. Mobile App A11y

- Expo components not audited with React Native Accessibility Inspector in this pass.
- Hidden tabs reduce discoverability for assistive tech users.
- Emergency numbers region mismatch is a **safety** issue beyond classic a11y.

---

## 7. Recommended Remediation Order

| Priority | Item | Effort (hrs) |
|----------|------|--------------|
| P0 | Assessment radiogroup semantics | 4–6 |
| P0 | ADHD Arabic + RTL | 16–24 |
| P1 | Dialog focus traps | 6–8 |
| P1 | Patients table keyboard access | 3–4 |
| P1 | Mood slider ARIA | 2–3 |
| P1 | Contrast audit + token bump | 4 |
| P2 | Admin RTL + language toggle | 4–6 |
| P2 | Select/nav CSS RTL fixes | 2–4 |
| P2 | Live regions on assessment results / crisis | 3 |
| P3 | Chart text alternatives | 6 |

---

## 8. Testing Plan (post-fix)

1. axe DevTools on all public + authenticated primary flows.
2. Keyboard-only pass: register → assessment → result → crisis banner.
3. NVDA/VoiceOver: assessment single-select, mood sliders, messaging.
4. RTL visual + SR pass in Arabic.
5. Mobile VoiceOver/TalkBack for emergency + assessment.

---

## Accessibility Scorecard

| Domain | Score |
|--------|-------|
| Perceivable | 60 |
| Operable | 55 |
| Understandable | 65 |
| Robust | 55 |
| RTL / i18n a11y | 55 |
| **Overall** | **58** |

**Verdict:** Below AA readiness for a healthcare launch. Fix P0/P1 before marketing bilingual clinical workflows.
