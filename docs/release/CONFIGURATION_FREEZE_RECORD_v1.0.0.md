# V Welfare — Configuration Freeze Record v1.0.0

| Field | Value |
|---|---|
| **Document ID** | `REL-CFG-100` |
| **Document version** | `1.0.0` |
| **Document status** | `ACTIVE` |
| **Effective date (UTC)** | `2026-07-26` |
| **Owner** | DevOps On-call |
| **Approver** | Release Manager |
| **Release** | `v1.0.0` |
| **Companion** | `REL-FRZ-100` Release Freeze Certificate |

---

## 1. Freeze interval

| Field | Value |
|---|---|
| Freeze start (UTC) | |
| Freeze end (UTC) | |
| RELEASE_COMMIT frozen | |
| Env target | Vercel Production + Supabase `wyzezyctpvlohuuhzyof` |

---

## 2. Configuration items frozen

| Item | Frozen value / “unchanged” attestation | Verified ☐ |
|---|---|---|
| Vercel Production env vars | No adds/edits/deletes during freeze | ☐ |
| `NEXT_PUBLIC_SITE_URL` | `https://app.vwelfare.com` | ☐ |
| Supabase API keys | Unchanged (no rotation mid-window) | ☐ |
| DNS / domain alias | Unchanged except promote of RELEASE_COMMIT | ☐ |
| Stripe / Gemini / Turnstile / Sentry secrets | Unchanged | ☐ |
| Feature flags (if any) | Unchanged unless listed in Package | ☐ |

**Allowed config change during freeze (runbook only):** Supabase Auth **leaked-password protection** enablement (`REL-PKG-100` §5.3).

---

## 3. Attestation

- [ ] No environment variables were changed outside §5.3 Auth toggle.  
- [ ] No secret rotation performed during freeze.  
- [ ] No Vercel project setting changes (Node version, root dir, etc.).  
- [ ] No Supabase project setting changes except leaked-password enable.  

| Role | Name | Decision | Date (UTC) | Signature |
|---|---|---|---|---|
| DevOps On-call | | | | |
| Release Manager | | | | |
