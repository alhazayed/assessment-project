import { createAdminClient } from '@/lib/supabase/admin'
import { AdminAuthError, requireAdminApi } from '@/lib/admin-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

function adminAuthResponse(err: unknown) {
  if (err instanceof AdminAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { kpiId: string } }
) {
  try {
    const { user } = await requireAdminApi()
    const db = createAdminClient()

    const rl = await checkRateLimit(`admin-kpi-alert:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { threshold, enabled, notificationChannels } = body

    if (typeof threshold !== 'number' || threshold < 0) {
      return NextResponse.json({ error: 'Invalid threshold value' }, { status: 400 })
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid enabled value' }, { status: 400 })
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
    const res = adminAuthResponse(error)
    if (res) return res
    console.error('KPI alert configuration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { kpiId: string } }
) {
  try {
    await requireAdminApi()

    const defaultConfig = {
      kpiId: params.kpiId,
      threshold: 80,
      enabled: false,
      notificationChannels: ['dashboard'],
    }

    return NextResponse.json(defaultConfig)
  } catch (error) {
    const res = adminAuthResponse(error)
    if (res) return res
    console.error('KPI alert fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
