# V Welfare Platform – Incident Response Runbook
**Version:** 1.0  
**Last Updated:** June 30, 2026  
**Maintainer:** DevOps Lead, Security Lead  

---

## 1. INCIDENT SEVERITY LEVELS

### CRITICAL (P1)
- **Response Time:** 5 minutes
- **Examples:** Data breach, complete platform outage, authentication bypass, patient data exposure
- **Escalation:** Immediate notification to all leads, public status page, external communication

### HIGH (P2)
- **Response Time:** 15 minutes
- **Examples:** Partial service degradation, authentication issues for subset of users, email delivery failure
- **Escalation:** Notification to engineering and operations leads

### MEDIUM (P3)
- **Response Time:** 1 hour
- **Examples:** Performance degradation, non-critical API failures, minor UI issues
- **Escalation:** Internal team notification, monitoring escalation

### LOW (P4)
- **Response Time:** 8 hours
- **Examples:** Documentation updates, cosmetic issues, improvement suggestions
- **Escalation:** Backlog ticket

---

## 2. EMERGENCY CONTACTS

| Role | Primary | Secondary | Phone |
|------|---------|-----------|-------|
| **Engineering Lead** | [Name] | [Backup] | [+1-XXX-XXX-XXXX] |
| **DevOps Lead** | [Name] | [Backup] | [+1-XXX-XXX-XXXX] |
| **Security Lead** | [Name] | [Backup] | [+1-XXX-XXX-XXXX] |
| **Product Manager** | [Name] | [Backup] | [+1-XXX-XXX-XXXX] |
| **Escalation (CEO/CTO)** | [Name] | [Backup] | [+1-XXX-XXX-XXXX] |

---

## 3. INCIDENT COMMUNICATION PLAN

### Notification Channels (In Order)
1. **Slack #incidents** - Internal team notification
2. **PagerDuty/On-Call** - Automatic escalation (if configured)
3. **Status Page** (status.vwelfare.com) - Public updates for customers
4. **Email Notification** - Customer communication
5. **Phone** - Critical/P1 escalation

### Status Page Updates
- Update status page every 15 minutes during active incident
- Use clear, non-technical language for customer communications
- Include ETA and impact assessment

### Post-Incident Communication
- Root cause analysis within 24 hours
- Public postmortem within 72 hours
- Customer apology/credit if applicable

---

## 4. DATABASE INCIDENT PROCEDURES

### Scenario: Database Connection Failures

**Detection:**
- Health endpoint returns 503
- Sentry alerts: "database connection error"
- User reports: "cannot load dashboard"

**Immediate Actions (0-5 min):**
1. Check Vercel deployment status: https://vercel.com/dashboard
2. Verify Supabase status: https://status.supabase.com
3. Check Supabase console for active connections/locks
4. Verify environment variables are correctly set: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Diagnosis (5-15 min):**
```bash
# 1. Test Supabase connectivity from Vercel function
curl -X GET https://[YOUR_SUPABASE_URL]/rest/v1/health -H "apikey: [ANON_KEY]"

# 2. Check Supabase query performance
# Go to Supabase console → Database → Diagnostics tab
# Look for long-running queries or connection exhaustion

# 3. Check Vercel function logs
# https://vercel.com/dashboard/[PROJECT]/logs
```

**Resolution Options:**

**Option A - Simple Reconnection** (most common):
- Redeploy application: `vercel deploy --prod`
- Monitor health endpoint recovery

**Option B - Supabase Scale-Up** (if connection exhausted):
1. Log into Supabase dashboard
2. Project Settings → Infrastructure
3. Increase "Max Connections" pool size
4. Restart connection pool

**Option C - Database Restart** (if locked/corrupted):
1. Create backup first (see backup restoration section below)
2. Supabase Dashboard → Database → Restart Database
3. ⚠️ This causes 1-2 min downtime, all connections reset

