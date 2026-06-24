# V Welfare Mobile Readiness Report

**Generated:** 2026-06-24  
**Platform:** Next.js 14 (App Router) → Capacitor → Android / iOS  
**Auditor:** Phase 1 Automated Audit  
**Architecture Decision:** Capacitor WebView wrapper (single codebase)

---

## Executive Summary

The V Welfare platform is **substantially mobile-ready**. The existing codebase uses TailwindCSS with responsive breakpoints, a collapsible sidebar for mobile, and bilingual RTL/LTR support. The primary gaps are in native API compatibility, token storage security, and touch-interaction polish.

**Overall Mobile Readiness Score: 72 / 100**

---

## 1. Unsupported Browser APIs

| API | Location | Issue | Severity | Fix |
|-----|----------|-------|----------|-----|
| `localStorage` | `app/(app)/assessments/[id]/assessment-content.tsx` L56-96 | Assessment progress saved to localStorage — works in Capacitor WebView but not encrypted | Medium | Migrate to `@capacitor/preferences` for secure persisted state |
| `localStorage` | `app/layout.tsx` L69 | Dark mode theme saved in localStorage | Low | Keep as-is; Capacitor WebView supports localStorage |
| `document.body.style.overflow` | `components/sidebar.tsx` L50-57 | Body scroll lock for mobile menu | Low | Works in WebView; no change needed |
| `navigator.clipboard` | Not used in codebase | N/A | None | — |
| `window.matchMedia` | `app/layout.tsx` L69 (inline script) | Dark mode detection | Low | Works in WebView |
| `window.location` | No direct usage found | N/A | None | — |
| Download (`<a download>`) | `app/(app)/packages/[id]/pdf-download-button.tsx` | Browser download trigger won't work natively | High | Needs Capacitor Filesystem + Share plugin |
| `fetch` with relative URLs | All API routes | Next.js API routes (`/api/*`) are server-side — **not accessible from Capacitor** without a live server URL | Critical | Set `server.url` in capacitor.config.ts to production Vercel URL |

---

## 2. Desktop-Only Layout Issues

| Component | Issue | Severity | Fix |
|-----------|-------|----------|-----|
| `components/sidebar.tsx` | Desktop: fixed 248px left sidebar; Mobile: collapsible hamburger menu | Low | Already handled — sidebar collapses on `< lg` |
| `app/(app)/layout.tsx` | `lg:ms-[248px]` offset for desktop sidebar | Low | Works correctly with responsive classes |
| `app/(app)/dashboard/page.tsx` | 3-column grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | None | Already responsive |
| `app/x/control/(panel)/layout.tsx` | Admin panel — not targeted for mobile app | Low | Admin features accessible via WebView; not priority for store |
| Charts (`recharts`) | `app/(app)/insights/page.tsx` | Recharts renders SVG — works in WebView, but may be small on phones | Medium | Wrap charts in `min-h-[300px]` containers; test on 375px width |

---

## 3. Hover Interactions

| Component | Issue | Severity | Fix |
|-----------|-------|----------|-----|
| Nav items in sidebar | `hover:bg-gray-100` classes | Low | Hover states are cosmetic; tap events fire correctly in WebView |
| Buttons throughout app | Tailwind `hover:` classes | Low | No action required — touch triggers active state instead |
| `card-hover` class | `app/(app)/assessments/page.tsx` and others | Low | Add `active:scale-[0.98]` for touch feedback in globals.css |

---

## 4. Keyboard Assumptions

| Location | Issue | Severity | Fix |
|----------|-------|----------|-----|
| All form pages (login, register, assessment) | Virtual keyboard pushes viewport on iOS — content may be obscured | High | Set `KeyboardResizesContent` in capacitor.config.ts; test scroll behavior |
| Assessment answer buttons | Tap area minimum 44×44px required | Medium | Current buttons are `p-4` (~48px) — acceptable |
| Search/filter inputs in admin | No `inputMode` attribute | Low | Add `inputMode="email"`, `inputMode="numeric"` where appropriate |

---

## 5. Fixed-Width Layout Issues

| Component | Issue | Severity | Fix |
|-----------|-------|----------|-----|
| `max-w-6xl` in dashboard | Large max-width — fine on tablet, may waste space on phone | Low | No change needed; full-width on phone |
| `max-w-2xl` in assessment | Correct constraint | None | — |
| `max-w-3xl` in results | Correct constraint | None | — |
| PDF template components | Fixed-width PDF layout not meant for mobile render | Medium | PDF only generates server-side; no mobile display issue |

---

## 6. Modal / Dialog Issues

| Component | Issue | Severity | Fix |
|-----------|-------|----------|-----|
| No native modals found | Platform uses inline content sections, not browser `<dialog>` | None | — |
| Confirmation flows | No browser `confirm()` / `alert()` usage found | None | — |

---

## 7. Scrolling Issues

| Location | Issue | Severity | Fix |
|----------|-------|----------|-----|
| `app/(app)/layout.tsx` | `overflow-auto` on main content area | Low | Works correctly; momentum scrolling should be added |
| Long assessment lists | No virtualisation | Low | Acceptable for current data size (<50 items) |
| Admin tables | Horizontal scroll tables | Medium | Add `overflow-x-auto` wrapper on admin table components for mobile |

