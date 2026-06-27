# Phase 2: Executive KPI Dashboard Specification

**Status:** Pre-implementation  
**Planned Effort:** 30 hours  
**Dependencies:** Phase 1 (✅ Complete)  
**Priority:** High - Executive visibility  

---

## Overview

Phase 2 builds on the Phase 1 performance foundation to deliver a sophisticated KPI dashboard with:
- 16 executive KPI cards with real-time metrics
- Trend visualization (7-day, 30-day, year-over-year)
- Alert configuration and threshold management
- Drill-down capability to detailed analytics
- Customizable dashboard layout

---

## KPI Definitions

### Row 1: User Metrics (4 KPIs)

#### 1.1 Total Users (Cumulative)
```javascript
{
  id: 'total_users',
  title: 'Total Users',
  category: 'Users',
  calculation: 'COUNT(DISTINCT user_id) WHERE user_type = "patient"',
  target: 5000,
  alertThreshold: 3000,  // Alert if drops below 60% target
  trendComparisonPeriod: 'monthly',
  refreshInterval: '1h',
  unit: 'users',
  format: 'number',
  drilldown: '/x/control/users',
  icon: 'Users'
}
```

#### 1.2 Active Users (Today)
```javascript
{
  id: 'active_users_today',
  title: 'Active Users (Today)',
  category: 'Users',
  calculation: 'COUNT(DISTINCT user_id) WHERE last_login >= TODAY()',
  target: 300,
  alertThreshold: 200,
  trendComparisonPeriod: 'daily',
  refreshInterval: '15m',
  unit: 'users',
  format: 'number',
  drilldown: '/x/control/users?filter=active_today'
}
```

#### 1.3 Active Users (7 Days)
```javascript
{
  id: 'active_users_7d',
  title: 'Active Users (7D)',
  category: 'Users',
  calculation: 'COUNT(DISTINCT user_id) WHERE last_login >= DATE_SUB(TODAY(), 7)',
  target: 1500,
  alertThreshold: 1000,
  trendComparisonPeriod: 'weekly'
}
```

#### 1.4 Active Users (30 Days)
```javascript
{
  id: 'active_users_30d',
  title: 'Active Users (30D)',
  category: 'Users',
  calculation: 'COUNT(DISTINCT user_id) WHERE last_login >= DATE_SUB(TODAY(), 30)',
  target: 3000,
  alertThreshold: 2000,
  trendComparisonPeriod: 'monthly'
}
```

### Row 2: Registration & Verification (4 KPIs)

#### 2.1 New Signups (Today)
```javascript
{
  id: 'new_signups_today',
  title: 'New Signups (Today)',
  calculation: 'COUNT(*) FROM profiles WHERE created_at >= TODAY()',
  target: 50,
  alertThreshold: 20,
  trendComparisonPeriod: 'daily',
  refreshInterval: '30m'
}
```

#### 2.2 Registrations Pending
```javascript
{
  id: 'registrations_pending',
  title: 'Pending Confirmations',
  calculation: 'COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL',
  target: 50,  // Max pending
  alertThreshold: 100,  // Alert if too many unconfirmed
  isInverse: true,  // Lower is better
  trendComparisonPeriod: 'daily'
}
```

#### 2.3 Password Resets (Today)
```javascript
{
  id: 'password_resets_today',
  title: 'Password Resets (Today)',
  calculation: 'COUNT(*) FROM audit_log WHERE action = "password_reset" AND DATE(created_at) = TODAY()',
  target: 30,
  trendComparisonPeriod: 'daily'
}
```

#### 2.4 Email Verifications (Today)
```javascript
{
  id: 'email_verifications_today',
  title: 'Email Verified (Today)',
  calculation: 'COUNT(*) FROM audit_log WHERE action = "email_verified" AND DATE(created_at) = TODAY()',
  target: 40,
  trendComparisonPeriod: 'daily'
}
```

### Row 3: Assessment Activity (4 KPIs)

#### 3.1 Assessments Completed (Today)
```javascript
{
  id: 'assessments_completed_today',
  title: 'Assessments Completed',
  calculation: 'COUNT(*) FROM assessment_submissions WHERE DATE(submitted_at) = TODAY()',
  target: 200,
  alertThreshold: 100,
  trendComparisonPeriod: 'daily',
  refreshInterval: '15m'
}
```

#### 3.2 Assessment Submissions (7D Average)
```javascript
{
  id: 'avg_submissions_7d',
  title: 'Avg Submissions/Day (7D)',
  calculation: 'COUNT(*) / 7 FROM assessment_submissions WHERE submitted_at >= DATE_SUB(TODAY(), 7)',
  target: 200,
  trendComparisonPeriod: 'weekly'
}
```

