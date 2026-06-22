# Claude Final Go-Live Audit Prompt

You are acting as a Senior Software Architect, Cybersecurity Auditor, QA Lead, SEO Specialist, DevOps Engineer, Accessibility Auditor, Product Manager, and Production Release Manager.

Your mission is to perform a **FULL GO-LIVE AUDIT** of this platform and provide a final executive recommendation:

# FINAL DECISION REQUIRED

At the end of the audit, issue ONE of these verdicts:

✅ GO LIVE

⚠️ GO LIVE WITH CONDITIONS

❌ DO NOT GO LIVE

The decision must be evidence-based and supported by findings.

---

# Platform Context

The platform is deployed on:

* Vercel
* Supabase
* Gemini API
* Custom authentication system
* Assessment engine
* User dashboard
* Admin dashboard
* PDF export functionality
* Bilingual Arabic / English support
* RTL support
* Psychometric assessment workflows

This is a healthcare-related platform handling sensitive mental health information.

Therefore evaluate according to:

* OWASP Top 10
* GDPR principles
* HIPAA-inspired best practices
* SOC2 principles
* WCAG 2.2
* Core Web Vitals
* Modern SaaS best practices

---

# PHASE 1 – SECURITY AUDIT

Perform a complete security assessment.

## Authentication

Check:

* Login
* Registration
* Password reset
* Session handling
* Logout
* Session expiration
* JWT implementation
* Token storage
* Refresh tokens
* Multi-tab behavior

Verify:

* account enumeration
* brute force protection
* credential stuffing protection
* password requirements
* lockout policies

---

## Authorization

Verify:

* User cannot access another user's data
* User cannot modify another user's results
* User cannot access admin routes
* Admin permissions are enforced
* Role escalation is impossible

Test:

* URL manipulation
* Parameter manipulation
* API manipulation

---

## Supabase Security

Audit:

* Row Level Security (RLS)
* Storage policies
* Public buckets
* Anonymous access
* Service role exposure
* API key exposure
* Environment variables

Verify:

* no secrets exposed in frontend
* no privileged endpoints exposed

---

## OWASP Top 10 Review

Test for:

* Broken access control
* Cryptographic failures
* Injection vulnerabilities
* Insecure design
* Security misconfiguration
* Vulnerable components
* Authentication failures
* Data integrity failures
* Logging failures
* SSRF

Provide findings and severity.

---

## Data Protection

Verify:

* PII protection
* assessment results protection
* PDF export security
* file storage security
* HTTPS enforcement
* secure headers

Check:

* CSP
* HSTS
* X-Frame-Options
* X-Content-Type-Options
* Referrer Policy

---

## API Security

Review every API endpoint.

Verify:

* authorization
* validation
* rate limiting
* abuse prevention
* error handling

Check whether APIs leak:

* emails
* user IDs
* internal data
* stack traces
* database schema

---

## Security Score

Provide:

Security Score: X/100

Critical Issues:

High Issues:

Medium Issues:

Low Issues:

---

# PHASE 2 – FUNCTIONAL AUDIT

Test every workflow.

---

## User Registration

Verify:

* registration
* email verification
* login
* logout
* forgot password
* profile creation

---

## Assessment Engine

For every assessment:

Verify:

* questions load correctly
* progress tracking works
* responses save correctly
* scoring works
* interpretation works
* PDF export works

Check:

* interrupted sessions
* browser refresh
* mobile devices

---

## User Dashboard

Verify:

* results history
* profile updates
* exports
* navigation

---

## Admin Dashboard

Verify:

* analytics
* user statistics
* filtering
* exports
* assessment reporting

Check for:

* performance issues
* inaccurate counts
* broken filters

---

## Error Handling

Force:

* invalid input
* malformed URLs
* API failures
* timeout scenarios
* missing data

Evaluate platform behavior.

---

## Mobile Testing

Test:

* iPhone
* Android
* tablet

Check:

* responsiveness
* navigation
* RTL behavior

---

## Browser Testing

Test:

* Chrome
* Edge
* Safari
* Firefox

---

## Functional Score

Provide:

Functionality Score: X/100

Critical Issues:

High Issues:

Medium Issues:

Low Issues:

---

# PHASE 3 – PERFORMANCE AUDIT

Evaluate:

## Core Web Vitals

Measure:

* LCP
* CLS
* INP

---

## Load Testing

Simulate:

* 10 users
* 50 users
* 100 users
* 500 users

Identify bottlenecks.

---

## Database Performance

Review:

* slow queries
* missing indexes
* redundant queries
* N+1 issues

---

## Vercel Optimization

Verify:

* caching
* edge functions
* image optimization
* bundle size

---

## Supabase Optimization

Verify:

* indexes
* query efficiency
* RLS performance

---

## Performance Score

Performance Score: X/100

---

# PHASE 4 – SEO AUDIT

Perform a complete SEO review.

---

## Technical SEO

Verify:

* sitemap.xml
* robots.txt
* canonical URLs
* metadata
* Open Graph tags
* Twitter cards

---

## Indexability

Check:

* crawlability
* duplicate content
* broken links
* redirect chains

---

## Structured Data

Verify schema markup.

Recommend additions.

---

## Content SEO

Review:

* page titles
* headings
* descriptions
* keyword targeting

---

## International SEO

Verify:

* Arabic SEO
* English SEO
* hreflang implementation
* RTL compatibility

---

## SEO Score

SEO Score: X/100

---

# PHASE 5 – ACCESSIBILITY AUDIT

Audit according to WCAG 2.2.

Verify:

* keyboard navigation
* focus states
* screen reader compatibility
* color contrast
* form labels
* RTL accessibility

Provide score.

---

# PHASE 6 – HEALTHCARE COMPLIANCE REVIEW

Because this platform handles mental health data:

Verify:

* informed consent
* privacy notices
* disclaimer visibility
* emergency information
* user rights
* data retention policies

Evaluate legal and ethical risks.

---

# PHASE 7 – USER EXPERIENCE AUDIT

Evaluate:

* onboarding
* navigation
* assessment completion flow
* dashboard usability
* trust signals
* visual consistency

Identify friction points.

Provide UX Score.

---

# PHASE 8 – CODE QUALITY REVIEW

Review:

* architecture
* maintainability
* technical debt
* component structure
* security patterns
* scalability

Provide score.

---

# PHASE 9 – RELEASE READINESS CHECKLIST

Provide pass/fail status for:

* Security
* Authentication
* Authorization
* Database
* APIs
* Assessments
* Exports
* Mobile
* SEO
* Accessibility
* Analytics
* Monitoring
* Backups
* Disaster Recovery

---

# PHASE 10 – FINAL EXECUTIVE REPORT

Generate:

## Executive Summary

One-page summary suitable for founders and investors.

---

## Risk Matrix

| Risk | Severity | Probability | Impact | Recommendation |

---

## Launch Blockers

List ONLY issues that must be fixed before launch.

---

## 30-Day Post Launch Risks

List issues acceptable for later remediation.

---

## Final Scores

Security: X/100

Functionality: X/100

Performance: X/100

SEO: X/100

Accessibility: X/100

Compliance: X/100

UX: X/100

Code Quality: X/100

Overall Readiness: X/100

---

# FINAL DECISION

Choose exactly one:

✅ GO LIVE

⚠️ GO LIVE WITH CONDITIONS

❌ DO NOT GO LIVE

Then explain in detail why.

---

# Deliverables Required

1. Executive Report (PDF-ready format)
2. Technical Findings Report
3. Security Findings Report
4. SEO Report
5. Accessibility Report
6. Prioritized Remediation Plan
7. Go-Live Checklist
8. Critical Bugs List
9. Recommended Fixes With Exact Implementation Steps
10. Estimated Effort (Hours) For Each Fix

Do not stop until every page, route, workflow, API endpoint, database interaction, admin feature, assessment workflow, and export feature has been evaluated. Produce evidence for every finding and include screenshots where possible.
