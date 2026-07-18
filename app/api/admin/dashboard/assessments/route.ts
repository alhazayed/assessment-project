import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const db = createAdminClient()

    const url = new URL(request.url)
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '10', 10)))

    const { data: assessments, error } = await db.rpc('get_top_assessments', {
      p_limit: limit,
    })

    if (error) {
      console.error('Top assessments error:', error)
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      assessments,
      count: assessments?.length || 0,
    })
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Assessments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
