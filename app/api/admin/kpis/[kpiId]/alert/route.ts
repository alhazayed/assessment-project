import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/safe-log'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { kpiId: string } }
) {
  try {
    const adminCtx = await requireAdminApi()
    if (!adminCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { user } = adminCtx
    const db = createAdminClient()

    const body = await request.json()
    const { threshold, enabled, notificationChannels } = body

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

    const alertConfig = {
      kpiId: params.kpiId,
      threshold,
      enabled,
      notificationChannels: notificationChannels || ['dashboard'],
      updatedAt: new Date(),
      updatedBy: user.id,
    }

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
    logError('KPI alert configuration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { kpiId: string } }
) {
  try {
    const adminCtx = await requireAdminApi()
    if (!adminCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const defaultConfig = {
      kpiId: params.kpiId,
      threshold: 80,
      enabled: false,
      notificationChannels: ['dashboard'],
    }

    return NextResponse.json(defaultConfig)
  } catch (error) {
    logError('KPI alert fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
