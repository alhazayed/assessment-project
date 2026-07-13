# V Welfare — UI / UX Report

**Audit date:** 2026-07-13
**Scope:** `app/**`, `components/**`, `app/globals.css`, `tailwind.config.ts`, i18n libs
**Method:** Static review with file/line evidence. No live browser/device testing was possible in this environment; responsive/RTL findings are inferred from markup and CSS and should be spot‑checked on real devices.

Severity key: **Critical / High / Medium / Low**. (Accessibility is covered separately in `accessibility-report.md`.)

---

## 0. Executive Summary

V Welfare has a **mature design system** (CSS tokens, bilingual i18n dictionary, `dir`/`lang` on `<html>`, dark‑mode class strategy, skip links). For a production **mental‑health** product the biggest UX gaps are **crisis/safety UX**, **absent route‑level loading/error states**, **mobile responsiveness of admin/clinician tables**, and **RTL/i18n inconsistencies** (notably an English‑only ADHD tool).

**UI/UX Score: 66/100.**

| Area | Score |
|---|---|
| Responsive / mobile‑first | 68 |
| RTL correctness | 65 |
| Dark mode | 70 |
| Loading / empty / error states | 48 |
| Consistency & branding | 72 |
| Forms UX | 66 |
| Crisis / safety UX | 42 |

---

## 1. Crisis / Safety UX (highest priority for this domain)

- **UI‑C1 (Critical): Crisis resources appear only on the dashboard.** `CrisisBanner` is mounted solely in `app/(app)/dashboard/page.tsx:9,72`. A user flagged **high‑risk on an assessment result** sees only an inline ⚠ warning with **no helpline CTAs** (`app/(app)/assessments/[id]/assessment-content.tsx:216-220`). *Fix:* render crisis resources on high‑risk results (and ideally in a persistent, non‑dismissible footer/nav entry). *Effort: 4–6h.*
- **UI‑C2 (Critical): Broken UAE helpline dial link.** `tel:${line.number.replace(/\D/g,'')}` on `'800HOPE (4673)'` strips the letters, producing an invalid dial string (`components/crisis-banner.tsx:55`). *Fix:* store E.164 numbers separately from display labels. *Effort: 1h.*
- **UI‑H1 (High): Sparse helpline set** (Saudi/UAE/US only) for a MENA‑plus audience; add Jordan, Egypt, UK, 988, etc. (`crisis-banner.tsx:9-13`).
- **UI‑H2 (High): Crisis banner is dismissible with no re‑surfacing and lacks alert semantics** (`crisis-banner.tsx:42-83`; also `accessibility-report.md`).

---

## 2. Responsive / Mobile‑First

- **UI‑H3 (High): Admin tables force horizontal scroll on phones.** `min-w-[600px]`/`640px` tables in `x/control/(panel)/{users,results,packages,audit,assessments,analytics}` (e.g. `users/page.tsx:105`, `results/page.tsx:215`). *Fix:* card layout `<md` or sticky‑first‑column + `overflow-x-auto`. *Effort: 6–10h.*
- **UI‑H4 (High): Clinician patients table has no mobile adaptation** — full 6‑column `<table>` without an `overflow-x-auto` wrapper (`app/(app)/patients/patients-content.tsx:257-318`).
- **UI‑M1 (Medium): Messages layout uses fixed `w-64` sidebar + `h-screen`** (`app/(app)/messages/page.tsx:190-192`) — cramped on mobile; sidebar not collapsible.
- **UI‑M2 (Medium): Small touch targets** (`w-8 h-8`) on dark‑mode toggle, notification bell, journal close, crisis dismiss (< 44×44px). *Effort: 2–3h.*
- **Positives:** dashboard/landing use responsive grids and stacked CTAs; sidebar has a mobile drawer with backdrop; main content offset is responsive.

---

## 3. RTL Correctness