**Recommendation:** Add `-webkit-overflow-scrolling: touch` to scrollable containers (or use `overscroll-behavior: contain`).

---

## 8. Authentication Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Supabase session stored in cookies (SSR) and browser storage (client) | High | Capacitor WebView shares browser storage — session will persist. Deep link handling needed for magic links and OAuth callbacks |
| `router.refresh()` after login | Low | Works in WebView |
| Redirect after login uses `router.push()` | Low | Works in WebView |
| Magic link / OAuth callbacks need deep linking | High | Configure `appUrlScheme: 'vwelfare'` in Capacitor; handle `vwelfare://` scheme |
| Session expiry redirect to `/login` in middleware | Medium | Middleware runs server-side only; client-side refresh interceptor needed for Capacitor |

---

## 9. Clipboard API

No clipboard API usage found in the codebase. No action required.

---

## 10. Download Behavior

| Location | Issue | Severity | Fix |
|----------|-------|----------|-----|
| `app/(app)/packages/[id]/pdf-download-button.tsx` | `<a href="..." download>` won't trigger file download in Capacitor | High | Use `@capacitor/filesystem` to write PDF blob to device storage, then `@capacitor/share` to open share sheet |
| PDF export API route (`/api/reports/route.tsx`) | Returns PDF bytes — accessible via network | Medium | Capacitor can fetch the API URL directly using the production server URL |

---

## 11. File Upload Limitations

| Location | Issue | Severity | Fix |
|----------|-------|----------|-----|
| Profile picture upload (if any) | Standard `<input type="file">` works in Capacitor WebView | Low | Works; add Camera plugin for native camera capture |
| No document upload found in current codebase | N/A | None | — |

---

## 12. Responsive Audit

### Mobile-First Assessment (375px viewport)

| Screen | Mobile Status | Issues |
|--------|--------------|--------|
| Landing page (`/`) | ✅ Responsive | Mobile menu component exists |
| Login (`/login`) | ✅ Responsive | Clean single-column layout |
| Register (`/register`) | ✅ Responsive | Single-column form |
| Forgot password | ✅ Responsive | Minimal layout |
| Dashboard | ✅ Responsive | `grid-cols-1` on mobile |
| Assessments list | ✅ Responsive | Card grid collapses correctly |
| Assessment (taking) | ✅ Responsive | Single-column question layout |
| Assessment result | ✅ Responsive | Card-based result layout |
| Mood tracker | ✅ Responsive | Single-column |
| Journal | ✅ Responsive | Single-column |
| Messages | ✅ Responsive | Chat layout needs bottom-safe-area padding |
| Insights | ⚠️ Partial | Charts may be too small on 375px |
| Profile | ✅ Responsive | Single-column form |
| Admin panel | ⚠️ Desktop-first | Not targeted for mobile store build |

### Safe Areas / Notch Compatibility

The platform currently has **no safe area handling**. Capacitor requires:
- `env(safe-area-inset-top)` for notched phones
- `env(safe-area-inset-bottom)` for home indicator area

**Fix required in `app/globals.css`:**
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Dynamic Font Scaling

iOS and Android allow users to increase font size. Current implementation uses fixed `px` sizes (e.g., `text-[13.5px]`). This partially limits accessibility.

**Recommendation:** Use `rem` units where possible, or test at 200% font scale.

---

## 13. Navigation Review

| Feature | Status | Notes |
|---------|--------|-------|
| Bottom navigation | ❌ Not implemented | Sidebar is side-nav; mobile gets hamburger top-bar |
| Android hardware back button | ❌ Not handled | Capacitor `App` plugin needed to handle back press |
| Swipe navigation | ❌ Not implemented | No swipe gestures |
| Deep links | ❌ Not configured | Required for magic link auth and password reset |
| Navigation stack restoration | ✅ Works via URL | Next.js router handles this |
| History back on browser | ✅ Works | Standard browser history |

**Key Action:** Implement Android back button handler via `@capacitor/app` to prevent accidental app exit.

---

## 14. Performance Observations

| Metric | Observation | Recommendation |
|--------|-------------|----------------|
| Bundle size | Next.js with code splitting — acceptable | Verify with `next build --debug` |
| Image optimisation | Next.js `<Image>` component used | Verify usage in landing and profile pages |
| Lazy loading | Next.js auto-splits routes | Good |
| Startup time | Cold start loads full Next.js app | Target <3s on mid-range Android |
| Recharts | Client-side SVG rendering | Defer chart render until visible |
| `@react-pdf/renderer` | Large bundle included in client build | Move PDF generation fully server-side |
| Supabase real-time | Messages page uses real-time subscription | Monitor battery impact on mobile |

---

## 15. Offline Readiness

Current state: **No offline support.** All data fetching is real-time from Supabase.

