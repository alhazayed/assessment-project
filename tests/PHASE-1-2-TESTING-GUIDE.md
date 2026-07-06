# Phase 1 & Phase 2 Testing Guide

## Overview

This guide covers the execution of:
- **Phase 1**: End-to-End Clinical Validation (browser-based testing)
- **Phase 2**: Performance & Load Testing (k6-based load testing)

## Prerequisites

### Installation

```bash
# Install Playwright test dependencies
npm install --save-dev @playwright/test

# For Phase 2 load testing, install k6
# On macOS: brew install k6
# On Linux: https://dl.k6.io/releases/latest/k6-linux-amd64.tar.gz
# On Windows: https://dl.k6.io/releases/latest/k6-windows-amd64.zip

# Or use k6 cloud (no installation needed):
# https://cloud.k6.io/
```

### Environment Setup

```bash
# Set BASE_URL for tests
export BASE_URL=http://localhost:3000
# or for production:
export BASE_URL=https://your-deployed-url.vercel.app
```

---

## Phase 1: End-to-End Clinical Validation

### Purpose

Verify every complete workflow across all user roles:
- Guest (no login)
- Patient (registered user)
- Clinician (healthcare provider)
- Admin (platform administrator)
- Superadmin (infrastructure admin)

In both **Arabic** and **English**, across **desktop**, **tablet**, and **mobile**.

### Test File Location

`tests/e2e/phase-1-clinical-workflows.spec.ts`

### Running Phase 1 Tests

#### Option 1: Run All Tests

```bash
npx playwright test tests/e2e/phase-1-clinical-workflows.spec.ts
```

#### Option 2: Run Specific Workflow

```bash
# Guest assessment workflow
npx playwright test --grep "Guest Assessment Workflow"

# Patient registration
npx playwright test --grep "Patient Registration"

# Clinician workflow
npx playwright test --grep "Clinician Workflow"

# Admin dashboard
npx playwright test --grep "Admin Dashboard"

# Session management
npx playwright test --grep "Session Management"

# Mobile responsiveness
npx playwright test --grep "Mobile Responsiveness"

# Accessibility
npx playwright test --grep "Accessibility"
```

#### Option 3: Run with Specific Browser

```bash
# Chromium only
npx playwright test --project=chromium tests/e2e/phase-1-clinical-workflows.spec.ts

# Firefox
npx playwright test --project=firefox tests/e2e/phase-1-clinical-workflows.spec.ts

# WebKit (Safari)
npx playwright test --project=webkit tests/e2e/phase-1-clinical-workflows.spec.ts

# All browsers
npx playwright test tests/e2e/phase-1-clinical-workflows.spec.ts
```

#### Option 4: Debug Mode

```bash
npx playwright test tests/e2e/phase-1-clinical-workflows.spec.ts --debug
```

This opens the Playwright Inspector, allowing step-by-step test execution.

#### Option 5: Headed Mode (Watch Tests Run)

```bash
npx playwright test --headed tests/e2e/phase-1-clinical-workflows.spec.ts
```

### Test Workflows Covered

1. **Guest Assessment Submission** (English)
   - Navigate to platform
   - Select assessment
   - Complete assessment
   - View and interpret results
   - Generate PDF export

2. **Guest Assessment Submission** (Arabic)
   - Language switching
   - RTL layout verification
   - Assessment completion in Arabic
   - Arabic interpretation display

3. **Patient Registration & Login**
   - User registration
   - Email verification flow
   - Login authentication
   - Session creation
   - Assessment completion
   - Assessment history access

4. **Clinician Workflow**
   - Login as clinician
   - View patient assessments
   - Send messages to patients
   - Access patient results

5. **Admin Dashboard**
   - Admin authentication
   - Dashboard load with stats
   - Widget loading verification
   - Error handling verification
   - Analytics access
   - Data filtering and export

6. **Session Management & Security**
   - Logout functionality
   - Password reset flow
   - Unauthorized access prevention
   - Session expiration

7. **Mobile Responsiveness**
   - Viewport adaptation
   - Touch target sizing (≥44px)
   - No horizontal scroll issues

8. **Accessibility Compliance**
   - Keyboard navigation
   - Color contrast verification
   - Screen reader compatibility
   - ARIA labels and semantic HTML

### Expected Results - Phase 1

✅ **All Workflows Pass** when:
- No assertion failures
- No timeout errors (>5s)
- No console errors
- No React warnings
- Navigation completes successfully
- Forms submit without errors
- PDF exports generate
- Results display correctly
- No 500 errors in responses

### Troubleshooting - Phase 1

| Issue | Solution |
|-------|----------|
| Tests fail to connect | Verify BASE_URL is correct, app is running |
| Timeout errors | Increase timeout in tests, check network |
| Element not found | Update selectors if UI changed |
| PDF export fails | Verify Supabase PDF function deployed |
| Mobile tests fail | Check responsive design CSS |
| Arabic text issues | Verify Arabic font loaded, RTL CSS applied |

