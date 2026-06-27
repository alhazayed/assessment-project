import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { KPI_DEFINITIONS, type KPIValue } from '@/lib/types/kpi'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const db = createAdminClient()

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch KPI values from materialized views
    const { data: stats } = await db
      .from('admin_daily_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    const { data: assessments } = await db
      .from('admin_assessment_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    const { data: engagement } = await db
      .from('admin_user_engagement_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    // Map materialized view data to KPI values
    const kpiValues: KPIValue[] = KPI_DEFINITIONS.map(kpi => {
      let value = 0
      let trend = 0
      let status: 'good' | 'warning' | 'critical' = 'good'

      // Map KPI ID to data source
      switch (kpi.id) {
        case 'total_users':
          value = stats?.total_users || 0
          break
        case 'active_users_today':
          value = stats?.active_users_today || 0
          break
        case 'active_users_7d':
          value = engagement?.active_users_7d || 0
          break
        case 'active_users_30d':
          value = engagement?.active_users_30d || 0
          break
        case 'assessments_completed_today':
          value = assessments?.completed_today || 0
          break
        case 'avg_submissions_7d':
          value = assessments?.avg_submissions_7d || 0
          break
        case 'avg_completion_time':
          value = assessments?.avg_completion_time || 0
          break
        case 'dropout_rate':
          value = assessments?.dropout_rate || 0
          break
        default:
          value = 0
      }

      // Calculate status based on threshold
      if (kpi.alertThreshold) {
        if (kpi.isInverse) {
          status = value > kpi.alertThreshold ? 'critical' : 'good'
        } else {
          status = value < kpi.alertThreshold ? 'critical' : value < (kpi.alertThreshold * 1.2) ? 'warning' : 'good'
        }
      } else if (kpi.target) {
        const percentage = (value / kpi.target) * 100
        if (percentage >= 90) {
          status = 'good'
        } else if (percentage >= 70) {
          status = 'warning'
        } else {
          status = 'critical'
        }
      }

      return {
        id: kpi.id,
        title: kpi.title,
        value,
        trend,
        trendDirection: 'neutral' as const,
        target: kpi.target,
        status,
        lastUpdated: new Date(stats?.date || new Date()),
        format: kpi.format,
        unit: kpi.unit,
      }
    })

    return NextResponse.json(kpiValues)
  } catch (error) {
    console.error('KPI fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
