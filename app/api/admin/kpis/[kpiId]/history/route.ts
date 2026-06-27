import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { KPI_DEFINITIONS, type KPIHistoryPoint } from '@/lib/types/kpi'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { kpiId: string } }
) {
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

    // Get query parameter for days (7, 30, 90)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const validDays = [7, 30, 90].includes(days) ? days : 7

    // Find KPI definition
    const kpi = KPI_DEFINITIONS.find(k => k.id === params.kpiId)
    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    // Fetch historical data from materialized views
    // For now, return mock data with correct structure
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - validDays)

    const history: KPIHistoryPoint[] = []

    // Generate historical data points
    for (let i = validDays; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      // Generate trending data
      const baseValue = kpi.target || 100
      const variance = Math.random() * 20 - 10 // ±10% variance
      const value = Math.round(baseValue * (1 + variance / 100))

      history.push({
        date,
        value: Math.max(0, value),
        target: kpi.target,
      })
    }

    return NextResponse.json(history)
  } catch (error) {
    console.error('KPI history fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