---

## Phase 2: Performance & Load Testing

### Purpose

Measure system behavior under concurrent user load:
- 100 concurrent users (warm up)
- 250 concurrent users (ramp up)
- 500 concurrent users (stress test)
- 1000 concurrent users (spike test)

Measure:
- Request latency (P50, P95, P99)
- Error rates
- Widget load times
- API response times
- PDF generation performance
- Database query latency
- RPC duration
- Connection pool health

### Test File Location

`tests/load/phase-2-load-test.js`

### Running Phase 2 Tests

#### Option 1: Run with k6 CLI

```bash
# Run all scenarios
k6 run tests/load/phase-2-load-test.js

# Run with custom base URL
BASE_URL=https://your-url.vercel.app k6 run tests/load/phase-2-load-test.js

# Run single scenario
k6 run --stage "warmup:10s@100" tests/load/phase-2-load-test.js
```

#### Option 2: Run with k6 Cloud

```bash
# Upload and run tests in k6 cloud (no local resources needed)
k6 cloud tests/load/phase-2-load-test.js
```

#### Option 3: Run with VUs (Virtual Users) control

```bash
# Run with 50 VUs for 5 minutes
k6 run -u 50 -d 5m tests/load/phase-2-load-test.js

# Ramp from 0 to 500 VUs over 10 minutes
k6 run -u 0 -s 500/10m tests/load/phase-2-load-test.js
```

### Load Test Scenarios

#### Scenario 1: Warmup (100 VUs, 2 minutes)
- Tests: Homepage, assessment list, dashboard, stats API, widgets
- Purpose: Establish baseline, warm up caches
- SLA: P95 latency < 300ms

#### Scenario 2: Ramp Up (100→250 VUs, 5 minutes sustained)
- Tests: Complete workflows, admin dashboard, patient dashboard, search, export
- Purpose: Test system under increasing load
- SLA: P95 latency < 500ms, error rate < 10%

#### Scenario 3: Stress Test (500 VUs constant, 5 minutes)
- Tests: Database queries, concurrent submissions, analytics, widget fetching
- Purpose: Identify breaking points
- SLA: P95 latency < 1s, error rate < 20%

#### Scenario 4: Spike Test (500→1000 VUs, 3 minute sustained)
- Tests: High-load assessment submissions, dashboard under load, API stability
- Purpose: Test recovery and degradation
- SLA: Completes in < 5s, no cascading failures

### Expected Metrics - Phase 2

```
Metric                          Target        Actual
────────────────────────────────────────────────────
P95 Latency (100 VU)           < 300ms        _____ ms
P95 Latency (250 VU)           < 500ms        _____ ms
P95 Latency (500 VU)           < 1000ms       _____ ms
P99 Latency (100 VU)           < 500ms        _____ ms
P99 Latency (250 VU)           < 1000ms       _____ ms
Error Rate (warmup)            < 1%           _____ %
Error Rate (ramp)              < 10%          _____ %
Error Rate (stress)            < 20%          _____ %
Error Rate (spike)             < 30%          _____ %
Widget Load Time (P95)         < 300ms        _____ ms
API Response Time (P95)        < 500ms        _____ ms
PDF Generation Time            < 5000ms       _____ ms
Connection Pool Health         Available      ✓ / ✗
Database Query Health          < 100ms (P95)  _____ ms
```

### Interpreting k6 Results

```
Output example:
✓ all endpoints return response under spike
✓ no timeout issues under 1000 user spike
✗ error rate is contained

Summary:
  504 Passed checks
  2 Failed checks
  Checks for P95 < 500ms: PASS
  Checks for P95 < 1000ms: PASS
  http_req_duration.....: avg=245ms  min=50ms   med=180ms  max=8500ms p(95)=520ms p(99)=1200ms
  http_req_failed........: 0.3%     22 out of 7342 requests
```

### Performance SLAs

| Metric | Warmup | Ramp | Stress | Spike |
|--------|--------|------|--------|-------|
| P95 Latency | <300ms | <500ms | <1000ms | <2000ms |
| P99 Latency | <500ms | <1000ms | <2000ms | <5000ms |
| Error Rate | <1% | <10% | <20% | <30% |
| Success Rate | >99% | >90% | >80% | >70% |

### Bottleneck Analysis

If metrics are exceeded, investigate:

1. **High Latency**
   - Check database query performance
   - Verify index usage
   - Monitor RLS policy evaluation
   - Check connection pool exhaustion
   - Review RPC complexity

2. **High Error Rate**
   - Monitor Sentry for errors
   - Check database constraints (unique key, FK violations)
   - Verify rate limiting not triggered
   - Check for timeout cascades
   - Review API logging

