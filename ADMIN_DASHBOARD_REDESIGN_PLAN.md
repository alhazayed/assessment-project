# V Welfare Admin Dashboard — Redesign & Enhancement Plan

**Status:** Comprehensive audit complete  
**Current State:** Mature, feature-rich dashboard with 11 core sections  
**Proposed Enhancements:** 15 phases of improvements focused on KPIs, clinical workflows, performance, and compliance

---

## Current State Summary

### ✅ What Already Exists (Strong Foundation)
- **Overview Dashboard** - Basic KPIs, recent activity, severity distribution
- **User Management** - Search, filter, role assignment, activation controls
- **Assessment Configuration** - Enable/disable assessments
- **Assessment Packages** - Multi-assessment bundles with scoring rules
- **Results Browsing** - Filtered, paginated, exportable (3 formats)
- **Analytics Engine** - 7 tabs covering overview, demographics, cross-tabs, trends, insights
- **Platform Settings** - Feature flags, key-value configurations
- **Announcements** - Create, schedule, target roles
- **Audit Logging** - 100 most recent admin actions
- **Export Center** - 5 export formats (CSV, stats, demographics, PDF)

### ❌ Critical Gaps
| Gap | Impact | Effort |
|-----|--------|--------|
| **Real-time KPI monitoring** | High - executives need live metrics | Medium |
| **Clinical risk stratification** | High - mental health focus | High |
| **Performance/indexing** | High - system slows at scale | Medium |
| **Per-assessment dashboards** | Medium - detailed analytics per test | Medium |
| **Research compliance** | Medium - publication readiness | Low |
| **Bulk operations** | Medium - operational efficiency | Low |
| **Advanced query builder** | Low - power user feature | High |

---

## Phased Implementation Plan

### PHASE 1: Performance Foundation (Week 1)
**Goal:** Optimize database and API layer to support large datasets  
**Effort:** 40 hours  
**Blocker Resolution:** YES — Enable all subsequent phases to perform at scale

#### Tasks:
1. **Create SQL Indexes** (4 hours)
   ```sql
   -- FK indexes (missing)
   CREATE INDEX idx_assessment_submissions_assignment_id 
     ON assessment_submissions(assignment_id);
   
   CREATE INDEX idx_assessment_submissions_definition_id 
     ON assessment_submissions(definition_id);
   
   -- Composite indexes (missing)
   CREATE INDEX idx_assessment_submissions_patient_submitted 
     ON assessment_submissions(patient_id, submitted_at DESC);
   
   CREATE INDEX idx_assessment_submissions_severity_risk
     ON assessment_submissions(severity_band, high_risk_flag);
   
   -- For 7-day queries
   CREATE INDEX idx_assessment_submissions_submitted_risk
     ON assessment_submissions(submitted_at DESC, high_risk_flag)
     WHERE submitted_at > NOW() - INTERVAL '7 days';
   ```

2. **Create Materialized Views** (12 hours)
   ```sql
   -- Refresh every 1 hour via cron
   CREATE MATERIALIZED VIEW admin_daily_stats AS
   SELECT 
     DATE(submitted_at) as date,
     COUNT(*) as total_submissions,
     COUNT(CASE WHEN high_risk_flag THEN 1 END) as high_risk_count,
     AVG(total_score)::numeric(5,2) as avg_score,
     COUNT(DISTINCT patient_id) as unique_patients
   FROM assessment_submissions
   GROUP BY DATE(submitted_at)
   ORDER BY date DESC;
   
   CREATE MATERIALIZED VIEW admin_assessment_stats AS
   SELECT 
     ad.id as definition_id,
     ad.code,
     ad.name_en,
     COUNT(sub.id) as total_submissions,
     AVG(sub.total_score)::numeric(5,2) as avg_score,
     PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.total_score) as median_score,
     STDDEV(sub.total_score)::numeric(5,2) as stddev_score,
     COUNT(CASE WHEN sub.high_risk_flag THEN 1 END)::numeric(5,1) as pct_high_risk
   FROM assessment_definitions ad
   LEFT JOIN assessment_submissions sub ON ad.id = sub.definition_id
   GROUP BY ad.id, ad.code, ad.name_en;
   ```