**Verification:**
```bash
# Monitor recovery via health endpoint
while true; do
  curl -s https://vwelfare.vercel.app/api/health | jq '.status'
  sleep 5
done

# Check Sentry for resolved alerts
# Verify no new user reports in support channels
```

---

## 5. AUTHENTICATION INCIDENT PROCEDURES

### Scenario: Users Cannot Login

**Detection:**
- Sentry alerts: "auth.signInWithPassword failed"
- User reports in support
- Sudden spike in failed auth attempts

**Immediate Actions (0-5 min):**
1. Check Supabase auth status: https://status.supabase.com
2. Verify JWT secret is not expired (Supabase → Project Settings → API)
3. Check if Turnstile CAPTCHA service is down: https://www.cloudflarestatus.com

**Diagnosis:**
```bash
# 1. Test authentication endpoint
curl -X POST https://vwelfare.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"TestPass123!"}'

# 2. Check Supabase auth logs
# Supabase → Authentication → Auth Logs

# 3. Verify Supabase rate limiting not triggered
# Check RLS policies on auth.users table
```

**Resolution:**

**Option A - Verify Supabase Auth Config:**
1. Supabase Dashboard → Authentication → Providers
2. Verify Email provider is enabled
3. Check email templates are configured
4. Restart auth service if needed

**Option B - Clear Redis Cache** (if using rate limiting cache):
```bash
# If using Upstash Redis, clear auth attempt counts
redis-cli FLUSHDB --filter "*auth*"
```

**Option C - Disable CAPTCHA Temporarily** (if Turnstile down):
1. Remove `NEXT_PUBLIC_TURNSTILE_SITE_KEY` from environment
2. Redeploy
3. ⚠️ Temporarily increases bot risk, re-enable ASAP

---

## 6. EMAIL DELIVERY INCIDENT PROCEDURES

### Scenario: Password Reset Emails Not Delivered

**Detection:**
- Sentry alerts: "email delivery failed"
- User reports: "didn't receive reset email"
- Email logs show > 50% failure rate

**Immediate Actions (0-5 min):**
1. Check Supabase email logs: Project → Auth → Email Logs
2. Verify sender email is verified in Supabase
3. Check that email templates are configured

**Diagnosis:**
```bash
# 1. Test email directly via Supabase
# Supabase console → SQL Editor
SELECT * FROM auth.email_change_token_new WHERE email = 'test@example.com' LIMIT 5;

# 2. Check bounce rate
# Supabase → Authentication → Email Templates
# Look for "Bounce Rate" indicator
```

**Resolution:**

**Option A - Verify Email Provider Config:**
1. Supabase → Project Settings → Email
2. Verify SMTP or SendGrid provider is connected
3. Check sender domain has SPF/DKIM/DMARC records

**Option B - Request SPF/DKIM Records Review:**
- SPF record must include Supabase: `v=spf1 include:sendgrid.net ~all` or Supabase's provider
- DKIM records must be configured in DNS
- DMARC policy should be `p=quarantine` or `p=reject`

**Option C - Resend Failed Emails:**
1. Identify failed email addresses from logs
2. Manually trigger password reset for affected users
3. Monitor delivery rate

---

## 7. API RATE LIMITING / DOS INCIDENT

### Scenario: Excessive API Requests / DDoS Attack

**Detection:**
- Sentry alerts: "rate limit threshold exceeded"
- Vercel shows spike in requests
- Users report "429 Too Many Requests" errors

**Immediate Actions (0-5 min):**
1. Check Vercel Analytics → Status to verify traffic surge
2. Review Sentry to identify affected endpoints
3. Notify Cloudflare DDoS protection is monitoring

**Diagnosis:**
```bash
# 1. Identify source of requests
# Vercel Dashboard → Analytics → Top Origins

# 2. Check rate limit status per endpoint
curl https://vwelfare.vercel.app/api/health -v  # check rate limit headers

# 3. Query database rate limiting table
SELECT * FROM rate_limits 
WHERE created_at > NOW() - INTERVAL '15 minutes'
ORDER BY hit_count DESC;
```