#### 3.3 Average Completion Time
```javascript
{
  id: 'avg_completion_time',
  title: 'Avg Completion Time',
  calculation: 'AVG(EXTRACT(EPOCH FROM submitted_at - started_at) / 60) FROM assessment_submissions WHERE submitted_at >= DATE_SUB(TODAY(), 7)',
  target: 5,  // minutes
  unit: 'minutes',
  format: 'decimal:1',
  trendComparisonPeriod: 'weekly'
}
```

#### 3.4 Assessment Dropout Rate
```javascript
{
  id: 'dropout_rate',
  title: 'Dropout Rate',
  calculation: '(COUNT(*) FILTER (WHERE abandoned = true) / COUNT(*)) * 100 FROM assessment_sessions',
  target: 10,  // percent
  unit: '%',
  format: 'percent',
  isInverse: true,  // Lower is better
  trendComparisonPeriod: 'weekly'
}
```

### Row 4: Clinical & Messaging (4 KPIs)

#### 4.1 Clinician Accounts
```javascript
{
  id: 'clinician_accounts',
  title: 'Clinician Accounts',
  calculation: 'COUNT(*) FROM profiles WHERE user_type = "clinician" AND deleted_at IS NULL',
  target: 50,
  trendComparisonPeriod: 'monthly'
}
```

#### 4.2 Pending Clinician Requests
```javascript
{
  id: 'clinician_requests_pending',
  title: 'Pending Clinician Requests',
  calculation: 'COUNT(*) FROM clinician_requests WHERE status = "pending"',
  alertThreshold: 5,
  trendComparisonPeriod: 'daily'
}
```

#### 4.3 Messages (Today)
```javascript
{
  id: 'messages_today',
  title: 'Messages Sent (Today)',
  calculation: 'COUNT(*) FROM messages WHERE DATE(created_at) = TODAY()',
  target: 100,
  trendComparisonPeriod: 'daily',
  refreshInterval: '15m'
}
```

#### 4.4 Appointments (Scheduled)
```javascript
{
  id: 'appointments_scheduled',
  title: 'Appointments (Upcoming)',
  calculation: 'COUNT(*) FROM appointments WHERE scheduled_at > NOW() AND status = "confirmed"',
  target: 50,
  trendComparisonPeriod: 'daily'
}
```

### Row 5: System Health (4 KPIs)

#### 5.1 Login Success Rate
```javascript
{
  id: 'login_success_rate',
  title: 'Login Success Rate',
  calculation: '(COUNT(*) FILTER (WHERE status = "success") / COUNT(*)) * 100 FROM login_attempts WHERE DATE(attempt_at) = TODAY()',
  target: 99,  // percent
  unit: '%',
  format: 'percent',
  alertThreshold: 95,
  trendComparisonPeriod: 'daily'
}
```

#### 5.2 Login Failure Rate
```javascript
{
  id: 'login_failure_rate',
  title: 'Login Failure Rate',
  calculation: '(COUNT(*) FILTER (WHERE status = "failed") / COUNT(*)) * 100 FROM login_attempts WHERE DATE(attempt_at) = TODAY()',
  target: 1,  // percent
  unit: '%',
  isInverse: true,
  trendComparisonPeriod: 'daily'
}
```

#### 5.3 CAPTCHA Solve Rate
```javascript
{
  id: 'captcha_solve_rate',
  title: 'CAPTCHA Solve Rate',
  calculation: '(COUNT(*) FILTER (WHERE solved = true) / COUNT(*)) * 100 FROM captcha_attempts WHERE DATE(attempt_at) >= DATE_SUB(TODAY(), 1)',
  target: 95,  // percent
  unit: '%',
  alertThreshold: 80,
  trendComparisonPeriod: 'daily'
}
```

#### 5.4 API Response Time (p95)
```javascript
{
  id: 'api_response_time_p95',
  title: 'API Response Time (p95)',
  calculation: 'PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) FROM api_logs WHERE DATE(timestamp) = TODAY()',
  target: 200,  // milliseconds
  unit: 'ms',
  alertThreshold: 500,
  trendComparisonPeriod: 'daily',
  refreshInterval: '5m'
}
```

---

## KPI Card Component Enhancements

### Props
```typescript
interface EnhancedKPICardProps {
  kpi: KPIDefinition
  value: number | string
  previousValue?: number | string
  trend?: number  // percentage change
  trendDirection?: 'up' | 'down' | 'neutral'
  target?: number
  status?: 'good' | 'warning' | 'critical'
  lastUpdated?: Date
  isLoading?: boolean
  onDrilldown?: () => void
  onAlertConfig?: () => void
}
```

### Features
- Trend arrow (↑ ↓) with percentage
- Target progress indicator
- Status badge (Good/Warning/Critical)
- Last updated timestamp
- Drill-down link
- Alert configuration button
- Sparkline micro-chart (optional)

---

## API Endpoints

### New Endpoints for Phase 2

**GET /api/admin/kpis**
```
Response: Array<{
  id: string
  title: string
  value: number | string
  trend: number
  trendDirection: 'up' | 'down' | 'neutral'
  target: number
  status: 'good' | 'warning' | 'critical'
  lastUpdated: timestamp
  format: string  // 'number' | 'percent' | 'decimal:1' | etc
  unit: string
}>
```