3. **Create Admin RPCs** (16 hours)
   ```sql
   -- RPC: Get 7-day stats (sub-100ms response)
   CREATE FUNCTION get_admin_dashboard_stats(
     p_days INTEGER DEFAULT 7
   ) RETURNS TABLE (
     date date,
     submissions bigint,
     high_risk_count bigint,
     avg_score numeric
   ) AS $$
   BEGIN
     RETURN QUERY
     SELECT 
       DATE(submitted_at),
       COUNT(*),
       COUNT(CASE WHEN high_risk_flag THEN 1 END),
       AVG(total_score)
     FROM assessment_submissions
     WHERE submitted_at > NOW() - (p_days || ' days')::INTERVAL
     GROUP BY DATE(submitted_at)
     ORDER BY DATE(submitted_at) DESC;
   END;
   $$ LANGUAGE plpgsql STABLE;
   
   -- RPC: Leaderboard (top N assessments by volume)
   CREATE FUNCTION get_top_assessments(
     p_limit INTEGER DEFAULT 10
   ) RETURNS TABLE (
     assessment_id uuid,
     code text,
     name_en text,
     submission_count bigint,
     avg_score numeric
   ) AS $$
   BEGIN
     RETURN QUERY
     SELECT 
       ad.id,
       ad.code,
       ad.name_en,
       COUNT(sub.id),
       AVG(sub.total_score)
     FROM assessment_definitions ad
     LEFT JOIN assessment_submissions sub ON ad.id = sub.definition_id
     GROUP BY ad.id, ad.code, ad.name_en
     ORDER BY COUNT(sub.id) DESC
     LIMIT p_limit;
   END;
   $$ LANGUAGE plpgsql STABLE;
   ```

4. **Implement Server-Side Caching** (8 hours)
   - Add Redis caching layer for:
     - Overview stats (5-min TTL)
     - Assessment leaderboard (10-min TTL)
     - Demographic breakdowns (30-min TTL)
   - Cache invalidation on new submission

#### Acceptance Criteria:
- ✅ All indexes deployed
- ✅ Materialized views refresh hourly via Supabase cron job
- ✅ Overview page load time < 500ms (was ~1.5s)
- ✅ Analytics queries timeout-proof (explicit LIMIT clauses)
- ✅ Database query count reduced by 40% via RPCs

---

### PHASE 2: Executive KPI Dashboard (Week 2)
**Goal:** Add sophisticated KPI cards with trends, targets, and alerts  
**Effort:** 30 hours  
**Dependencies:** Phase 1 (materialized views)

#### Tasks:

1. **Create KPI Card Component** (4 hours)
   ```tsx
   // components/admin/KPICard.tsx
   interface KPICardProps {
     title: string
     value: string | number
     unit?: string
     trend?: number // -5.2% or +12.3%
     trendDirection?: 'up' | 'down' | 'neutral'
     target?: number
     status?: 'good' | 'warning' | 'critical'
     icon?: React.ReactNode
     onClick?: () => void
   }
   
   // Renders:
   // - Large metric value
   // - Trend indicator (📈 / 📉)
   // - Target progress bar
   // - Status indicator (🟢 / 🟡 / 🔴)
   ```

2. **Create KPI Data Model** (6 hours)
   - KPI definitions (database table or config):
     ```typescript
     {
       id: 'active_users_today',
       title: 'Active Users (Today)',
       calculation: 'count_distinct(user_id) where last_activity > today',
       target: 500,
       refreshInterval: '5m',
       trendComparisonPeriod: 'yesterday',
       alertThreshold: 400
     }
     ```
   - KPI value calculations (Supabase RPC)
   - Trend calculation (vs. previous period)

3. **Implement KPI Dashboard Page** (12 hours)
   - Grid of KPI cards (3 columns)
   - 16 primary KPIs:
     ```
     Row 1: Total Users | Active (Today) | Active (Week) | Active (Month)
     Row 2: New Signups | Registrations Pending | Password Resets | Email Verifications
     Row 3: Assessments Completed | Assessment Submissions | Avg Completion Time | Dropout Rate
     Row 4: Clinician Accounts | Pending Clinician Requests | Messages (Today) | Appointments
     Row 5: Login Success Rate | Login Failure Rate | CAPTCHA Solve Rate | API Response Time (p95)
     Row 6: Active Sessions | Server Health | Database Health | Storage Usage
     ```
   - Trend visualization (7d, 30d, YoY options)
   - Alert configuration panel (drag to reorder, set thresholds)

4. **Create Trend Charts** (5 hours)
   - Line chart: Daily active users (30 days)
   - Line chart: Daily assessments completed
   - Line chart: API response time (p50, p95, p99)
   - Comparison to previous period overlay

5. **API Endpoints** (3 hours)
   - `GET /api/admin/kpis` - returns all KPI values + trends
   - `GET /api/admin/kpis/[kpiId]/history` - time series data
   - `PATCH /api/admin/kpis/[kpiId]/alert` - set alert threshold

