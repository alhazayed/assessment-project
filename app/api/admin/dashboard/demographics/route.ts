import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const db = createAdminClient()

    const url = new URL(request.url)
    const type = url.searchParams.get('type') || null

    const { data: demographics, error } = await db.rpc('get_demographics_breakdown', {
      p_demographic_type: type,
    })

    if (error) {
      console.error('Demographics error:', error)
      return NextResponse.json({ error: 'Failed to fetch demographics' }, { status: 500 })
    }

    const grouped = (demographics || []).reduce((acc: Record<string, unknown[]>, item: { demographic_type: string }) => {
      if (!acc[item.demographic_type]) {
        acc[item.demographic_type] = []
      }
      acc[item.demographic_type].push(item)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      demographics: grouped,
      count: demographics?.length || 0,
    })
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Demographics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
