import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()

    const { data: metrics, error } = await db.rpc('get_user_engagement_metrics')

    if (error) {
      console.error('Engagement metrics error:', error)
      return NextResponse.json({ error: 'Failed to fetch engagement data' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metrics: metrics?.[0] || null,
    })
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Engagement API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
