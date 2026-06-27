// Phase 2: Executive KPI Dashboard Types

export type KPIFormat = 'number' | 'percent' | 'decimal:1' | 'decimal:2' | 'duration'
export type KPIStatus = 'good' | 'warning' | 'critical'
export type TrendDirection = 'up' | 'down' | 'neutral'
export type TrendPeriod = 'daily' | 'weekly' | 'monthly'

export interface KPIDefinition {
  id: string
  title: string
  category: string
  calculation: string
  target?: number
  alertThreshold?: number
  isInverse?: boolean // Lower is better (e.g., dropout rate)
  unit?: string
  format?: KPIFormat
  refreshInterval?: string // '5m', '15m', '30m', '1h'
  trendComparisonPeriod?: TrendPeriod
  drilldown?: string
  icon?: string
}

export interface KPIValue {
  id: string
  title: string
  value: number | string
  trend?: number // percentage change
  trendDirection?: TrendDirection
  target?: number
  status?: KPIStatus
  lastUpdated?: Date | string
  format?: KPIFormat
  unit?: string
  // false when no underlying data source exists yet (e.g. no api_logs /
  // login_attempts table). The card renders a "no data source" state rather
  // than a misleading zero.
  available?: boolean
}

export interface KPIHistoryPoint {
  date: Date
  value: number
  target?: number
}

export interface KPIAlert {
  kpiId: string
  threshold: number
  enabled: boolean
  notificationChannels?: ('email' | 'slack' | 'dashboard')[]
}

export interface EnhancedKPICardProps {
  kpi: KPIDefinition
  value: number | string
  previousValue?: number | string
  trend?: number
  trendDirection?: TrendDirection
  target?: number
  status?: KPIStatus
  lastUpdated?: Date | string
  isLoading?: boolean
  available?: boolean
  onDrilldown?: () => void
  onAlertConfig?: () => void
}