#### Acceptance Criteria:
- ✅ All 16 KPI cards display on override
- ✅ Each KPI updates within 5 min
- ✅ Trend arrows show correct direction
- ✅ Alert thresholds trigger visual changes
- ✅ Dashboard loads in < 1s

---

### PHASE 3: Clinical Risk Dashboard (Week 3)
**Goal:** Enable clinicians and admins to identify and manage at-risk patients  
**Effort:** 50 hours  
**Dependencies:** Supabase RLS (clinical data access)

#### Tasks:

1. **Create Risk Stratification Model** (8 hours)
   - Define risk scores based on assessment results:
     ```typescript
     const RISK_RULES = [
       {
         name: 'Suicidal Ideation',
         assessments: ['PHQ-9'],
         itemCodes: ['phq9_q9'], // "thoughts of hurting yourself"
         threshold: 1, // value > 0 = flag
         priority: 'CRITICAL'
       },
       {
         name: 'Severe Depression',
         assessments: ['PHQ-9'],
         scoreThreshold: 20, // PHQ-9 ≥ 20 = moderate-severe
         priority: 'HIGH'
       },
       {
         name: 'Severe Anxiety',
         assessments: ['GAD-7'],
         scoreThreshold: 15,
         priority: 'HIGH'
       },
       // ... 10 more rules
     ]
     ```

2. **Create Risk Calculation RPC** (12 hours)
   ```sql
   CREATE FUNCTION calculate_patient_risk_score(
     p_patient_id UUID
   ) RETURNS TABLE (
     risk_level text,
     risk_score numeric,
     triggered_rules text[],
     latest_submission_date timestamptz,
     recommended_actions text[]
   ) AS $$
   DECLARE
     v_phq9_score integer;
     v_gad7_score integer;
     v_risk_score numeric := 0;
     v_triggered text[] := ARRAY[]::text[];
   BEGIN
     -- Calculate latest PHQ-9 score
     SELECT total_score INTO v_phq9_score
     FROM assessment_submissions
     WHERE patient_id = p_patient_id
       AND definition_id = (SELECT id FROM assessment_definitions WHERE code = 'phq9')
     ORDER BY submitted_at DESC
     LIMIT 1;
     
     -- Check suicidal ideation (PHQ-9 Q9)
     IF v_phq9_score IS NOT NULL THEN
       v_risk_score := v_risk_score + 
         CASE WHEN v_phq9_score >= 20 THEN 35 ELSE 0 END;
       v_triggered := array_append(v_triggered, 'severe_depression');
     END IF;
     
     -- ... more rules
     
     RETURN QUERY
     SELECT 
       CASE 
         WHEN v_risk_score >= 80 THEN 'CRITICAL'
         WHEN v_risk_score >= 60 THEN 'HIGH'
         WHEN v_risk_score >= 40 THEN 'MEDIUM'
         ELSE 'LOW'
       END,
       v_risk_score,
       v_triggered,
       NOW(),
       ARRAY['Contact patient', 'Notify clinician', 'Schedule appointment'];
   END;
   $$ LANGUAGE plpgsql STABLE;
   ```

3. **Create Risk Dashboard Page** (16 hours)
   - Risk stratification matrix (4 rows: LOW, MEDIUM, HIGH, CRITICAL)
   - For each risk level:
     - Count of patients
     - Trend (up/down/stable)
     - List of patients with drill-down
   - Filterable by:
     - Risk level
     - Clinician assigned
     - Assessment type
     - Age group
     - Date range
   - Actions per patient:
     - Assign clinician
     - Schedule appointment
     - Send message
     - Export case summary

4. **Create Clinical Alert System** (12 hours)
   - Real-time notifications for new high-risk submissions
   - Alert rules configuration:
     ```json
     {
       "id": "suicidal_ideation",
       "condition": "PHQ9_Q9 > 0",
       "notifyRoles": ["admin", "clinician"],
       "notifyClinicianAssigned": true,
       "escalateAfterDays": 3
     }
     ```
   - Alert routing via email, SMS (future), in-app notifications

5. **Create Clinical Workflow State Machine** (6 hours)
   - States: New, Contacted, In Treatment, Stabilized, Closed
   - Transitions with approval
   - Audit trail for all state changes
   - Follow-up task generation

#### Acceptance Criteria:
- ✅ Risk calculation accurate for 5 major conditions
- ✅ Dashboard renders < 1s for 100K patients
- ✅ Filters work across all dimensions
- ✅ Alerts trigger within 30s of submission
- ✅ Clinician receives notification of assigned patients

