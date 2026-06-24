# Deployment Guide

## Standard Release Workflow

```
Code change → git push → Vercel auto-deploys → mobile app gets update automatically
                                              ↑
                    (No app store re-release needed for web content changes)
```

For native changes (new plugins, permissions, icons):
```
Native change → npx cap sync → rebuild APK/IPA → submit to stores
```

## Environments

| Environment | Vercel URL | capacitor.config.ts |
|-------------|-----------|---------------------|
| Production  | https://vwelfare.vercel.app | `server.url: 'https://vwelfare.vercel.app'` |
| Staging     | https://vwelfare-staging.vercel.app | `server.url: 'https://vwelfare-staging.vercel.app'` |
| Development | http://localhost:3000 | `server.url: 'http://localhost:3000'` |

Switch environments by changing `server.url` before building.

## Version Management

`capacitor.config.ts` controls the app version:
```ts
// Increment before each store release
appId: 'com.vwelfare.app',
// Version shown to users
// Android: versionCode in build.gradle
// iOS: CFBundleVersion in Xcode
```

Semantic versioning: `MAJOR.MINOR.PATCH`
- PATCH: bug fixes, content updates
- MINOR: new features
- MAJOR: breaking native changes

## Rollback Strategy

**Web content rollback:** Vercel → Deployments → select previous deployment → Promote to Production  
**Native rollback:** Only possible via new store submission (use staged rollout on Google Play)

## CI/CD (Phase 6 Implementation)

Planned GitHub Actions workflow:
```yaml
on: push to main
jobs:
  web: next build → vercel deploy
  android: npx cap sync → gradlew bundleRelease → upload to Play Console
  ios: npx cap sync → xcodebuild archive → altool upload
```

See Phase 6 documentation for full CI/CD setup.

## Monitoring

Post-launch monitoring checklist:
- [ ] Vercel Analytics for web performance
- [ ] Supabase Dashboard for API errors
- [ ] App Store Connect Crashes
- [ ] Google Play Android Vitals
- [ ] Sentry (Phase 6 — analytics interface ready in `lib/mobile/analytics.ts`)
