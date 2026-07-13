import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/safe-log'

const ALLOWED_REVIEW_STATUSES = ['verified', 'rejected', 'suspended'] as const
type ReviewStatus = (typeof ALLOWED_REVIEW_STATUSES)[number]

export async function GET(request: Request) {
  const adminCtx = await requireAdminApi()
  if (!adminCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') || ''
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const admin = createAdminClient()

  let query = admin
    .from('clinician_verifications')
    .select(
      `
      *,
      profiles!clinician_verifications_clinician_id_fkey(full_name_en, role, avatar_url)
    `,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: verifications, count, error } = await query

  if (error) {
    logError('clinician-verifications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 })
  }

  return NextResponse.json({ verifications: verifications ?? [], total: count ?? 0 })
}

export async function PATCH(request: Request) {
  const adminCtx = await requireAdminApi()
  if (!adminCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user } = adminCtx

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, status, rejection_reason } = body

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid field: id' }, { status: 400 })
  }

  if (!status || !(ALLOWED_REVIEW_STATUSES as readonly string[]).includes(status as string)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_REVIEW_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const typedStatus = status as ReviewStatus

  const updatePayload: Record<string, unknown> = {
    status: typedStatus,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }

  if (typedStatus === 'rejected') {
    updatePayload.rejection_reason =
      rejection_reason && typeof rejection_reason === 'string' ? rejection_reason.trim() : null
  }

  const admin = createAdminClient()

  const { data: updated, error } = await admin
    .from('clinician_verifications')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('clinician-verifications PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'verification_reviewed',
    target_type: 'clinician_verification',
    target_id: id,
    details: { new_status: typedStatus },
  })

  return NextResponse.json(updated)
}