**GET /api/admin/kpis/[kpiId]/history**
```
Query: ?days=7|30|90 (default: 7)
Response: Array<{
  date: date
  value: number
  target: number
}>
```

**PATCH /api/admin/kpis/[kpiId]/alert**
```
Body: {
  threshold: number
  enabled: boolean
}
Response: {
  success: boolean
  kpi_id: string
}
```

---

## Dashboard Layout

### Grid Structure
```
┌─────────────────────────────────────────────────────┐
│  Page Header: Dashboard | Refresh 1m | Export PDF   │
├─────────────────────────────────────────────────────┤
│ Row 1: User Metrics (4 cards)                       │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ Total    │ Active   │ Active   │ Active   │       │
│ │ Users    │ Today    │ 7D       │ 30D      │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
│                                                     │
│ Row 2: Registration (4 cards)                       │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ New      │ Pending  │ Password │ Email    │       │
│ │ Signups  │ Confirm  │ Resets   │ Verified │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
│                                                     │
│ Row 3: Assessments (4 cards)                        │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ Completed│ Avg/Day  │ Avg Time │ Dropout  │       │
│ │ Today    │ (7D)     │ to Complete          │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
│                                                     │
│ Row 4: Clinical (4 cards)                           │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ Clinician│ Pending  │ Messages │ Appt     │       │
│ │ Accounts │ Requests │ Today    │ Scheduled│       │
│ └──────────┴──────────┴──────────┴──────────┘       │
│                                                     │
│ Row 5: System Health (4 cards)                      │
│ ┌──────────┬──────────┬──────────┬──────────┐       │
│ │ Login    │ Login    │ CAPTCHA  │ API      │       │
│ │ Success  │ Failure  │ Solve    │ Response │       │
│ └──────────┴──────────┴──────────┴──────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Trend Charts

### Implementation Plan

**Chart 1: Daily Active Users (30 days)**
- X-axis: Date
- Y-axis: User count
- Lines: Current period (solid), Previous period (dashed)
- Type: Line chart with area fill
- Interaction: Hover for exact values

**Chart 2: Daily Assessments Completed (30 days)**
- X-axis: Date
- Y-axis: Assessment count
- Lines: Current period, Previous period overlay
- Type: Bar chart with overlay line

**Chart 3: API Response Time Trend (7 days)**
- X-axis: Date
- Y-axis: Response time (ms)
- Lines: p50, p95, p99
- Shading: Green (<200ms), Yellow (200-500ms), Red (>500ms)
- Type: Area chart with multiple series

---

## Configuration Panel

### Alert Threshold Settings
- Threshold value input
- Enable/disable toggle
- Notification preferences (Email, Slack, Dashboard)
- Alert history log
- Save & apply button

### Dashboard Customization
- Drag-to-reorder KPI cards
- Hide/show individual metrics
- Custom time range selector
- Save custom layouts
- Reset to default layout

---

## Performance Requirements

- Page load time: <500ms
- KPI card render: <100ms per card
- Trend calculation: <200ms
- API response: <100ms
- Refresh interval: Configurable (5m to 1h)

---

## Acceptance Criteria

- ✅ All 16 KPI cards display correctly
- ✅ Each KPI updates within configured refresh interval
- ✅ Trend arrows show correct direction
- ✅ Target progress bars render accurately
- ✅ Alert thresholds trigger visual changes
- ✅ Dashboard loads in <500ms
- ✅ Drill-down links navigate correctly
- ✅ API endpoints respond in <100ms
- ✅ Mobile responsive (3-column on desktop, 2-col tablet, 1-col mobile)
- ✅ Error handling for failed API calls

---

## Implementation Timeline

| Task | Effort | Days |
|------|--------|------|
| KPI data model | 6 hours | 1 |
| API endpoints | 4 hours | 1 |
| KPI Card enhancement | 4 hours | 1 |
| Dashboard page layout | 6 hours | 1 |
| Trend charts | 5 hours | 1 |
| Alert configuration | 3 hours | 0.5 |
| Testing & optimization | 2 hours | 0.5 |

**Total: 30 hours (1 week)**

---

## Dependencies & Notes

**Depends On:**
- Phase 1 materialized views (✅ ready)
- Phase 1 RPC functions (✅ ready)
- Phase 1 API routes (✅ ready)
- Recharts library (already installed)

**Tech Stack:**
- React 18+ (client component)
- TypeScript
- Supabase (queries via RPC)
- Recharts (visualizations)
- TailwindCSS (styling)

**Considerations:**
- KPI values should be cached (5-min TTL minimum)
- Real-time updates via WebSocket if needed
- Export to PDF/CSV capability
- Role-based KPI visibility (admin only for now)

---

*Ready for implementation upon Phase 1 deployment*