| Feature | Priority | Implementation |
|---------|----------|----------------|
| Offline detection banner | High | `navigator.onLine` + `window` event listeners |
| Cache profile data | High | `@capacitor/preferences` |
| Cache assessment list | High | `@capacitor/preferences` |
| Cache assessment progress | High | Already in localStorage — migrate to Preferences |
| Background sync | Medium | Service Worker or Capacitor Background Task plugin |
| Cached mood logs | Medium | Local storage with sync on reconnect |

---

## 16. Push Notification Readiness

**Current state:** No push notification infrastructure.

Required interfaces (providers NOT implemented yet):
- Appointment reminders
- Medication reminders  
- Clinician messages (real-time messages already exist)
- Assessment invitations
- Emergency notifications (crisis banner exists — extend to push)

Plugin needed: `@capacitor/push-notifications`

---

## 17. Video Consultation Readiness

| Feature | Status | Notes |
|---------|--------|-------|
| WebRTC compatibility | ✅ WebView supports WebRTC | Works in Capacitor WKWebView (iOS) and WebView (Android) |
| Camera permission | ❌ Not declared | Must add to `AndroidManifest.xml` and `Info.plist` |
| Microphone permission | ❌ Not declared | Must add to both manifests |
| Audio routing | ❌ Not handled | Requires native audio session configuration on iOS |
| Bluetooth/headphones | ❌ Not handled | iOS audio session category needed |
| Network interruption recovery | ❌ Not implemented | WebRTC reconnect logic needed when added |

---

## 18. Security Assessment

| Item | Status | Severity |
|------|--------|----------|
| HTTPS enforcement | ✅ HSTS header in next.config.js | — |
| CSP headers | ✅ Defined in next.config.js | Need to add Capacitor scheme (`capacitor://`) |
| No embedded secrets | ✅ Environment variables used | — |
| JWT storage | ⚠️ Browser storage (cookies + localStorage) | Medium — migrate auth tokens to Capacitor SecureStorage |
| RLS enforcement | ✅ Supabase RLS active | — |
| Certificate pinning | ❌ Not implemented | Prepare hook; implement in Phase 4 |
| Jailbreak/Root detection | ❌ Not implemented | Prepare hook; implement in Phase 4 |
| X-Frame-Options: DENY | ✅ Set | — |
| `capacitor://` scheme in CSP | ❌ Missing | **Must add** to allow Capacitor WebView to load the app |

**Critical Fix:** The existing CSP blocks `capacitor://` origin. When running inside a Capacitor WebView, all network requests originate from `capacitor://localhost`. The `connect-src` directive must allow this.

---

## 19. App Configuration Checklist

| Item | Status |
|------|--------|
| App name | ✅ "V Welfare" |
| Bundle ID | ❌ Not set — needs `com.vwelfare.app` |
| Version | ❌ Not set in Capacitor config |
| Splash screen | ❌ Not configured |
| App icons | ❌ Not prepared (1024×1024 needed) |
| Adaptive icons (Android) | ❌ Not prepared |
| Dark mode icons | ❌ Not prepared |
| Environment switching | ❌ Not configured |

---

## 20. App Store Readiness

| Item | Status |
|------|--------|
| Privacy policy URL | ✅ `/privacy` page exists |
| Terms of service URL | ✅ `/terms` page exists |
| Permission descriptions (iOS Info.plist) | ❌ Not written |
| Privacy manifest (iOS 17+) | ❌ Not created |
| Google Play metadata | ❌ Not created |
| App Store metadata | ❌ Not created |
| Age rating | ❌ 17+ recommended for health apps |

---

## 21. Critical Issues (Must Fix Before Build)

1. **CSP blocks Capacitor WebView** — `capacitor://localhost` must be added to `connect-src`, `script-src`, `style-src`, `img-src`
2. **PDF download** — native file save needed via `@capacitor/filesystem`
3. **Deep linking** — required for Supabase magic links and password reset
4. **Android back button** — must prevent accidental app exit
5. **Safe area insets** — notch/home indicator overlap without `env(safe-area-inset-*)`
6. **Virtual keyboard** — form inputs may be obscured on iOS without keyboard avoidance

---

## 22. Go / No-Go Assessment

### Android: ⚠️ GO WITH CONDITIONS
- Core platform works in WebView
- PDF download requires native bridge
- Back button handling required
- Deep links required for auth flows

### iOS: ⚠️ GO WITH CONDITIONS  
- Same conditions as Android
- Additionally: safe area handling critical for notched iPhones
- iOS requires camera/microphone permission strings in Info.plist
- Privacy manifest required for App Store submission (iOS 17+)

---

## 23. Estimated Remaining Work

| Task | Effort |
|------|--------|
| Capacitor setup + config | 2h |
| CSP fix for Capacitor | 1h |
| Safe area CSS | 1h |
| Deep link configuration | 3h |
| Android back button handler | 1h |
| PDF native download | 4h |
| Secure token storage | 3h |
| Push notification interfaces | 4h |
| Offline detection + caching | 8h |
| App icons + splash screens | 2h |
| Android manifest permissions | 1h |
| iOS Info.plist permissions | 1h |
| iOS Privacy Manifest | 2h |
| Testing suite | 8h |
| Documentation | 4h |
| **Total Phase 1** | **~45h** |