**Resolution:**

**Option A - Cloudflare Rate Limiting** (if enabled):
1. Log into Cloudflare dashboard
2. Rules → Rate Limiting
3. Create rule to block IPs exceeding threshold
4. Monitor impact on legitimate traffic

**Option B - Reduce Rate Limit Thresholds Temporarily:**
```bash
# Update database rate limit config
UPDATE rate_limit_config 
SET limit = 10 
WHERE endpoint = '/api/assessments/submit' 
AND limit_type = 'per_user_per_hour';
```

**Option C - Enable Vercel WAF Rules:**
1. Vercel Dashboard → Security → WAF
2. Enable rate limiting rules
3. Monitor false positives

---

## 8. ASSESSMENT SCORING ERROR INCIDENT

### Scenario: Incorrect Assessment Scores / High-Risk Flags Missing

**Detection:**
- Sentry alerts: "scoring algorithm mismatch"
- Clinician reports: "scores look wrong"
- High-risk detection failures

**Immediate Actions (0-5 min):**
1. ✅ PAUSE ASSESSMENT SUBMISSIONS (if critical)
2. Check recent code deployments
3. Review assessment_submissions table for affected records

**Diagnosis:**
```bash
# 1. Verify assessment definitions match official psychometric specs
SELECT 
  assessment_definitions.code,
  COUNT(assessment_items.id) as item_count,
  assessment_definitions.min_score,
  assessment_definitions.max_score
FROM assessment_definitions
LEFT JOIN assessment_items USING (assessment_id)
GROUP BY assessment_definitions.id
ORDER BY assessment_definitions.code;

# 2. Check recent submissions for anomalies
SELECT 
  assessment_submissions.assessment_id,
  assessment_submissions.total_score,
  assessment_submissions.severity_band,
  COUNT(*) as submission_count
FROM assessment_submissions
WHERE submitted_at > NOW() - INTERVAL '1 hour'
GROUP BY assessment_submissions.assessment_id, total_score, severity_band
ORDER BY submission_count DESC;
```

**Resolution:**

**Option A - Rollback Recent Deployment:**
1. Identify problematic deployment
2. Vercel Dashboard → Deployments
3. Select previous stable version
4. Promote to Production

**Option B - Hotfix Scoring Algorithm:**
1. Identify affected assessment code
2. Create emergency PR with fix
3. Deploy with expedited review
4. Run regression tests

**Option C - Recalculate Affected Submissions:**
```bash
-- After fix is deployed, recalculate scores
-- DO NOT RUN without backup first!
UPDATE assessment_submissions
SET 
  total_score = (recalculated_score),
  severity_band = (recalculated_band),
  updated_at = NOW()
WHERE submitted_at > '[ERROR_START_TIME]'
RETURNING id, total_score, severity_band;
```

---

## 9. DATA PRIVACY INCIDENT / POTENTIAL BREACH

### Scenario: Suspected Data Exposure or Unauthorized Access

**Detection:**
- Security alert from monitoring
- Unusual database access patterns
- Customer report of unauthorized data
- External security report/vulnerability disclosure

**Immediate Actions (0-5 min):**
1. ⚠️ CRITICAL: Do not panic or delete logs
2. Isolate affected systems if necessary
3. Begin document collection for forensics
4. Notify legal/compliance team
5. Do NOT publicly disclose until assessed

**Preserve Evidence:**
```bash
# 1. Capture database audit logs
pg_dump -t audit_log [DATABASE_URL] > audit_backup.sql

# 2. Capture Vercel function logs
# Vercel Dashboard → Logs (Export full logs)

# 3. Capture Sentry events
# Sentry → Issues → Export raw JSON

# 4. Preserve Supabase database backups
# Supabase Dashboard → Backups (Request retention)
```