- **UI‑C3 (Critical): ADHD Zone Checker is English‑only** despite accepting a `lang` prop that is never used; hardcoded `text-left`/`border-l-4` (`components/adhd-zone-checker.tsx:219,270-273,344,353`). Arabic users get an untranslated, mis‑mirrored clinical tool. *Fix:* wire i18n + logical properties + `rtl:rotate-180` arrows. *Effort: 8–12h.*
- **UI‑H5 (High): Physical `left/right` utilities break mirroring** in several places: `.safety-strip` `border-left` (`globals.css:347`), `.nav-item-active` `border-left` (`globals.css:418`), `.select` chevron `right 12px` (`globals.css:291`), messages `borderRight` (`messages/page.tsx:192`), patients `border-l` (`patients-content.tsx:325`), non‑mirrored `ChevronRight` on landing/dashboard/patients, `ml-auto` on unread badge (`unread-messages-badge.tsx:45`). *Fix:* switch to logical properties (`border-s`, `ms-`, `text-start`). *Effort: 4–6h.*
- **UI‑M3 (Medium): Language preference vs. cookie divergence** — profile saves `language_preference` to DB but doesn't set the `lang` cookie (`profile/page.tsx:194-198` vs `lib/get-language.ts`). *Fix:* set cookie + refresh on save/onboarding finish. *Effort: 2h.*
- **UI‑M4 (Medium): Hardcoded (non‑i18n) sidebar strings** e.g. `'My Clinicians'`, `'MENU'/'القائمة'` (`components/sidebar.tsx:71,159`).
- **Positives:** root `lang`+`dir` set server‑side; Arabic font (Tajawal) configured; full EN/AR dictionary (`lib/i18n.ts`).

---

## 4. Dark Mode

- **UI‑H6 (High): Landing/hero/error use hardcoded light gradients** that don't adapt (`app/page.tsx:98,147-157`, `app/error.tsx:23-29`). *Fix:* use tokens/`dark:` variants. *Effort: 3–4h.*
- **UI‑M5 (Medium): Two UI dialects** — token‑based pages (dashboard/mood/profile) vs. raw Tailwind grays (patients/clinician) relying on global overrides (`patients-content.tsx:257-294`). Inconsistent in dark mode.
- **UI‑M6 (Medium): Severity/alert badges lack dark variants** (`globals.css:299-322,352-372`).
- **Positives:** `darkMode:'class'`, anti‑FOUC script, CSS‑variable surfaces, Turnstile theme follows dark mode.

---

## 5. Loading / Empty / Error States

- **UI‑H7 (High): Zero `loading.tsx` files** and **only one `error.tsx` (root)** across the app — no segment‑level recovery for `(app)`, assessments, admin, etc. *Fix:* add skeleton `loading.tsx` and segment `error.tsx`. *Effort: 6–8h.*
- **UI‑M7 (Medium): Messages/admin use text‑only "Loading…"** rather than skeletons.
- **Positives:** good empty states on mood/journal/messages/patients; solid i18n'd 404; assessment load has an error state; auth uses Suspense fallbacks.

---

## 6. Forms UX

- **UI‑H8 (High): Register "terms" is a clickable `<div>`, not a checkbox** (`register/page.tsx:344-357`) — see `accessibility-report.md`; also a UX/validation risk.
- **UI‑M8 (Medium): Profile validation errors are a single banner** not tied to fields (`profile/page.tsx:330-333`); mood trigger toggles lack pressed state.
- **Positives:** auth forms have required fields, inline confirm‑password feedback, disabled‑while‑submitting, bilingual errors; clinician verification form is well‑built (`htmlFor`, `role="alert"`).

---

## 7. Consistency & Branding

- **UI‑M9 (Medium): Inconsistent page‑title sizing** (dashboard `text-3xl`, assessment h1 `text-[15px]`, clinicians `text-[44px]`).
- **UI‑M10 (Medium): Legacy button aliases** (`.btn-primary/.btn-secondary`) coexist with `.btn-accent/.btn-ghost`.
- **UI‑L1 (Low): Hardcoded brand hex** alongside CSS tokens in many components — maintenance burden.
- **Positives:** cohesive palette + typography scale in `tailwind.config.ts`; shared BrandLogo/Language/DarkMode/sidebar components.

---

## 8. Prioritized Remediation

| Priority | Items | Effort |
|---|---|---|
| P0 | UI‑C1 (crisis on results), UI‑C2 (dial link), UI‑C3 (ADHD i18n/RTL), UI‑H8 (real checkbox) | 14–20h |
| P1 | UI‑H3/H4 (responsive tables), UI‑H7 (loading/error), UI‑H5 (RTL logical props), UI‑M3 (lang sync) | 18–26h |
| P2 | UI‑H1/H2/H6, UI‑M1/M2/M5/M6/M8/M9/M10 | 14–22h |

**UI/UX verdict:** ⚠ Solid foundation, but **crisis UX and loading/error coverage must be fixed before a mental‑health launch**; responsive/RTL polish can partly follow.
