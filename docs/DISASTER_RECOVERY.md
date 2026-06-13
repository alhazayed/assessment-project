# V Welfare — Disaster Recovery Plan

**Version:** 1.0  
**Last Updated:** 2026-06-13  
**Owner:** Platform Engineering  
**Contact:** info@vwelfare.com

---

## Recovery Objectives

| Metric | Target | Rationale |
|---|---|---|
| **RPO** (Recovery Point Objective) | **4 hours** | Maximum acceptable data loss for psychiatric/clinical records |
| **RTO** (Recovery Time Objective) | **8 hours** | Maximum acceptable downtime before clinical impact is significant |

---

## 1. Infrastructure Overview

| Component | Provider | Tier |
|---|---|---|
| Frontend / API | Vercel | Pro |
| Database | Supabase | Pro (PostgreSQL 15) |
| Auth | Supabase Auth | Included |
| File Storage | Supabase Storage | Included |
| AI (Gemini) | Google Cloud | Pay-as-you-go |
| Rate Limiting | Supabase `rate_limit_log` | Included |
| DNS / CDN / DDoS | Cloudflare | Free+ |

---

## 2. Backup Strategy

### 2.1 Database Backups (Supabase)

Supabase Pro includes:
- **Daily automated snapshots** — retained for 7 days
- **Point-in-time recovery (PITR)** — available on Team plan ($599/mo); required to meet 4-hour RPO

**Action required:** Confirm plan includes PITR or upgrade to Team tier before launch.

To verify PITR is enabled:
```
Supabase Dashboard → Project Settings → Database → Backups → Point-in-time recovery
```

### 2.2 Critical Tables (restore priority order)

| Priority | Table | Description |
|---|---|---|
| P0 | `profiles` | All user accounts and demographics |
| P0 | `assessment_submissions` | All clinical assessment results |
| P0 | `assessment_responses` | Individual item-level responses |
| P0 | `audit_log` | Immutable audit trail |
| P1 | `mood_logs` | Patient mood history |
| P1 | `journal_entries` | Patient journal data |
| P1 | `messages` | Patient-clinician messages |
| P1 | `notifications` | In-app notifications |
| P2 | `assessment_definitions` | Assessment templates (can be re-seeded) |
| P2 | `assessment_items` | Question items (can be re-seeded) |
| P3 | `rate_limit_log` | Ephemeral — loss acceptable |
| P3 | `announcements` | Admin-managed content |

### 2.3 Environment Variables Backup

All secrets must be stored in a secure secrets manager (e.g., 1Password Teams, AWS Secrets Manager, or HashiCorp Vault).  
**Never store secrets in git.**

| Variable | Location |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Secrets manager |
| `GEMINI_API_KEY` | Secrets manager |
| `ADMIN_PIN` | Secrets manager |
| `TURNSTILE_SECRET_KEY` | Secrets manager |
| `UPSTASH_REDIS_REST_URL` | Secrets manager |
| `UPSTASH_REDIS_REST_TOKEN` | Secrets manager |
| `NEXT_PUBLIC_SUPABASE_URL` | Secrets manager (non-secret but document) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Secrets manager |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Secrets manager |
| `AI_DAILY_BUDGET_USD` | Secrets manager |

---

## 3. Restore Procedure

### 3.1 Database Restore (Supabase PITR)

1. Navigate to **Supabase Dashboard → Project Settings → Backups**
2. Select **Point-in-time recovery** tab
3. Choose the restore timestamp (target: ≤ 4 hours before incident)
4. Click **Restore to a new project** (do NOT restore over production until verified)
5. Verify data integrity on the new project:
   ```sql
   SELECT COUNT(*) FROM assessment_submissions;
   SELECT COUNT(*) FROM profiles;
   SELECT MAX(submitted_at) FROM assessment_submissions;
   ```
6. Update `NEXT_PUBLIC_SUPABASE_URL` in Vercel environment variables to point to restored project
7. Redeploy on Vercel: **Dashboard → Deployments → Redeploy**
8. Verify end-to-end health via `/api/health` (if implemented) or manual smoke test

**Estimated time:** 30–90 minutes

### 3.2 Application Restore (Vercel)

Vercel maintains full deployment history. To roll back:

1. Navigate to **Vercel Dashboard → Deployments**
2. Find the last known-good deployment
3. Click **⋯ → Promote to Production**
4. Verify the deployment is live

**Estimated time:** 5–10 minutes

### 3.3 Full Environment Recovery (new Supabase project + new Vercel project)

1. **Restore DB** from snapshot to a new Supabase project (see 3.1)
2. **Configure RLS**: Re-apply all migrations from `supabase/migrations/` in order
3. **Set environment variables** in new Vercel project from secrets manager
4. **Update Vercel project** to new Supabase URL/keys
5. **Update Cloudflare DNS** CNAME to point to new Vercel deployment URL
6. **Update Supabase auth redirect URLs** under Authentication → URL Configuration
7. **Verify Turnstile** site key is still valid for the domain
8. **Run smoke test** (see Section 5)

**Estimated time:** 4–8 hours (within RTO)

---

## 4. Secret Recovery

If secrets are lost or compromised:

| Secret | Recovery Action |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Regenerate: Supabase → Project Settings → API → Rotate service role key |
| `GEMINI_API_KEY` | Regenerate: Google Cloud Console → APIs & Services → Credentials |
| `ADMIN_PIN` | Update in env vars + redeploy; all existing admin sessions will be invalidated (HMAC mismatch) |
| `TURNSTILE_SECRET_KEY` | Regenerate: Cloudflare → Turnstile → Site settings → Rotate secret key |
| `UPSTASH_REDIS_REST_TOKEN` | Regenerate: Upstash Console → Database → REST API → Reset token |

**After any secret rotation:** redeploy the Vercel project to pick up new values.

---

## 5. Smoke Test Checklist

Run after any restore or recovery operation:

```
[ ] GET /                         → 200, landing page loads
[ ] GET /login                    → 200, login form renders
[ ] POST /api/auth/forgot-password → 200, returns { ok: true }
[ ] GET /x/control/login          → 200, admin login form renders
[ ] Supabase auth sign-in         → session created, JWT valid
[ ] Admin login with correct PIN  → admin_session cookie set
[ ] Admin panel /x/control/overview → stats load
[ ] Guest assessment submit       → 200, returns score + band
[ ] Authenticated assessment submit → 200, submission saved
[ ] Notification bell             → notifications load
[ ] PDF report generation         → 200, PDF returned
```

---

## 6. Rollback Procedure

### Application Rollback (Vercel)

1. Identify the last stable deployment hash: `git log --oneline`
2. In Vercel Dashboard → Deployments, find the commit hash
3. Click **Promote to Production**
4. Verify with smoke test (Section 5)

### Database Migration Rollback

Supabase does not automatically reverse migrations. To rollback a schema change:

1. Write a reversal migration in `supabase/migrations/` with timestamp prefix
2. Apply via Supabase MCP tool: `apply_migration`
3. Verify table structure and RLS policies are intact

---

## 7. Monitoring & Alerting

### Recommended Setup (pre-launch)

| What | Tool | Threshold |
|---|---|---|
| Uptime | Vercel built-in / BetterUptime | Alert if down > 2 min |
| Error rate | Vercel logs + Sentry | Alert if 5xx rate > 1% |
| Gemini spend | Google Cloud Billing Alerts | Alert at 50% and 100% of `AI_DAILY_BUDGET_USD` |
| DB connections | Supabase metrics | Alert if pool > 80% utilised |
| Rate limit hits | Query `rate_limit_log` | Alert if any key hits limit >50% of window |

### Monthly DR Test

Schedule a monthly drill:
1. Restore a DB snapshot to a **staging** project
2. Verify all P0 tables are intact and data matches production
3. Document the restore time and any issues encountered
4. Update this document if procedures change

---

## 8. Contact Matrix

| Scenario | First Contact | Escalation |
|---|---|---|
| Vercel outage | Vercel Status Page (status.vercel.com) | Vercel Support |
| Supabase outage | Supabase Status Page (status.supabase.com) | Supabase Support |
| Gemini API outage | Google Cloud Status | Use fallback: disable AI endpoints |
| Data breach | info@vwelfare.com | Legal counsel + PDPL authority notification within 72h |
| Admin account compromised | Rotate `ADMIN_PIN` immediately | Audit `audit_log` table |
