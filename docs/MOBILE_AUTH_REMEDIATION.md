# V Welfare Mobile — Authentication Audit & Remediation

| | |
|---|---|
| **Date** | 2026-07-18 |
| **Branch** | `claude/v-welfare-technical-dossier-fvah3o` |
| **Scope** | `mobile/` authentication only. **No UI changed** (logic/config/tests only). |
| **Tests** | `mobile/__tests__/auth/*` — **20/20 passing** (`node --test`, exit 0). |

---

## 1. Audit findings (before)

| # | Severity | Finding | Evidence |
|---|---|---|---|
| A1 | **High** | Auth session (access JWT + refresh token) persisted in **AsyncStorage — plaintext, not encrypted at rest**. Any process/backup with app-sandbox access could read a live session. | `mobile/lib/supabase.ts:9` `storage: AsyncStorage` |
| A2 | **High** | **Password reset was broken.** `resetPasswordForEmail` used `redirectTo: 'vwelfare://reset-password'`, but the app had **no deep-link handler** to turn the returned link into a session (`detectSessionInUrl: false`, no `Linking` listener). `reset-password.tsx` read `getSession()` once and always found none → "Invalid or expired reset link." | `mobile/lib/supabase.ts:12`; `mobile/app/reset-password.tsx:25-29`; no `Linking`/`exchangeCodeForSession` anywhere |
| A3 | **Medium** | **Anon key committed** to source in `app.json.extra.supabaseAnonKey` (and `supabaseUrl`). Also **dead config** — the client reads `process.env.EXPO_PUBLIC_*`, not `extra`, so these keys were unused. | `mobile/app.json:34-35` vs `mobile/lib/supabase.ts:4-5` |
| A4 | Low | No automated tests for any mobile auth logic. | `mobile/package.json` had no `test` script |

---

## 2. Remediation (after)

### Task 1 — SecureStore auth persistence  *(A1)*
- New `mobile/lib/secureStorage.ts`: a **chunked SecureStore adapter** implementing Supabase's storage contract. SecureStore rejects values > 2048 bytes and a Supabase session exceeds that, so values are transparently split into sub-limit chunks (`<key>.__c0__`, `…`, plus a `<key>.__chunks__` count) and reassembled on read.
- **Migration built in:** on first read of a key, if SecureStore has nothing it falls back to AsyncStorage, moves the value into SecureStore, and deletes the legacy copy. **Existing users keep their session across the upgrade** (UX preserved — no forced logout).
- `mobile/lib/supabase.ts` now wires SecureStore (+ AsyncStorage for migration) into `auth.storage`.
- Non-secret AsyncStorage uses (onboarding flag, language, theme, push token) are intentionally left as-is — they are not secrets.

### Task 2 — Supabase deep linking  *(A2)*
- New `mobile/lib/authLinking.ts` (pure): `parseAuthUrl()` handles **both** link shapes — PKCE `?code=…` and implicit `#access_token=…&refresh_token=…&type=recovery` — and flags recovery links. `establishSessionFromUrl()` calls `exchangeCodeForSession` (PKCE) or `setSession` (implicit).
- New `mobile/lib/useDeepLinkAuth.ts`: subscribes to `Linking.getInitialURL()` (cold start) and `url` events (warm), establishes the session, and routes recovery links to the reset screen.
- `mobile/lib/supabase.ts` sets `flowType: 'pkce'` so recovery/magic links return an exchangeable `code`.
- Wired once in `mobile/app/_layout.tsx` via `useDeepLinkAuth()` — **no JSX/visual change**.
- `supabase/config.toml` adds `vwelfare://reset-password` / `vwelfare://` to `additional_redirect_urls` (local dev; the production allow-list must be set in the Supabase dashboard — see §4).

### Task 3 — Fix password reset  *(A2)*
- With deep linking in place, a recovery link now establishes a session and navigates to `reset-password`.
- `mobile/app/reset-password.tsx` now also subscribes to `onAuthStateChange` (in addition to the one-shot `getSession`), so the screen flips from the "invalid link" state to the password form the moment the async code exchange completes. **JSX/UI is unchanged** — only the session-detection effect was updated.

### Task 4 — Remove credentials from `app.json`  *(A3)*
- Deleted `extra.supabaseUrl` and `extra.supabaseAnonKey`. Kept `extra.eas.projectId`. No code depended on them (client uses `EXPO_PUBLIC_*`), so **no behavior change**.

### Task 5 — Mobile auth regression tests  *(A4)*
- `mobile/__tests__/auth/secureStorage.test.ts` (9 tests) and `mobile/__tests__/auth/authLinking.test.ts` (11 tests).
- `mobile/package.json`: `"test:auth": "node --test __tests__/auth/*.test.ts"`.
- The two library modules are dependency-injected/pure, so they test without a React Native runtime.

---

## 3. Tests executed

```
$ cd mobile && node --test __tests__/auth/*.test.ts
# tests 20
# pass 20
# fail 0
```

Coverage highlights:
- **SecureStore adapter:** small round-trip; chunking a 5000-byte value (no stored chunk > 2048); `removeItem` clears chunks + meta; stale-chunk cleanup on shrink; corrupt/partial read → `null` (never a truncated session); **AsyncStorage→SecureStore migration** returns the value and retires the legacy copy.
- **Deep linking:** PKCE code (query) and implicit tokens (fragment) parsed; recovery detected by `type=recovery` and by path; non-auth URLs ignored (client not called); URL-decoding; `exchangeCodeForSession` vs `setSession` dispatch; error surfaced (expired/missing verifier).

**Not executed here:** full RN integration (device/simulator) — the RN glue (`supabase.ts`, `useDeepLinkAuth.ts`, screen wiring) requires the Expo runtime, which is unavailable in this environment. Logic that could be isolated from RN is fully covered above.

---

## 4. Remaining risks & required follow-ups

1. **Rotate the leaked anon key.** It was committed in git history (`app.json`). Although the anon key is public-by-design and RLS-protected, rotate it in the Supabase dashboard and set it via `EXPO_PUBLIC_SUPABASE_ANON_KEY` / EAS secrets. *(Config, not code.)*
2. **Production redirect allow-list.** Add `vwelfare://reset-password` (and `vwelfare://`) to **Auth → URL Configuration → Redirect URLs** in the Supabase dashboard; `config.toml` only affects local dev.
3. **Recovery on a fresh reinstall.** If a user opens a reset link on a device that has never onboarded, the root layout still routes to onboarding first (pre-existing gating). Low probability; consider bypassing the onboarding gate for recovery links in a follow-up.
4. **PKCE verifier is device-local.** Opening the reset link on a *different* device than the one that requested it cannot complete the exchange (inherent to PKCE); the screen correctly shows the invalid-link state.
5. **`EXPO_PUBLIC_*` values ship in the bundle.** That is expected for the anon key (public), but confirm no non-public secret is ever placed under an `EXPO_PUBLIC_` name.
6. **Env verification.** `mobile/lib/supabase.ts` casts env vars with `as string`; a missing `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` fails at runtime. Consider a startup guard (out of scope here).