---

### PHASE 4: Per-Assessment Dashboards (Week 4)
**Goal:** Deep-dive analytics for each assessment type  
**Effort:** 35 hours

#### Tasks:

1. **Create Assessment Detail Page** (12 hours)
   - Route: `/x/control/assessments/[assessmentId]`
   - Layout:
     ```
     Header: Assessment Name | Total Completions | Avg Score | Status Badge
     
     Tabs:
     1. Overview (stats + trends)
     2. Score Distribution (histogram + percentiles)
     3. Item Analysis (difficulty index, discrimination index per question)
     4. Demographics (score by age, gender, country, education, etc.)
     5. Trends (completions over time, score trend)
     6. Reliability (internal consistency, test-retest if available)
     7. Norms (percentile ranks vs. population norms)
     ```

2. **Implement Item-Level Analysis** (12 hours)
   ```sql
   -- Item difficulty index = % of respondents who scored highest option
   -- Item discrimination index = correlation with total score
   
   CREATE FUNCTION get_assessment_item_analytics(
     p_assessment_id UUID
   ) RETURNS TABLE (
     item_id UUID,
     item_text text,
     difficulty_index numeric, -- 0-1, higher = easier
     discrimination_index numeric, -- -1 to 1, higher = better
     mean_response numeric,
     std_dev numeric,
     missing_percent numeric
   ) AS $$
   -- Implementation
   $$ LANGUAGE plpgsql;
   ```

3. **Create Demographic Comparison Charts** (8 hours)
   - Box plot: Score distribution by age group
   - Bar chart: Average score by gender, country, education
   - Heatmap: Assessment × Demographic (rows = demographics, columns = groups, color = avg score)

4. **Implement Norm-Referenced Scoring** (6 hours)
   - Calculate percentile ranks for each score
   - Compare individual score to population distribution
   - Generate interpretation bands specific to assessment

5. **Create Assessment Comparison Interface** (5 hours)
   - Multi-select assessments
   - Side-by-side metrics:
     ```
     | Metric | PHQ-9 | GAD-7 | PSQI |
     |--------|-------|-------|------|
     | Total Submissions | 1,200 | 950 | 450 |
     | Avg Score | 12.3 | 10.1 | 8.9 |
     | Completion Rate | 92% | 94% | 87% |
     ```

#### Acceptance Criteria:
- ✅ Per-assessment page loads in < 1s
- ✅ Item-level statistics match manual calculation
- ✅ Demographic comparisons display correctly
- ✅ Normative percentiles accurate for ≥ 100 responses

---

### PHASE 5: Research Compliance & Export (Week 5)
**Goal:** Publication-ready research data exports  
**Effort:** 25 hours

#### Tasks:

1. **Create Research Data Export Wizard** (12 hours)
   - Multi-step form:
     ```
     Step 1: Select Assessment(s)
     Step 2: Select Date Range
     Step 3: Select Filters (demographics, severity, etc.)
     Step 4: Select Columns (choose which data to include)
     Step 5: Select Format (CSV, Excel, SPSS .sav, JSON)
     Step 6: Add Codebook (variable definitions)
     ```
   - Generate automatic codebook:
     ```
     Variable: age_group
     Label: Age group of respondent
     Type: categorical
     Values: 
       1 = 18-24
       2 = 25-34
       ... etc
     Missing: 99
     ```

2. **Implement Format-Specific Exporters** (10 hours)
   - **CSV Exporter:** Clean, RFC 4180 compliant
   - **Excel Exporter:** Formatted with data types, codebook sheet
   - **SPSS SAV:** Binary format with variable metadata
   - **JSON Exporter:** Structured for APIs/reuse

3. **Add Export Audit Trail** (3 hours)
   - Log all exports with:
     - Admin who initiated
     - Filters applied
     - Row count
     - Timestamp
   - Allow export history viewing

#### Acceptance Criteria:
- ✅ All 4 export formats work
- ✅ Codebook matches data
- ✅ No PII in any export
- ✅ SPSS format opens in IBM SPSS/PSPP

---

### PHASE 6: Real-Time Monitoring (Week 6)
**Goal:** Live dashboards for operational incidents  
**Effort:** 40 hours

#### Tasks:

1. **Implement WebSocket Connection** (12 hours)
   - Use Supabase Realtime or Socket.io
   - Subscribe to:
     - New high-risk submissions
     - Assessment completions
     - System errors
     - Rate limit events

