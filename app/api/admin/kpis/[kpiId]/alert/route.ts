import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest, props: { params: Promise<{ kpiId: string }> }) {
  const params = await props.params;
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

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { threshold, enabled, notificationChannels } = body

    // Validate input
    if (typeof threshold !== 'number' || threshold < 0) {
      return NextResponse.json(
        { error: 'Invalid threshold value' },
        { status: 400 }
      )
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid enabled value' },
        { status: 400 }
      )
    }

    // Store alert configuration in database
    // For now, return success response with stored data
    const alertConfig = {
      kpiId: params.kpiId,
      threshold,
      enabled,
      notificationChannels: notificationChannels || ['dashboard'],
      updatedAt: new Date(),
      updatedBy: user.id,
    }

    // TODO: Store in kpi_alerts table once schema is updated
    // const { error } = await db
    //   .from('kpi_alerts')
    //   .upsert(alertConfig)

    // Log to audit trail
    await db.from('audit_log').insert({
      action: 'kpi_alert_configured',
      actor_id: user.id,
      target_type: 'kpi',
      target_id: params.kpiId,
      details: {
        threshold,
        enabled,
        notificationChannels,
      },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      kpi_id: params.kpiId,
      config: alertConfig,
    })
  } catch (error) {
    console.error('KPI alert configuration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, props: { params: Promise<{ kpiId: string }> }) {
  const params = await props.params;
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

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // TODO: Fetch from kpi_alerts table
    // For now, return default config
    const defaultConfig = {
      kpiId: params.kpiId,
      threshold: 80,
      enabled: false,
      notificationChannels: ['dashboard'],
    }

    return NextResponse.json(defaultConfig)
  } catch (error) {
    console.error('KPI alert fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