**Diagnosis:**
1. **Determine Scope:** What data was potentially accessed? (PII, assessment results, emails)
2. **Determine Duration:** How long was access possible? (Minutes? Hours? Days?)
3. **Determine Cause:** RLS bypass? Credential compromise? Misconfiguration?
4. **Determine Affected Users:** How many users' data was exposed?

**Resolution:**

**For Configuration Issues (e.g., RLS disabled):**
1. Re-enable RLS policies immediately
2. Audit all recent policy changes
3. Deploy fix
4. Notify users if PII was exposed

**For Credential Compromise:**
1. Rotate all exposed credentials (API keys, database passwords)
2. Review audit logs for unauthorized actions
3. Audit user account access
4. Require password reset for affected users

**For Unknown Vulnerabilities:**
1. Engage security researcher/firm
2. Begin code audit
3. Request bug bounty disclosure timeline
4. Prepare patch

**Communication:**
- Legal team → Compliance assessment (GDPR, HIPAA, state laws)
- Notification to affected users (if required by law)
- Public disclosure only after fix is deployed and verified

---

## 10. VERCEL DEPLOYMENT FAILURE

### Scenario: Deployment Fails, Cannot Promote to Production

**Detection:**
- Deployment fails during build
- CI/CD pipeline shows errors
- Cannot roll out new code

**Immediate Actions (0-5 min):**
1. Check build logs in Vercel Dashboard
2. Identify error type (build, dependency, deployment)
3. Decide: rollback to previous version or fix?

**Diagnosis by Error Type:**

**Build Errors (TypeScript, ESLint):**
```bash
# Verify locally
npm run build

# Check recent commits for breaking changes
git log --oneline -10

# Check TypeScript errors
npx tsc --noEmit
```

**Dependency Errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for incompatible versions
npm audit
```

**Deployment Errors:**
```bash
# Check Vercel logs for memory/timeout issues
# Vercel Dashboard → Function Runtime Logs

# Check environment variables are set
# Vercel Dashboard → Settings → Environment Variables
```

**Resolution:**

**Option A - Rollback to Previous Deployment:**
1. Vercel Dashboard → Deployments
2. Select previous stable deployment
3. Click "Promote to Production"
4. Verify health endpoint recovers

**Option B - Fix and Redeploy:**
1. Identify issue locally
2. Apply fix to code
3. Push to branch
4. Vercel automatically redeploys
5. Promote to production when stable

---

## 11. LOAD TESTING / CAPACITY PLANNING

### Pre-Incident Load Testing

**Purpose:** Validate platform can handle expected peak load

**Timing:** Monthly (first Thursday of month, 10:00 UTC)

**Procedure:**

```bash
# 1. Run 100 concurrent users test
npm run load:100

# 2. Monitor health endpoint during test
# Verify response times stay < 500ms
# Verify error rate stays < 1%

# 3. Run 250 concurrent users test
npm run load:250

# 4. Run 500 concurrent users test
npm run load:500

# 5. Document results in LOAD_TEST_RESULTS.md
# Include: latency percentiles, error rates, bottlenecks
```

**Success Criteria:**
- p50 latency < 200ms
- p95 latency < 500ms
- Error rate < 1%
- CPU usage < 80%
- Memory usage < 70%

---

## 12. BACKUP & DISASTER RECOVERY

### Database Restoration Procedure

**Scenario: Need to restore from backup**

1. **Verify Backup Exists:**
```bash
# Supabase Dashboard → Backups
# Confirm latest backup timestamp
```

2. **Create Restore Plan:**
   - Document all users affected
   - Calculate data loss window
   - Prepare communication

3. **Perform Restore:**
   - Click "Restore from Backup" in Supabase
   - Select target restoration time
   - Confirm (⚠️ WARNING: Data after restore time will be lost)
   - Monitor restore progress

4. **Verify Data Integrity:**
```bash
# 1. Connect to restored database
psql [RESTORED_DATABASE_URL]