3. **Slow Widget Load**
   - Verify React Query cache hits
   - Check materialized view refresh jobs
   - Monitor API response time for widget endpoints
   - Review data aggregation logic

4. **PDF Generation Timeout**
   - Check Gemini API latency
   - Verify PDF library performance
   - Monitor memory usage
   - Check for blocking operations

### Troubleshooting - Phase 2

| Issue | Solution |
|-------|----------|
| k6 command not found | Install k6, add to PATH |
| Connection refused | Verify BASE_URL, app is running |
| High error rate | Check app logs, reduce VU count |
| Memory exceeded | Run on powerful machine or reduce duration |
| Network issues | Use k6 cloud instead for distributed testing |

---

## Phase 12: Production Verification

### Deployment Prerequisites

Before running Phase 12, ensure:

1. **Vercel Preview Deployment**
   ```bash
   # Automatic on PR creation, or:
   vercel --prod
   ```

2. **Environment Variables Set**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `SENTRY_AUTH_TOKEN`

3. **Database Migrations Applied**
   - All pending migrations must be applied to production
   - Materialized view refresh jobs must be scheduled

4. **Monitoring Active**
   - Sentry configured and reporting
   - Vercel Analytics enabled
   - Speed Insights activated

### Phase 12 Testing

Run Phase 1 tests against production URL:

```bash
BASE_URL=https://your-app.vercel.app npx playwright test tests/e2e/phase-1-clinical-workflows.spec.ts
```

Run Phase 2 load tests against production:

```bash
BASE_URL=https://your-app.vercel.app k6 run tests/load/phase-2-load-test.js
```

### Verification Checklist

- [ ] No console errors in Chrome DevTools
- [ ] No failed network requests (404, 500)
- [ ] No React hydration warnings
- [ ] No memory leaks detected
- [ ] All 5 widgets load on admin dashboard
- [ ] No "Failed to fetch stats" error
- [ ] PDF export completes successfully
- [ ] Mobile layout responsive
- [ ] Arabic layout RTL correct
- [ ] Assessment completion flow works
- [ ] High-risk detection triggers correctly
- [ ] Messaging works between users
- [ ] Admin filtering and export work
- [ ] Load test error rate < 1% (warmup)

---

## Summary Report Template

Create a file `tests/PHASE-1-2-RESULTS.md` with findings:

```markdown
# Phase 1 & 2 Testing Results
Date: [DATE]
Environment: [DEV/STAGING/PRODUCTION]

## Phase 1: End-to-End Clinical Validation

### Test Execution
- Duration: _____ minutes
- Total Tests: _____
- Passed: _____ ✓
- Failed: _____ ✗
- Skipped: _____

### Workflows Tested
- [ ] Guest Assessment (English)
- [ ] Guest Assessment (Arabic)
- [ ] Patient Registration
- [ ] Patient Assessment & History
- [ ] Clinician Review & Messaging
- [ ] Admin Dashboard & Analytics
- [ ] Session Management & Security
- [ ] Mobile Responsiveness
- [ ] Accessibility (WCAG 2.2)

### Issues Found
1. [Issue description with severity]
2. ...

### Screenshots/Evidence
[Links to test recordings or screenshots]

## Phase 2: Performance & Load Testing

### Test Execution
- Warmup: [Results]
- Ramp Up: [Results]
- Stress: [Results]
- Spike: [Results]

### Performance Metrics
- P95 Latency: _____ ms
- P99 Latency: _____ ms
- Error Rate: _____ %
- Widget Load Time: _____ ms
- API Response Time: _____ ms

### Bottlenecks Identified
1. [Bottleneck with recommendation]
2. ...

### SLA Compliance
- [ ] P95 < 500ms (production)
- [ ] Error rate < 1% (production)
- [ ] No timeout cascades
- [ ] Connection pool healthy

## Overall Readiness

✅ READY FOR PRODUCTION
⚠️ READY WITH CONDITIONS
❌ NOT READY

Reason: [Detailed explanation]
```

---

## Next Steps

1. **Execute Phase 1**: Run end-to-end tests, document any failures
2. **Fix Issues**: Address any bugs found in Phase 1
3. **Execute Phase 2**: Run load tests against production environment
4. **Analyze Results**: Compare against SLAs, identify optimizations
5. **Optimize**: Fix bottlenecks, improve performance
6. **Deploy**: Push optimized code to production
7. **Monitor**: Watch Sentry, Vercel Analytics for 48 hours
8. **Certify**: Issue final enterprise readiness certification

---

## Reference Documentation

- Playwright Documentation: https://playwright.dev
- k6 Documentation: https://k6.io/docs
- k6 Cloud: https://cloud.k6.io
- Vercel Observability: https://vercel.com/docs/observability
- Sentry Documentation: https://docs.sentry.io