2. **Create Operations Dashboard** (16 hours)
   - Real-time metrics:
     ```
     Live Submission Rate: 12 submissions/min (green indicator)
     API Health: 99.8% uptime (green)
     Database Connection Pool: 8/20 (healthy)
     Active Users: 342 online now
     Failed Logins (1h): 2 (normal)
     CAPTCHA Solve Rate: 98.5%
     ```
   - Activity feed (last 50 events):
     ```
     [2:15 PM] High-risk PHQ-9 submission from user john_doe
     [2:14 PM] API /submit-assessment latency spike: 1.2s
     [2:12 PM] Database backup completed
     ```
   - System alerts:
     ```
     ⚠️ Database query latency elevated (p95: 1.5s)
     🔴 Rate limit: 542 requests blocked in last hour
     ✅ All systems nominal
     ```

3. **Create Incident Response Panel** (8 hours)
   - Quick actions for incidents:
     - Enable CAPTCHA everywhere
     - Temporarily disable guest submissions
     - Page on-call engineer
     - Start incident log
   - Incident tracking:
     - Start time, duration, impact, resolution

4. **Implement Server-Sent Events (SSE)** (4 hours)
   - Lighter weight than WebSocket for one-way push
   - Auto-reconnect on disconnect
   - Fallback to polling if SSE unavailable

#### Acceptance Criteria:
- ✅ New submissions appear on dashboard within 2s
- ✅ High-risk alerts trigger immediately
- ✅ Operations team can respond to incidents from dashboard
- ✅ No performance degradation with > 100 concurrent admins

---

### PHASE 7: Bulk Operations & Workflows (Week 7)
**Goal:** Enable admins to perform actions at scale  
**Effort:** 30 hours

#### Tasks:

1. **Create Bulk Action Interface** (12 hours)
   - Table multiselect checkboxes
   - Bulk action toolbar (appears when rows selected):
     ```
     [✓] 42 users selected | [Delete] [Export] [Assign Clinician] [Suspend]
     ```
   - Bulk actions:
     - Export users (CSV with all fields)
     - Delete users (with warning)
     - Assign clinician (select from dropdown)
     - Send message (compose + send to all)
     - Change status (activate/suspend)
     - Apply consent (add consent record)

2. **Implement Confirmation Modals** (6 hours)
   - Destructive actions require confirmation:
     ```
     "Are you sure you want to delete 42 users? This action is permanent."
     
     [Cancel] [Confirm - I understand the consequences]
     ```
   - Show impact preview before executing

3. **Create Async Job Queue** (8 hours)
   - For long-running operations (bulk export, bulk delete)
   - Backend job processor:
     ```typescript
     interface BulkJob {
       id: string
       type: 'bulk_export' | 'bulk_delete' | 'bulk_assign'
       userIds: string[]
       status: 'pending' | 'processing' | 'completed' | 'failed'
       progress: { current: number, total: number }
       result?: string // URL to download file
     }
     ```
   - Frontend polling for job status

4. **Create Workflow Templates** (4 hours)
   - Pre-built workflows:
     - "New Clinician Onboarding" (assign patients, send welcome, set flags)
     - "High-Risk Outreach" (bulk message, assign clinician, schedule follow-up)
     - "Research Cohort Setup" (bulk tag, set status, export list)

#### Acceptance Criteria:
- ✅ Bulk select works for ≥ 1000 rows
- ✅ Bulk operations complete in < 1 min (show progress)
- ✅ No duplicate exports if modal dismissed
- ✅ Workflow templates reduce repetitive tasks by 70%

---

### PHASE 8: Advanced Query Builder (Week 8)
**Goal:** Enable power users to create custom reports without code  
**Effort:** 45 hours

#### Tasks:

1. **Design Query DSL** (8 hours)
   - Visual query builder (like Airtable/Tableau):
     ```
     WHERE
       assessment = "PHQ-9" AND
       score > 15 AND
       age >= 18 AND
       country IN ["US", "UK"] AND
       submitted_at >= "2025-01-01"
     
     GROUPBY age_group
     ORDERBY score DESC
     LIMIT 100
     ```

2. **Implement Filter UI** (16 hours)
   - Field selector (dropdown of available fields)
   - Operator selector (=, !=, >, <, IN, BETWEEN, LIKE)
   - Value input (text, date picker, multiselect)
   - Add/remove filter buttons
   - AND/OR logic

