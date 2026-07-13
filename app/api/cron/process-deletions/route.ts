import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DELETION_GRACE_DAYS = 30

/**
 * Processes GDPR account deletion requests older than 30 days.
 * Invoke via Vercel Cron or external scheduler with Authorization: Bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const cutoff = new Date(Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: pending, error: fetchError } = await db
    .from('profiles')
    .select('id, deletion_requested_at')
    .not('deletion_requested_at', 'is', null)
    .lte('deletion_requested_at', cutoff)
    .limit(50)

  if (fetchError) {
    console.error('process-deletions fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch pending deletions' }, { status: 500 })
  }

  const results: Array<{ id: string; status: 'deleted' | 'failed'; error?: string }> = []

  for (const profile of pending ?? []) {
    const { error: deleteError } = await db.auth.admin.deleteUser(profile.id)
    if (deleteError) {
      console.error(`process-deletions failed for ${profile.id}:`, deleteError)
      results.push({ id: profile.id, status: 'failed', error: deleteError.message })
    } else {
      results.push({ id: profile.id, status: 'deleted' })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    deleted: results.filter(r => r.status === 'deleted').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  })
}