// KPI Definitions for Phase 2
export const KPI_DEFINITIONS: KPIDefinition[] = [
  // Row 1: User Metrics
  {
    id: 'total_users',
    title: 'Total Users',
    category: 'Users',
    calculation: 'COUNT(DISTINCT user_id) WHERE user_type = "patient"',
    target: 5000,
    alertThreshold: 3000,
    trendComparisonPeriod: 'monthly',
    refreshInterval: '1h',
    unit: 'users',
    format: 'number',
    drilldown: '/x/control/users',
    icon: 'Users',
  },
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
    drilldown: '/x/control/users?filter=active_today',
    icon: 'TrendingUp',
  },
  {
    id: 'active_users_7d',
    title: 'Active Users (7D)',
    category: 'Users',
    calculation: 'COUNT(DISTINCT user_id) WHERE last_login >= DATE_SUB(TODAY(), 7)',
    target: 1500,
    alertThreshold: 1000,
    trendComparisonPeriod: 'weekly',
    refreshInterval: '1h',
    unit: 'users',
    format: 'number',
    icon: 'TrendingUp',
  },
  {
    id: 'active_users_30d',
    title: 'Active Users (30D)',
    category: 'Users',
    calculation: 'COUNT(DISTINCT user_id) WHERE last_login >= DATE_SUB(TODAY(), 30)',
    target: 3000,
    alertThreshold: 2000,
    trendComparisonPeriod: 'monthly',
    refreshInterval: '1h',
    unit: 'users',
    format: 'number',
    icon: 'TrendingUp',
  },

  // Row 2: Registration & Verification
  {
    id: 'new_signups_today',
    title: 'New Signups (Today)',
    category: 'Registration',
    calculation: 'COUNT(*) FROM profiles WHERE created_at >= TODAY()',
    target: 50,
    alertThreshold: 20,
    trendComparisonPeriod: 'daily',
    refreshInterval: '30m',
    unit: 'signups',
    format: 'number',
    icon: 'UserPlus',
  },
  {
    id: 'registrations_pending',
    title: 'Pending Confirmations',
    category: 'Registration',
    calculation: 'COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL',
    target: 50,
    alertThreshold: 100,
    isInverse: true,
    trendComparisonPeriod: 'daily',
    refreshInterval: '30m',
    unit: 'pending',
    format: 'number',
    icon: 'Clock',
  },
  {
    id: 'password_resets_today',
    title: 'Password Resets (Today)',
    category: 'Registration',
    calculation: 'COUNT(*) FROM audit_log WHERE action = "password_reset" AND DATE(created_at) = TODAY()',
    target: 30,
    trendComparisonPeriod: 'daily',
    refreshInterval: '1h',
    unit: 'resets',
    format: 'number',
    icon: 'Key',
  },
  {
    id: 'email_verifications_today',
    title: 'Email Verified (Today)',
    category: 'Registration',
    calculation: 'COUNT(*) FROM audit_log WHERE action = "email_verified" AND DATE(created_at) = TODAY()',
    target: 40,
    trendComparisonPeriod: 'daily',
    refreshInterval: '1h',
    unit: 'verified',
    format: 'number',
    icon: 'CheckCircle',
  },

  // Row 3: Assessment Activity
  {
    id: 'assessments_completed_today',
    title: 'Assessments Completed',
    category: 'Assessments',
    calculation: 'COUNT(*) FROM assessment_submissions WHERE DATE(submitted_at) = TODAY()',
    target: 200,
    alertThreshold: 100,
    trendComparisonPeriod: 'daily',
    refreshInterval: '15m',
    unit: 'assessments',
    format: 'number',
    icon: 'ClipboardCheck',
  },
  {
    id: 'avg_submissions_7d',
    title: 'Avg Submissions/Day (7D)',
    category: 'Assessments',
    calculation: 'COUNT(*) / 7 FROM assessment_submissions WHERE submitted_at >= DATE_SUB(TODAY(), 7)',
    target: 200,
    trendComparisonPeriod: 'weekly',
    refreshInterval: '1h',
    unit: 'assessments/day',
    format: 'decimal:1',
    icon: 'BarChart3',
  },
  {
    id: 'avg_completion_time',
    title: 'Avg Completion Time',
    category: 'Assessments',
    calculation: 'AVG(EXTRACT(EPOCH FROM submitted_at - started_at) / 60) FROM assessment_submissions WHERE submitted_at >= DATE_SUB(TODAY(), 7)',
    target: 5,
    unit: 'minutes',
    format: 'decimal:1',
    trendComparisonPeriod: 'weekly',
    refreshInterval: '1h',
    icon: 'Hourglass',
  },
  {
    id: 'dropout_rate',
    title: 'Dropout Rate',
    category: 'Assessments',
    calculation: '(COUNT(*) FILTER (WHERE abandoned = true) / COUNT(*)) * 100 FROM assessment_sessions',
    target: 10,
    unit: '%',
    format: 'percent',
    isInverse: true,
    trendComparisonPeriod: 'weekly',
    refreshInterval: '1h',
    icon: 'AlertTriangle',
  },

  // Row 4: Clinical & Messaging
  {
    id: 'clinician_accounts',
    title: 'Clinician Accounts',
    category: 'Clinical',
    calculation: 'COUNT(*) FROM profiles WHERE user_type = "clinician" AND deleted_at IS NULL',
    target: 50,
    trendComparisonPeriod: 'monthly',
    refreshInterval: '1h',
    unit: 'clinicians',
    format: 'number',
    icon: 'Stethoscope',
  },
  {
    id: 'clinician_requests_pending',
    title: 'Pending Clinician Requests',
    category: 'Clinical',
    calculation: 'COUNT(*) FROM clinician_requests WHERE status = "pending"',
    alertThreshold: 5,
    trendComparisonPeriod: 'daily',
    refreshInterval: '30m',
    unit: 'requests',
    format: 'number',
    icon: 'FileText',
  },
  {
    id: 'messages_today',
    title: 'Messages Sent (Today)',
    category: 'Clinical',
    calculation: 'COUNT(*) FROM messages WHERE DATE(created_at) = TODAY()',
    target: 100,
    trendComparisonPeriod: 'daily',
    refreshInterval: '15m',
    unit: 'messages',
    format: 'number',
    icon: 'MessageSquare',
  },
  {
    id: 'appointments_scheduled',
    title: 'Appointments (Upcoming)',
    category: 'Clinical',
    calculation: 'COUNT(*) FROM appointments WHERE scheduled_at > NOW() AND status = "confirmed"',
    target: 50,
    trendComparisonPeriod: 'daily',
    refreshInterval: '30m',
    unit: 'appointments',
    format: 'number',
    icon: 'Calendar',
  },

  // Row 5: System Health
  {
    id: 'login_success_rate',
    title: 'Login Success Rate',
    category: 'System',
    calculation: '(COUNT(*) FILTER (WHERE status = "success") / COUNT(*)) * 100 FROM login_attempts WHERE DATE(attempt_at) = TODAY()',
    target: 99,
    alertThreshold: 95,
    unit: '%',
    format: 'percent',
    trendComparisonPeriod: 'daily',
    refreshInterval: '15m',
    icon: 'CheckCircle',
  },
  {
    id: 'login_failure_rate',
    title: 'Login Failure Rate',
    category: 'System',
    calculation: '(COUNT(*) FILTER (WHERE status = "failed") / COUNT(*)) * 100 FROM login_attempts WHERE DATE(attempt_at) = TODAY()',
    target: 1,
    unit: '%',
    format: 'percent',
    isInverse: true,
    trendComparisonPeriod: 'daily',
    refreshInterval: '15m',
    icon: 'AlertTriangle',
  },
  {
    id: 'captcha_solve_rate',
    title: 'CAPTCHA Solve Rate',
    category: 'System',
    calculation: '(COUNT(*) FILTER (WHERE solved = true) / COUNT(*)) * 100 FROM captcha_attempts WHERE DATE(attempt_at) >= DATE_SUB(TODAY(), 1)',
    target: 95,
    alertThreshold: 80,
    unit: '%',
    format: 'percent',
    trendComparisonPeriod: 'daily',
    refreshInterval: '1h',
    icon: 'Shield',
  },
  {
    id: 'api_response_time_p95',
    title: 'API Response Time (p95)',
    category: 'System',
    calculation: 'PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) FROM api_logs WHERE DATE(timestamp) = TODAY()',
    target: 200,
    alertThreshold: 500,
    unit: 'ms',
    format: 'number',
    trendComparisonPeriod: 'daily',
    refreshInterval: '5m',
    icon: 'Zap',
  },
]