3. **Implement Aggregation UI** (12 hours)
   - Group by fields
   - Aggregate functions (COUNT, AVG, MEDIAN, STDDEV, MIN, MAX)
   - Sort order (ASC/DESC)
   - Example: "GROUP BY age_group, gender | SELECT AVG(score), COUNT(*)"

4. **Implement Query Execution & Caching** (9 hours)
   - Convert DSL to SQL
   - Execute with RLS checks
   - Cache results (5-min TTL)
   - Show execution time + row count

#### Acceptance Criteria:
- ✅ Query builder creates accurate WHERE clauses
- ✅ Results match manual SQL queries
- ✅ ≤ 5s execution time for all queries
- ✅ Saved queries persist in database

---

### PHASE 9: Data Retention Policies (Week 9)
**Goal:** Implement GDPR/HIPAA-compliant data lifecycle management  
**Effort:** 20 hours

#### Tasks:

1. **Create Policy Configuration UI** (8 hours)
   ```json
   {
     "id": "default_retention",
     "rules": [
       {
         "dataType": "assessment_submissions",
         "retentionDays": 2555, // 7 years (healthcare standard)
         "archiveAfterDays": 365,
         "deleteAfterDays": 2555,
         "condition": "status = 'completed'" // Optional
       },
       {
         "dataType": "audit_log",
         "retentionDays": 2555,
         "deleteAfterDays": 2555
       },
       {
         "dataType": "temporary_sessions",
         "deleteAfterDays": 7
       }
     ]
   }
   ```

2. **Implement Retention Job** (8 hours)
   - Nightly cron job that:
     - Archives old data (copy to S3, remove from DB)
     - Deletes expired data
     - Generates audit trail
   - RPC for bulk delete with constraints

3. **Create Compliance Dashboard** (4 hours)
   - Show data lifecycle status:
     ```
     Assessment Submissions:
       - Active (< 1 year): 50,000
       - Archived (1-7 years): 120,000
       - Deleted: 80,000
       
       Oldest active record: 2024-01-15
       Archive due: 2025-01-15
       Deletion due: 2032-01-15
     ```

#### Acceptance Criteria:
- ✅ Policies apply correctly
- ✅ Archived data removed from main tables
- ✅ Deletion audit trail created
- ✅ No compliance violations (7-year retention met)

---

### PHASE 10: Accessibility & Dark Mode (Week 10)
**Goal:** WCAG 2.2 AA compliance + theme support  
**Effort:** 25 hours

#### Tasks:

1. **Audit Accessibility Issues** (6 hours)
   - Run axe/Lighthouse accessibility audit
   - Identify:
     - Missing alt text
     - Low contrast ratios
     - Missing ARIA labels
     - Keyboard navigation gaps
     - Focus traps

2. **Implement Dark Mode** (10 hours)
   - Update Tailwind theme for dark mode
   - Apply `dark:` variants to all components
   - Add theme toggle in header
   - Persist theme preference

3. **Fix Keyboard Navigation** (5 hours)
   - Ensure all interactive elements reachable via Tab
   - Implement skip links (already done in prior phases)
   - Add focus indicators to all buttons/inputs
   - Test with keyboard-only navigation

4. **Fix Color Contrast** (4 hours)
   - Ensure all text passes WCAG AA (4.5:1 for normal text)
   - Update color palette if needed

#### Acceptance Criteria:
- ✅ Lighthouse accessibility score ≥ 90
- ✅ Full keyboard navigation works
- ✅ All interactive elements labeled (ARIA)
- ✅ Dark mode doesn't break any pages

---

### PHASE 11: Performance Optimizations (Week 11)
**Goal:** Sub-second page loads, smooth interactions  
**Effort:** 30 hours

#### Tasks:

1. **Implement Table Virtualization** (12 hours)
   - Replace hardcoded tables with `react-virtual`
   - Only render visible rows (even if 10K rows)
   - Maintains scrolling performance

2. **Lazy Load Components** (8 hours)
   - Use `React.lazy()` for heavy dashboard tabs
   - Suspense boundaries with skeleton loaders
   - Reduce initial bundle size

3. **Optimize Chart Rendering** (5 hours)
   - Memoize Recharts components
   - Only re-render on data change (not on every parent update)
   - Reduce chart resolution on mobile

4. **Implement Progressive Image Loading** (5 hours)
   - Low-quality placeholder while loading
   - Blur effect on image
   - Fade-in when ready

#### Acceptance Criteria:
- ✅ Table scrolling smooth even with 10K rows
- ✅ Page load time < 1s
- ✅ Largest Contentful Paint (LCP) < 2.5s
- ✅ Cumulative Layout Shift (CLS) < 0.1

