# Repository Mobile-Readiness Audit — V Welfare

**Scope:** full-repository documentation audit (every `*.md`) cross-checked against code, CI, and native config, to determine the true implementation status and what remains before the first production-ready **Android** and **iOS** apps.
**Date:** 2026-07-07 · **Branch audited:** `claude/capacitor-mobile-setup-xflg5y` (PR #44) · **Base:** `origin/main` @ `b8a0e50`
**Evidence rule:** every conclusion cites repo code, docs, or CI. Where docs conflict, the authoritative source is named.

---

## Executive Summary

The V Welfare **web platform** is a mature, audited Next.js app (now **Next 16 / React 19**) with an extensive go-live history; its last remaining go-live condition (Next.js CVEs) is **resolved**. On top of it, a **complete Capacitor 7 mobile integration** has been built and is **CI-verified for Android**: the release AAB **and** APK build on a real runner (SDK 35 / JDK 21), are **not debuggable**, carry the correct identifiers, and produce downloadable artifacts. Full **official branding** (adaptive/round/legacy/monochrome/notification icons + splash + 512² Play icon) is in place, as are admin-gating, deep links, push registration, secure storage, and device plugins.

**The remaining work is almost entirely human/credential- and device-gated, not code:** signing keystore, Firebase (FCM) + APNs, an Apple Developer account + macOS/Xcode, on-device QA, and store-listing assets/forms. **iOS has never been built** in this environment (Linux; no macOS).

- **Android readiness: ~82%** (build/branding/config done; gated on signing + device QA + store forms)
- **iOS readiness: ~50%** (fully configured, never built; account + macOS + 4.2 decision required)
- **Overall mobile readiness: ~68%**

**Verdicts:** Android **Internal Testing → CONDITIONAL GO** (add upload key + smoke test). iOS **TestFlight/Production → NO-GO** (never built; needs Apple account + macOS). Details in the dashboards below.

---

## Phase 1 — Discovery (112 Markdown files)

| Group | Count | Relevance |
|---|---|---|
| **Vendored skill docs** `.agents/skills/**` | ~40 | External tooling (Supabase best-practices skill); **not** project status — excluded from status analysis |
| **Playwright artifacts** `test-results/**/error-context.md` + `.last-run.json` | 25 | Stale e2e evidence (see Phase 3) |
| **Web-platform go-live/audit/phase/remediation docs** (root) | ~30 | Web history; verdict-level reviewed |
| **Mobile reports** (`*mobile*`, `upgrade-`, `branding-`, `android-release-`, `capacitor/*`) | ~9 | First-hand authored + code-verified |
| **Ops/architecture** (`docs/**`, runbooks, DR, payments) | ~8 | Web ops; context only |

> Transparency: the ~40 vendored skill files and the 24 stale Playwright error-contexts were characterised, not read line-by-line, because they carry no project-status signal. The web-platform go-live docs were reviewed at the verdict/finding level (their conclusions are extracted below); the **mobile** docs and **all** mobile code/CI were verified in full and first-hand.

---

## Phase 2 — Timeline (from doc git dates + commit history)

| Date | Milestone | Evidence |
|---|---|---|
| 2026-06-24 → 06-30 | Iterative web audits, phase reports, remediation sprint | `AUDIT_REPORT_2026_06_24.md`, `PHASE_*_2026_06_30.md`, `REMEDIATION_SPRINT_COMPLETION_2026_06_30.md` |
| 2026-06-30 | v1.0.0 web release notes + changelog; final runtime verification (stale e2e artifacts committed) | `RELEASE_NOTES.md`, `CHANGELOG.md`, `test-results/.last-run.json` |
| 2026-07-01 | Independent go-live certification: **🟡 GO LIVE WITH CONDITIONS (82/100)** | `GO_LIVE_CERTIFICATION_2026_07_01.md` |
| 2026-07-02 | **Next.js CVE remediation: full upgrade to next@16 / react@19; npm audit 0 HIGH** | `NEXTJS_CVE_REMEDIATION.md` |
| 2026-07-06 | Capacitor mobile build: integration → Cap 7 upgrade → branding → Android release; all CI-verified | PR #44, `upgrade-report.md`, `branding-report.md`, `android-release-report.md` |

---

## Phase 3 — Cross-check (docs vs. actual repo)

**Confirmed present in code (documentation matches reality):**

| Claim | Evidence in repo |
|---|---|
| Capacitor 7, server-URL mode, HTTPS-only | `capacitor/capacitor.config.ts`: `appId 'com.vwelfare.app'`, `serverUrl … 'https://app.vwelfare.com'`, `appendUserAgent 'VWelfareApp'`, `cleartext:false`; `capacitor/package.json` all `@capacitor/*@^7` |
| Native web integration | `lib/capacitor/{client,server,device,secure-storage}.ts`; `components/native/{NativeBootstrap,PushRegistration}.tsx`; `app/mobile/web-only/page.tsx` |
| Admin web-only in app | `middleware.ts` (UA→`/mobile/web-only` redirects); sidebar gating |
| Push (registration + backend) | `components/native/PushRegistration.tsx` → `app/api/user/push-token/route.ts` → `supabase/migrations/20260622175454_push_notification_tokens.sql` (table + RLS) |
| Android release config | `variables.gradle` compileSdk/targetSdk **35**, minSdk **23**; `app/build.gradle` `versionCode 1` / `versionName "1.0.0"` / keystore signing / `debuggable false` |
| PHI hardening | `MainActivity.java` `FLAG_SECURE`; manifest `allowBackup=false` + data-extraction rules; `POST_NOTIFICATIONS` |
| Branding | `values/colors.xml` (brand palette); `mipmap-*/ic_launcher_monochrome.png`; `drawable-*/ic_stat_notify.png`; `capacitor/assets/playstore-icon.png` (512²) |
| CI builds + verifies | `.github/workflows/mobile.yml` (`bundleRelease assembleRelease`, aapt no-debug assertion, JDK 21) |

**Contradictions / superseded information (resolved with authority):**

1. **Web go-live condition is stale.** `GO_LIVE_CERTIFICATION_2026_07_01.md` = "GO LIVE WITH CONDITIONS … solely because of the unpatched Next.js framework CVEs." **Superseded by** `NEXTJS_CVE_REMEDIATION.md` (2026-07-02, "✅ Full upgrade applied — next@16.2.10 + react@19.2.7 … npm audit 0 HIGH") **and confirmed in code** (`package.json` `next ^16.2.10`, `react ^19.2.7`). **Authoritative: code + CVE-remediation doc.** → the web platform's sole certification blocker is cleared.
2. **`test-results/` (24 failed e2e) is not a current signal.** `.last-run.json` was committed **2026-06-30** (pre-Next-16, pre-mobile). There is **no e2e job in CI** (`mobile.yml` builds only; Vercel deploys only). Authoritative current test signal = the mobile CI build + the headless-Chromium campaign in `mobile-release-candidate-report.md`, not these artifacts. **Recommendation:** delete/refresh `test-results/` or wire the e2e suite (`tests/`, `vw-test.js`) into CI.
3. **`KNOWN_ISSUES.md` "Supabase migration sync (ACTIVE)" is stale.** Dated 2026-06-27, references old branch `claude/project-functionality-UDm55`. Recent Vercel deploys on PR #44 are **all green**, so the Vercel/Supabase build block described no longer manifests. **Authoritative: current green Vercel deployments.**

**No cases found where a mobile doc claims something the code lacks.** (The one wording correction already made: `branding-report.md`/`upgrade-report.md` initially called `colors.xml` a "build fix"; corrected to "branding override" since CI run #1 built without it.)

---

## Phase 4 — Mobile readiness by area

| Area | Status | % | Confidence | Evidence |
|---|---|---:|---:|---|
| Architecture (server-URL wrapper) | ✅ Complete | 100 | 95% | `capacitor.config.ts`; web app untouched, Cap-aware |
| Capacitor (v7, plugins) | ✅ Complete | 100 | 95% | `cap sync` = 7 plugins both platforms (CI + local) |
| Android build | ✅ CI-verified | 95 | 90% | `mobile.yml` run #28824943349: `BUILD SUCCESSFUL`, AAB+APK, not debuggable |
| iOS build | ⚠️ Configured, never built | 40 | 60% | Info.plist/Podfile/schemes exist; **no macOS** to compile |
| Security (transport/PHI/admin) | ✅ Strong | 90 | 85% | `cleartext:false`, `FLAG_SECURE`, `allowBackup=false`, UA admin-gate; RLS = backend boundary (60/60 tables, verified earlier) |
| Authentication | ✅ Preserved | 95 | 85% | Supabase cookie-SSR unchanged; gating verified via headless Chromium |
| Push notifications | 🟡 Client done, delivery pending | 60 | 80% | registration + token API + table exist; **no Firebase/APNs creds** |
| Deep links | ✅ Wired | 85 | 70% | `vwelfare://` in Info.plist + manifest + `appUrlOpen`; device-untested |
| Offline support | 🟡 Minimal | 40 | 80% | `www/` fallback only; no cached shell |
| Accessibility | 🟡 Partial | 70 | 75% | AA on our screens; 7 sub-44px targets in shared web UI (RC report) |
| Performance | 🟡 Unmeasured on device | 60 | 50% | web CWV good per `GO_LIVE_AUDIT_2026_07_01.md`; not measured in WebView on device |
| Store compliance | 🟡 Partial | 45 | 70% | targetSdk 35 ✅; icons ✅; **4.2 risk / forms / assets pending** |
| Branding | ✅ Complete | 100 | 90% | full icon/splash set + Play icon (`branding-report.md`, CI-built) |
| Native functionality | ✅ Baseline | 85 | 80% | status bar, back button, device info, app-launcher |
| Testing | 🟡 Build + browser only | 55 | 70% | CI build + headless campaign; **no device/emulator, no authed E2E** |
| CI/CD | ✅ Strong | 90 | 90% | `mobile.yml` builds+verifies+uploads on PR; iOS opt-in |
| Release pipeline | 🟡 Unsigned | 70 | 85% | artifacts produced; signing + store upload are manual |

---

## Phase 5 — Remaining work (prioritized)

| # | Task | Priority | Why | Effort | Depends on | Owner | Claude auto? |
|---|---|---|---|---|---|---|---|
| 1 | Provide **Android upload keystore** (local `keystore.properties` or CI secrets) | Critical | Play requires a signed AAB | 0.5h | — | Human | ❌ (secret) |
| 2 | **Device smoke test** (install signed APK; launch; no crash) | Critical | Not verifiable in CI/container | 1–2h | #1, device | Human/QA | ❌ (device) |
| 3 | **Firebase project + `google-services.json`** (+ APNs key for iOS) | High | Push delivery; no live send today | 1–2h | Firebase acct | Human | ❌ (account) |
| 4 | **Apple Developer account + macOS/Xcode build → TestFlight** | High (iOS) | iOS never built; only path to iOS | 0.5–1d | Apple acct, Mac | Human | ❌ (macOS/account) |
| 5 | Full **device QA** (`capacitor/MOBILE_QA_CHECKLIST.md`, patient + clinician, EN/AR) | High | Authed flows unverified on device | 1d | test creds, device | QA | ❌ (device+creds) |
| 6 | **Play Data Safety + content rating**; **App Store privacy labels** | High | Required forms (health data) | 2–4h | console access | Human | ❌ (console) |
| 7 | **Store listing assets** (screenshots, feature graphic, copy) | High | Required for listing | 0.5–1d | device build | Human (+Claude drafts copy) | 🟡 partial |
| 8 | **Guideline 4.2 decision** (thin-wrapper risk) — strengthen native value or ship Android first | High (iOS) | Frequent iOS rejection cause | decision | product | Human | ❌ (decision) |
| 9 | Server-side **push send** helper (FCM HTTP v1 / APNs), env-gated | Medium | Complete the push loop | 0.5d | #3 | Dev | ✅ Claude |
| 10 | **Offline screen** + connectivity-aware splash | Medium | UX on flaky networks | 0.5d | — | Dev | ✅ Claude |
| 11 | Enable **R8/minify** for release + retest | Medium | Size/obfuscation | 0.5d | #2 | Dev | ✅ Claude (build) |
| 12 | Enlarge sub-44px **tap targets** (shared web UI) | Low | a11y guideline | 0.5d | — | Web team | ✅ Claude |
| 13 | Refresh/remove stale `test-results/`; wire e2e into CI | Low | Doc hygiene / real test signal | 0.5d | — | Dev | ✅ Claude |

---

## Phase 6 — Store readiness (separately)

### Google Play
| Blocker | Status |
|---|---|
| Target API 35 | ✅ Met (`variables.gradle`) |
| App icons / adaptive / monochrome | ✅ Done |
| Signed AAB | ❌ **Blocker** — needs upload keystore (#1) |
| Firebase (FCM) for push | ❌ Needs `google-services.json` (#3) |
| Data Safety + content rating (health) | ❌ Console forms (#6) |
| Store listing (screenshots/graphic/copy) | ❌ (#7) |
| Min-functionality (webview wrapper) | ✅ Play tolerant; native features present |
| Device install/launch/no-crash | ⏳ Device QA (#2) |

### Apple App Store
| Blocker | Status |
|---|---|
| Build exists | ❌ **Never built** (no macOS/Xcode) |
| Apple Developer account ($99/yr) | ❌ Required |
| CocoaPods install + archive | ❌ Needs Mac |
| APNs key + Push capability | ❌ Needs account (#3/#4) |
| Privacy nutrition labels | ❌ Console |
| Screenshots (all device sizes) | ❌ Needs build |
| **Guideline 4.2 (thin wrapper)** | ⚠️ **Material rejection risk** (#8) |

---

## Phase 7 — Release dashboard

| Track | Status | Completion | Confidence |
|---|---|---:|---:|
| Web Platform | ✅ Completed (Next 16, CVEs cleared) | 95% | 85% |
| Backend / APIs | ✅ Completed | 90% | 80% |
| Supabase / Database / RLS | ✅ Completed (60/60 RLS) | 95% | 85% |
| Security | ✅ Strong | 90% | 85% |
| Capacitor | ✅ Completed (v7) | 100% | 95% |
| Android | 🟡 In progress (build ✅; sign/QA pending) | 82% | 85% |
| iOS | 🟡 Blocked (configured, not built) | 50% | 60% |
| CI/CD | ✅ Completed | 90% | 90% |
| Testing | 🟡 In progress (build+browser; no device) | 55% | 70% |
| Documentation | ✅ Extensive (some stale) | 90% | 80% |
| Google Play | 🟡 In progress (blockers: sign, forms, assets) | 60% | 80% |
| Apple App Store | 🔴 Blocked (no build/account) | 35% | 65% |

**Android readiness: ~82% · iOS readiness: ~50% · Overall mobile readiness: ~68%**

---

## Phase 8 — Final verdict (explicit answers)

1. **Where are we today?** Web platform is production-grade (Next 16; CVE condition cleared). A complete Capacitor 7 Android build is CI-verified and branded; iOS is fully configured but unbuilt.
2. **What is complete?** Capacitor architecture, Android release build (AAB+APK, not debuggable), branding, admin-gating, deep-link wiring, push registration + token backend, secure storage, CI build+verify pipeline.
3. **Partially complete?** Push (no delivery creds), testing (no device/authed E2E), offline, store compliance/assets, performance-on-device.
4. **Missing?** Signing keystore; Firebase/APNs; Apple account + macOS build/TestFlight; device QA; Play Data-Safety + App-Store privacy labels; store screenshots/graphics.
5. **What should NOT be worked on yet?** iOS App Store assets/screenshots before an iOS build exists and the **4.2 decision** is made; production push-send infra before a Firebase project exists; store screenshots before a signed device build runs. Don't chase the stale `test-results` failures as if current.
6. **Next highest-priority milestone?** **Android Internal Testing**: add the upload keystore (#1), do a device smoke test (#2), upload the signed AAB.
7. **Can the first Android app be released?** **Not to production yet.** It can go to **Internal Testing** after signing + a smoke test. Production needs device QA + push + store forms/assets.
8. **Can the first iOS app be released?** **No.** It has never been built; requires an Apple Developer account, macOS/Xcode, APNs, and a Guideline-4.2 risk decision.
9. **Requires human (not Claude):** keystore/signing; Google Play + Apple accounts; Firebase + APNs credentials; macOS/Xcode build + TestFlight; on-device QA with test accounts; privacy/data-safety forms; store screenshots/feature graphics; the 4.2 product decision.
10. **Claude can do autonomously:** server-side push-send helper (env-gated); offline screen + connectivity-aware splash; enable R8/minify and re-verify via CI; draft store-listing copy; enlarge sub-44px tap targets; clean up stale `test-results` and wire e2e into CI; tune the opt-in iOS CI job.

---

## Risk assessment

| Risk | Sev | Prob | Mitigation |
|---|---|---|---|
| Apple **4.2** thin-wrapper rejection | High | Med-High | Add native value (offline, biometric unlock, native notifications inbox); ship Android first |
| Unsigned release can't be tested/uploaded | High | Certain until #1 | Provide upload keystore (local or CI secrets) |
| Push undeliverable (no FCM/APNs) | Med | Certain until #3 | Create Firebase project; add `google-services.json` + APNs key |
| Authed patient/clinician flows unverified on device | Med | Med | Run `MOBILE_QA_CHECKLIST.md` on real devices with test accounts |
| Stale docs mislead status (`KNOWN_ISSUES`, `test-results`, old go-live certs) | Low | — | This audit supersedes them; recommend archiving |

---

## GO / NO-GO by track

| Track | Verdict | Rationale |
|---|---|---|
| **Android Internal Testing** | ⚠️ **CONDITIONAL GO** | Release build CI-verified (not debuggable, correct identifiers). Conditions: sign with upload key (#1) + device smoke test (#2). |
| **Android Closed Testing** | ⚠️ **CONDITIONAL** | + full device QA (#5) and Data-Safety/content-rating forms (#6). |
| **Android Production** | ❌ **NO-GO** | Needs device QA, push delivery (#3), store listing/assets (#7), policy forms (#6). |
| **iOS TestFlight** | ❌ **NO-GO** | Never built; requires Apple account + macOS/Xcode + CocoaPods + APNs (#4). |
| **iOS Production** | ❌ **NO-GO** | Above + Guideline 4.2 decision (#8) + privacy labels + screenshots. |

**Bottom line:** Android is one signing key + one device smoke test away from Internal Testing; everything blocking is a credential, an account, a device, or a product decision — not application code.

---

## Recommended next steps (ordered)
1. Add the Android upload keystore (local `keystore.properties` or CI secrets) → produce a **signed** AAB.
2. Install the signed APK on a device; smoke-test launch + one patient flow.
3. Upload the AAB to **Play Internal Testing**; add testers.
4. Stand up Firebase (FCM) + `google-services.json`; (optionally) let Claude wire the server-side send helper.
5. Run the full device QA matrix (EN/AR, patient + clinician).
6. Decide the iOS **4.2** strategy; if proceeding, build on macOS/Xcode → TestFlight.
7. Complete Data Safety / privacy labels and store listing assets.