# 2. Verify row counts
SELECT 
  tablename, 
  COUNT(*) as row_count 
FROM information_schema.tables 
GROUP BY tablename;

# 3. Check audit logs for completion
SELECT COUNT(*) FROM audit_log;
```

5. **Run Health Checks:**
```bash
curl https://vwelfare.vercel.app/api/health
# Expect: status: "ok", all checks passing
```

---

## 13. POST-INCIDENT PROCEDURES

### Within 1 Hour of Incident Resolution

1. ✅ Verify all systems operational
2. ✅ Confirm users can access platform
3. ✅ Update status page: "RESOLVED"
4. ✅ Send team notification: incident resolved

### Within 24 Hours

1. Create incident timeline document
2. Identify root cause
3. List immediate fixes applied
4. Begin detailed post-mortem

### Within 72 Hours

1. Complete root cause analysis
2. Publish public postmortem
3. List permanent preventive measures
4. Schedule follow-up improvements

### RCA Template

```markdown
## Incident Post-Mortem

**Date:** YYYY-MM-DD  
**Severity:** P1/P2/P3/P4  
**Duration:** HH:MM to HH:MM (XX minutes)  
**Affected Users:** ~XXX  

### What Happened
[Detailed timeline of events]

### Root Cause
[Why did this happen?]

### Immediate Actions Taken
[Quick fixes applied during incident]

### Permanent Fixes
[Changes to prevent recurrence]

### Monitoring Improvements
[New alerts to catch similar issues]

### Timeline
- HH:MM - Issue detected
- HH:MM - Incident declared P1
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Verified resolved

### Next Steps
1. [Action item 1]
2. [Action item 2]
3. [Action item 3]
```

---

## 14. MONITORING & ALERTING CONFIGURATION

### Required Alerts (Sentry Configuration)

| Alert | Threshold | Action |
|-------|-----------|--------|
| Error Rate Spike | > 5% errors in 5 min | Page on-call, check dashboard |
| Database Connection Failed | Any | Critical page, begin recovery |
| Health Endpoint 503 | Sustained > 30s | Critical page, check database |
| Rate Limit Exceeded | > 1000 req/min from single IP | Alert DevOps, may indicate DDoS |
| Authentication Failure Rate | > 10% in 1 hour | Alert security, check auth logs |
| PDF Generation Timeout | Any timeout | Alert engineering, check memory |

### Monitoring Tools

- **Sentry:** Error tracking, performance monitoring → https://sentry.io
- **Vercel Analytics:** Request metrics, Core Web Vitals → Vercel Dashboard
- **Health Endpoint:** Manual monitoring → GET `/api/health`
- **Status Page:** Customer communication → status.vwelfare.com (if configured)

---

## 15. QUICK REFERENCE CHECKLIST

### Incident Declared - Immediately Do:
- [ ] Notify team in #incidents
- [ ] Set on-call status to "In Incident"
- [ ] Update status page
- [ ] Identify P1/P2/P3/P4
- [ ] Assign incident commander

### Diagnosis Phase:
- [ ] Check health endpoint: `curl /api/health`
- [ ] Review Sentry alerts
- [ ] Check Vercel deployment status
- [ ] Review Supabase status page
- [ ] Check error logs for patterns

### Recovery Phase:
- [ ] Apply immediate fix (rollback or hotfix)
- [ ] Verify with health endpoint
- [ ] Confirm user reports resolved
- [ ] Update status page

### Post-Incident Phase:
- [ ] Document incident timeline
- [ ] Create RCA within 24 hours
- [ ] Implement permanent fixes
- [ ] Update monitoring/alerts
- [ ] Publish postmortem within 72 hours

---

**Last Updated:** June 30, 2026  
**Next Review:** September 30, 2026