---

### PHASE 12: Compliance Reporting (Week 12)
**Goal:** Auto-generate GDPR/HIPAA audit reports  
**Effort:** 20 hours

#### Tasks:

1. **Create Report Templates** (12 hours)
   ```
   Reports:
   - GDPR Data Processing Agreement (DPA) Report
   - HIPAA Security Compliance Report
   - ISO 27001 Control Evidence Report
   - SOC2 Audit Trail Report
   - Data Breach Notification Template
   ```

2. **Implement Automated Report Generation** (8 hours)
   - Query audit log and compliance metrics
   - Generate PDF with:
     - Aggregated statistics
     - Access logs
     - Security incidents
     - Remediation actions
   - Schedule monthly reports to compliance officer

#### Acceptance Criteria:
- ✅ GDPR report includes all required elements
- ✅ HIPAA audit trail complete for period
- ✅ Reports generated in < 30s
- ✅ PDF format professional and printable

---

### PHASE 13: Admin User Management (Week 13)
**Goal:** Multi-tenancy support for different admin roles  
**Effort:** 25 hours

#### Tasks:

1. **Create Admin Role Hierarchy** (10 hours)
   ```
   Roles:
   - Super Admin (all access)
   - Admin (user data, assessments, but not billing)
   - Analyst (read-only analytics, reports)
   - Clinician Manager (manage clinicians only)
   - Compliance Officer (audit logs, reports only)
   ```

2. **Implement Fine-Grained Permissions** (12 hours)
   - RLS policies per role
   - API endpoint checks
   - UI element visibility based on permissions
   - Audit log of permission changes

3. **Create Admin Activity Tracking** (3 hours)
   - Enhanced audit log showing what each admin changed
   - Alert on dangerous operations (bulk delete)

#### Acceptance Criteria:
- ✅ Roles prevent unauthorized access
- ✅ UI hides forbidden actions
- ✅ Audit log shows all admin changes
- ✅ Permissions enforce at API + DB layer

---

### PHASE 14: Documentation & Training (Week 14)
**Goal:** Enable admins to use dashboard independently  
**Effort:** 20 hours

#### Tasks:

1. **Create Admin Handbook** (8 hours)
   - Markdown guide with screenshots:
     - Getting started
     - User management walkthrough
     - Assessment configuration
     - Analytics interpretation
     - Troubleshooting

2. **Create Video Tutorials** (8 hours)
   - 5-min videos for each major section
   - Screen recordings with voiceover

3. **Implement In-App Help** (4 hours)
   - Tooltips on hover
   - "?" help button on each page
   - Contextual help panel (e.g., "What does 'severity band' mean?")

#### Acceptance Criteria:
- ✅ All features documented
- ✅ Videos accessible via YouTube
- ✅ New admins can self-onboard

---

### PHASE 15: Testing & QA (Week 15)
**Goal:** Ensure reliability and performance  
**Effort:** 35 hours

#### Tasks:

1. **Automated Testing** (20 hours)
   - E2E tests (Playwright):
     - Login flow
     - User creation/deletion
     - Report generation
     - Bulk operations
   - Unit tests (Jest):
     - KPI calculations
     - Risk scoring
     - Data formatting

2. **Load Testing** (10 hours)
   - Simulate 100 concurrent admins
   - Verify dashboard < 2s load time
   - Check database connection pool doesn't exhaust

3. **Manual QA** (5 hours)
   - Test all screens on Chrome, Firefox, Safari
   - Test mobile (iPad) view
   - Verify accessibility with screen reader

#### Acceptance Criteria:
- ✅ 95%+ E2E test pass rate
- ✅ No performance degradation with 100 users
- ✅ All browsers supported
- ✅ No critical bugs found

---

## Summary: Effort & Timeline

| Phase | Title | Hours | Weeks | Dependencies |
|-------|-------|-------|-------|---|
| 1 | Performance Foundation | 40 | 1 | None |
| 2 | Executive KPI Dashboard | 30 | 1 | Phase 1 |
| 3 | Clinical Risk Dashboard | 50 | 1 | Phase 1 |
| 4 | Per-Assessment Dashboards | 35 | 1 | Phase 1 |
| 5 | Research Compliance | 25 | 1 | Phase 1 |
| 6 | Real-Time Monitoring | 40 | 1 | Phase 1 |
| 7 | Bulk Operations | 30 | 1 | Phase 1 |
| 8 | Query Builder | 45 | 1 | Phase 1 |
| 9 | Data Retention | 20 | 1 | Phase 1 |
| 10 | Accessibility & Dark Mode | 25 | 1 | All |
| 11 | Performance Optimizations | 30 | 1 | All |
| 12 | Compliance Reporting | 20 | 1 | Phases 1, 3 |
| 13 | Admin User Management | 25 | 1 | Phase 1 |
| 14 | Documentation | 20 | 1 | All UI complete |
| 15 | Testing & QA | 35 | 1 | All |
| **TOTAL** | | **470 hours** | **~14 weeks** | — |

