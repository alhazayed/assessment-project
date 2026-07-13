import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { KPI_DEFINITIONS, type KPIValue, type KPIStatus } from '@/lib/types/kpi'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// KPIs that have no backing table in the current schema. We surface them as
// `available: false` so the dashboard shows an honest "no data source" state
// instead of a zero that looks like a real (critical) reading.
const UNAVAILABLE: Record<string, string> = {
  registrations_pending: 'auth.users not exposed to PostgREST',
  dropout_rate: 'no assessment_sessions table',
  appointments_scheduled: 'no appointments table',
  login_success_rate: 'no login_attempts table',
  login_failure_rate: 'no login_attempts table',
  captcha_solve_rate: 'no captcha_attempts table',
  api_response_time_p95: 'no api_logs table',
}

function computeStatus(
  value: number,
  def: { target?: number; alertThreshold?: number; isInverse?: boolean }
): KPIStatus {
  if (def.alertThreshold != null) {
    if (def.isInverse) return value > def.alertThreshold ? 'critical' : 'good'
    if (value < def.alertThreshold) return 'critical'
    if (value < def.alertThreshold * 1.2) return 'warning'
    return 'good'
  }
  if (def.target != null && def.target > 0) {
    const pct = (value / def.target) * 100
    if (def.isInverse) {
      // For inverse metrics, lower is better; being at/under target is good.
      if (value <= def.target) return 'good'
      if (value <= def.target * 1.5) return 'warning'
      return 'critical'
    }
    if (pct >= 90) return 'good'
    if (pct >= 70) return 'warning'
    return 'critical'
  }
  return 'good'
}

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()

    // Time boundaries (UTC)
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setUTCHours(0, 0, 0, 0)
    const start7d = new Date(startOfToday)
    start7d.setUTCDate(start7d.getUTCDate() - 7)
    const start30d = new Date(startOfToday)
    start30d.setUTCDate(start30d.getUTCDate() - 30)

    const todayIso = startOfToday.toISOString()
    const iso7d = start7d.toISOString()
    const iso30d = start30d.toISOString()

    const count = (q: any) => q.then((r: any) => r.count ?? 0)

    const countDistinct = async (since: string) => {
      const { data, error } = await db.rpc('count_distinct_active_patients', { p_since: since })
      if (error) {
        console.error('count_distinct_active_patients error:', error)
        return 0
      }
      return Number(data ?? 0)
    }

    // Fire the real queries in parallel.
    const [
      totalPatients,
      activeToday,
      active7d,
      active30d,
      newSignupsToday,
      passwordResetsToday,
      emailVerifsToday,
      completedToday,
      submissions7d,
      clinicianAccounts,
      clinicianPending,
      messagesToday,
      completionRows,
    ] = await Promise.all([
      count(db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'patient')),
      countDistinct(todayIso),
      countDistinct(iso7d),
      countDistinct(iso30d),
      count(db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayIso)),
      count(db.from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'password_reset').gte('created_at', todayIso)),
      count(db.from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'email_verified').gte('created_at', todayIso)),
      count(db.from('assessment_submissions').select('id', { count: 'exact', head: true }).gte('submitted_at', todayIso)),
      count(db.from('assessment_submissions').select('id', { count: 'exact', head: true }).gte('submitted_at', iso7d)),
      count(db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'clinician')),
      count(db.from('clinician_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification')),
      count(db.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', todayIso)),
      db.from('assessment_submissions').select('started_at, submitted_at').gte('submitted_at', iso7d).not('started_at', 'is', null).limit(500),
    ])

    // Average completion time (minutes) over the last 7 days
    const durations: number[] = (completionRows?.data ?? [])
      .map((r: any) => {
        const s = new Date(r.started_at).getTime()
        const e = new Date(r.submitted_at).getTime()
        return e > s ? (e - s) / 60000 : null
      })
      .filter((n: number | null): n is number => n != null)
    const avgCompletion = durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0

    const realValues: Record<string, number> = {
      total_users: totalPatients,
      active_users_today: activeToday,
      active_users_7d: active7d,
      active_users_30d: active30d,
      new_signups_today: newSignupsToday,
      password_resets_today: passwordResetsToday,
      email_verifications_today: emailVerifsToday,
      assessments_completed_today: completedToday,
      avg_submissions_7d: Math.round((submissions7d / 7) * 10) / 10,
      avg_completion_time: avgCompletion,
      clinician_accounts: clinicianAccounts,
      clinician_requests_pending: clinicianPending,
      messages_today: messagesToday,
    }

    const updatedAt = now.toISOString()

    const kpis: KPIValue[] = KPI_DEFINITIONS.map(def => {
      if (UNAVAILABLE[def.id]) {
        return {
          id: def.id,
          title: def.title,
          value: '—',
          available: false,
          target: def.target,
          format: def.format,
          unit: def.unit,
          lastUpdated: updatedAt,
        }
      }
      const value = realValues[def.id] ?? 0
      return {
        id: def.id,
        title: def.title,
        value,
        available: true,
        target: def.target,
        status: computeStatus(value, def),
        format: def.format,
        unit: def.unit,
        lastUpdated: updatedAt,
      }
    })

    return NextResponse.json(kpis)
  } catch (err: any) {
    // requireAdmin() throws a redirect for unauthenticated/non-admin callers.
    if (err?.digest?.toString().startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('KPI fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
