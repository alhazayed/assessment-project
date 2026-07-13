# V Welfare — UI / UX Report

**Audit date:** 2026-07-13  
**Method:** Full page/component source review (web + mobile). No live device lab in this session.  
**Design system:** Tailwind + CSS variables in `app/globals.css`; brand Lapis `#1D6296`, accent `#F3650A`; Inter + Tajawal.

---

## Executive Summary

V Welfare has a coherent brand system, bilingual foundations, dark mode, skip links, and strong clinician connect/verification form patterns. Major UX gaps: **clinicians land on a patient dashboard**, **ADHD tool ignores Arabic**, **admin panel is LTR-only**, **clinician patients/messages are desktop-first**, **mobile app hides core features and uses US crisis numbers**, and **loading/error empty states are inconsistent**.

**UI/UX Score: 64/100**

---

## 1. Page Inventory (44 routes)

### Public
`/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/contact`, `/clinicians`, `/sample-result`, `/onboarding`

### Patient / shared app
`/dashboard`, `/assessments`, `/assessments/[id]`, `/mood`, `/journal`, `/insights`, `/messages`, `/profile`, `/packages`, `/packages/[id]`, `/packages/[id]/result`, `/adhd-zones`, `/patient/clinicians`, `/connect/[token]`, `/connect/[token]/accept`

### Clinician
`/patients`, `/clinician/connect`, `/clinician/verification`

### Admin
`/x/control/login`, `/x/control/*` (overview, analytics, users, results, risk, assessments, packages, platform, announcements, audit), `/admin/settings`, `/admin/kpi-dashboard`

### System
`not-found`, `error`

---

## 2. Component Inventory (21 shared)

`brand-logo`, `sidebar`, `language-toggle`, `dark-mode-toggle`, `crisis-banner`, `landing-mobile-menu`, `notification-bell`, `unread-messages-badge`, `assessments-by-category`, `in-progress-assessments`, `ai-assessment-finder`, `adhd-zone-checker`, `mental-health-radar`, `synthesis-card`, `rescreening-trigger`, `demographics-card`, `TurnstileWidget`, `kpi-card-enhanced`, `kpi-trend-charts`, `admin/kpi-card`, `admin/dashboard-overview`

**Missing shared primitives:** `PageLoading`, `PageError`, `PageEmpty`, modal/dialog with focus trap.

---

## 3. Responsive Findings

| ID | Severity | Location | Problem |
|----|----------|----------|---------|
| UI-R001 | High | `patients-content.tsx` | Mobile: selecting patient hides list; no back control |
| UI-R002 | High | `messages/page.tsx` | Fixed `w-64` clinician list + `h-screen` — poor narrow layout |
| UI-R003 | Medium | Admin tables | Horizontal scroll; no sticky first column / card fallback |
| UI-R004 | Medium | Landing AI section | Hardcoded white/gray gradients clash with dark mode |
| UI-R005 | Low | ADHD zone grid | Always 2-col on tiny screens |

**Positive:** Sidebar RTL drawer, auth split panel `lg+`, landing mobile menu, app `pt-16 lg:pt-0` for mobile top bar.

---

## 4. Loading / Empty / Error States

| ID | Severity | Finding |
|----|----------|---------|
| UI-LE001 | High | No shared loading/error/empty components; each page invents its own |
| UI-LE002 | Medium | Insights silent on fetch failure |
| UI-LE003 | Medium | Patients assign/notes failures often silent |
| UI-LE004 | Low | `error.tsx` uses gray/brand gradients off design tokens |

**Positive:** Assessment loadError UI; mood/journal alert-error; dashboard empty CTAs.

---

## 5. Dark Mode

| ID | Severity | Finding |
|----|----------|---------|
| UI-DM001 | High | Patients page heavy `text-gray-*` / `bg-white` bypasses tokens |
| UI-DM002 | Medium | `error.tsx` and landing sections hardcode light surfaces |
| UI-DM003 | Medium | Admin console fixed navy theme (acceptable if intentional) |

**Positive:** Class-based dark mode, anti-flash script, extensive `.dark` overrides in CSS.

---

## 6. Branding & Consistency

| ID | Severity | Finding |
|----|----------|---------|
| UI-BR001 | Medium | Auth layout uses inline SVG heart vs `BrandLogo` |
| UI-BR002 | Medium | Button class drift (`btn-accent` / `btn-primary` / legacy aliases) |
| UI-BR003 | Medium | Patients UI looks older than dashboard token system |

**Positive:** Strong brand palette; typography pairing; card radius consistency on newer pages.

---

## 7. Clinician UX

| ID | Severity | Finding |
|----|----------|---------|
| UI-CX001 | Critical | Dashboard has no clinician branch — patient widgets + crisis banner for clinicians |
| UI-CX002 | High | `dashboard.clinician.*` i18n keys unused |
| UI-CX003 | High | No admin UI for certificate approval |
| UI-CX004 | Medium | Messaging patient list lacks search/unread badges |
| UI-CX005 | Medium | Verification “Document upload coming soon” |

Connect + patient clinicians permission UX is comparatively strong.

---

## 8. Patient UX

| Flow | UX status |
|------|-----------|
| Onboarding | Usable wizard; consent can be skipped on finish |
| Assessments | Solid progress + results; a11y gaps (see accessibility report) |
| Packages | Feature-flagged; compute/PDF buttons present |
| Messaging | Dead-end without `assigned_clinician_id` |
| Profile | Comprehensive; delete confirmation weak |
| Crisis | Dashboard banner MENA helplines — good |

---

## 9. Admin UX

- Dense analytics console; redesign plan exists (`ADMIN_DASHBOARD_REDESIGN_PLAN.md`).
- No language toggle / RTL in admin nav (always `left-0`).
- Orphaned clinician-verifications API.
- KPI alerts not persisted (TODO in route).
- Risk page exposes identifiable patient names (privacy + UX trust issue).

---

## 10. Mobile App UX (`/mobile`)

| ID | Severity | Finding |
|----|----------|---------|
| UI-M001 | Critical | Assessments score/insert client-side — bypasses web API |
| UI-M002 | High | Mood/journal/messages/AI hidden from tab bar (`href: null`) |
| UI-M003 | High | Emergency defaults to US 911/988 vs web MENA lines |
| UI-M004 | Medium | No packages / ADHD / clinician portal |
| UI-M005 | Medium | Separate i18n → drift risk |

---

## 11. Navigation Density

Patient sidebar can show 10+ items (assessments, mood, journal, insights, messages, packages, ADHD, clinicians, profile). Consider grouping under “Tools” / “Care”.

---

## 12. Forms

| ID | Severity | Finding |
|----|----------|---------|
| UI-F001 | Medium | Register hint requires letters+numbers; enforcement weaker on reset |
| UI-F002 | Medium | Profile delete lacks type-email confirmation |
| UI-F003 | Low | Some password toggles English-only aria-labels |

Clinician connect/verification forms are exemplars (`htmlFor`, `aria-describedby`, `role="alert"`).

---

## 13. Animations & Motion

Sidebar/drawer transitions present. Landing lacks strong intentional motion system (acceptable). Avoid adding decorative motion that harms vestibular users without `prefers-reduced-motion` (check CSS for coverage).

---

## UI Scorecard

| Domain | Score |
|--------|-------|
| Responsive | 74 |
| Visual consistency | 72 |
| Branding | 78 |
| State handling | 63 |
| Dark mode | 68 |
| Clinician UX | 52 |
| Patient UX | 70 |
| Admin UX | 60 |
| Mobile app UX | 48 |
| **Overall** | **64** |