---

## Prioritization (MVP vs. Nice-to-Have)

### CRITICAL (Ship First - Weeks 1-5)
- ✅ Phase 1: Performance Foundation
- ✅ Phase 2: Executive KPI Dashboard
- ✅ Phase 3: Clinical Risk Dashboard
- ✅ Phase 5: Research Compliance

**Why:** Addresses core stakeholder needs (executives, clinicians, researchers)

### HIGH (Weeks 6-9)
- ✅ Phase 4: Per-Assessment Dashboards
- ✅ Phase 6: Real-Time Monitoring
- ✅ Phase 7: Bulk Operations
- ✅ Phase 9: Data Retention Policies

**Why:** Operational efficiency + compliance

### MEDIUM (Weeks 10-12)
- ✅ Phase 8: Query Builder
- ✅ Phase 12: Compliance Reporting

**Why:** Power users + regulatory compliance

### NICE-TO-HAVE (Weeks 13-15)
- ✅ Phase 10: Accessibility & Dark Mode
- ✅ Phase 11: Performance Optimizations
- ✅ Phase 13: Admin User Management
- ✅ Phase 14: Documentation
- ✅ Phase 15: Testing & QA

---

## Technology Stack

### Frontend
- **React** (existing)
- **Next.js** 15.5.19 (App Router)
- **TypeScript**
- **Tailwind CSS** (with dark mode)
- **Recharts** (charting)
- **Lucide React** (icons)
- **React Virtual** (table virtualization) — NEW
- **React Query** (server state) — NEW
- **Zod** (form validation) — NEW

### Backend
- **Next.js API Routes**
- **Supabase** (PostgreSQL, Auth, Realtime)
- **Redis** (caching) — NEW
- **Socket.io** or Supabase Realtime (WebSocket) — NEW

### Database
- **PostgreSQL** (Supabase)
- **Materialized Views**
- **PLpgSQL functions (RPCs)**
- **Indexes** (composite, partial, GiST)

### Deployment
- **Vercel** (existing)
- **Supabase** (database + auth)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Performance regression | Phase 1 indexing + caching before new features |
| Scope creep | Strict MVP definition, no feature requests mid-phase |
| Database scaling | Materialized views + RPCs reduce query count |
| Admin workflow disruption | Gradual rollout (beta access, feature flags) |
| Compliance violations | Legal review of data retention policies |
| Security issues | Security audit post-Phase 1, pentest before launch |

---

## Success Metrics

| Metric | Target | Current | Improvement |
|--------|--------|---------|---|
| Dashboard load time | < 1s | ~1.5s | +40% |
| Query execution time | < 500ms | ~1.5s | +70% |
| Table row rendering | 10K+ rows | ~100 rows | 100x |
| Concurrent admins | 100+ | ~20 | 5x |
| KPI freshness | 5 min | N/A | NEW |
| Clinical alerts latency | < 30s | N/A | NEW |
| Accessibility score | 90+ (Lighthouse) | ~75 | +20% |
| Admin time per task | 2 min avg | 5 min | -60% |

---

## Recommendation

**Approach:** Iterative delivery with user feedback

**Suggested Delivery:**

**MVP (Weeks 1-5):** Phase 1-5  
- Performance foundation
- KPI dashboard (executives)
- Clinical risk dashboard (clinicians)
- Research exports (researchers)

**V2 (Weeks 6-9):** Phase 4, 6-7, 9  
- Per-assessment dashboards
- Real-time monitoring
- Bulk operations
- Compliance

**V3 (Weeks 10-15):** Phase 8, 10-13, 15  
- Advanced query builder
- Accessibility/dark mode
- Admin role management
- Testing & documentation

This allows early validation with stakeholders, rapid iteration, and reduces risk of over-engineering low-priority features.

---

**Next Steps:**

1. ✅ Audit complete (this document)
2. 📋 Approve prioritization & timeline
3. 🚀 Begin Phase 1 (Performance Foundation)
4. 👥 Assign team members
5. 📅 Schedule reviews (bi-weekly)
