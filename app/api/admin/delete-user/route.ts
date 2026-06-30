import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/admin/delete-user
 *
 * Superadmin-only endpoint to delete a user profile and all associated data.
 *
 * Request body:
 * {
 *   userId: string (required) - UUID of user to delete
 *   reason: string (optional) - Reason for deletion (for audit trail)
 *   hardDelete: boolean (optional, default: false) - If true, hard delete; if false, soft delete
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   deleted: {
 *     profileId: string,
 *     assessmentSubmissions: number,
 *     assessmentAnswers: number,
 *     assessmentResults: number,
 *     messages: number,
 *     notifications: number,
 *     clinicalNotes: number,
 *     draftAssessments: number
 *   }
 * }
 */
export async function DELETE(request: Request) {
  try {
    // Require superadmin
    const { user: callerUser, role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can delete user profiles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, reason = 'Administrative deletion', hardDelete = false } = body

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required and must be a valid UUID' },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (userId === callerUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const db = createAdminClient()

    // Verify user exists
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Cannot delete other superadmins
    if (profile.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot delete other superadmin accounts' },
        { status: 403 }
      )
    }

    // Count records before deletion for audit
    const countBeforeDeletion = await countUserData(db, userId)

    if (hardDelete) {
      // Hard delete: remove all user-owned data atomically via the RPC.
      const { error: rpcError } = await db.rpc('admin_hard_delete_user', { target: userId })
      if (rpcError) {
        console.error('Hard delete RPC error:', rpcError)
        return NextResponse.json(
          { error: `Hard delete failed: ${rpcError.message}. No data was removed — try a soft delete instead.` },
          { status: 500 }
        )
      }
      // Remove the auth user so the login can no longer be used (best effort).
      await db.auth.admin.deleteUser(userId).catch((e) => {
        console.error('auth.admin.deleteUser error (profile already removed):', e)
      })
    } else {
      // Soft delete: mark as inactive (reversible, compliance-safe default)
      await softDeleteUserData(db, userId)
    }

    // Audit log
    await db.from('audit_log').insert({
      actor_id: callerUser.id,
      action: 'user_deletion',
      target_type: 'profile',
      target_id: userId,
      reason: `${hardDelete ? 'HARD' : 'SOFT'} DELETE: ${reason}`,
      metadata: {
        deleted_records: countBeforeDeletion,
        method: hardDelete ? 'hard' : 'soft',
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      ok: true,
      deleted: {
        profileId: userId,
        deletionMethod: hardDelete ? 'hard' : 'soft',
        recordsDeleted: countBeforeDeletion,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Count all data associated with a user
 */
async function countUserData(db: ReturnType<typeof createAdminClient>, userId: string) {
  const counts: Record<string, number> = {}

  // Count assessment submissions
  const { data: submissionRows, count: submissionCount } = await db
    .from('assessment_submissions')
    .select('id', { count: 'exact' })
    .eq('patient_id', userId)
  counts['assessment_submissions'] = submissionCount || 0

  // Count assessment responses — keyed by submission_id, not patient_id.
  const submissionIds = (submissionRows || []).map((s: any) => s.id)
  let responseCount = 0
  if (submissionIds.length > 0) {
    const { count } = await db
      .from('assessment_responses')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionIds)
    responseCount = count || 0
  }
  counts['assessment_responses'] = responseCount

  // Count messages
  const { count: messageCount } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .or(`patient_id.eq.${userId},clinician_id.eq.${userId}`)
  counts['messages'] = messageCount || 0

  // Count notifications
  const { count: notificationCount } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  counts['notifications'] = notificationCount || 0

  // Count clinical notes
  const { count: noteCount } = await db
    .from('clinical_notes')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', userId)
  counts['clinical_notes'] = noteCount || 0

  return counts
}

/**
 * Soft delete: Mark user as inactive instead of removing
 * Allows for recovery and preserves referential integrity
 */
async function softDeleteUserData(db: ReturnType<typeof createAdminClient>, userId: string) {
  // Soft delete profile (mark as inactive)
  await db
    .from('profiles')
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

/**
 * GET /api/admin/delete-user?userId=[id]
 *
 * Preview what will be deleted (superadmin only, no actual deletion)
 */
export async function GET(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can preview user deletions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId query parameter required' },
        { status: 400 }
      )
    }

    const db = createAdminClient()

    // Verify user exists (profiles has no email column — that lives in auth.users)
    const { data: profile } = await db
      .from('profiles')
      .select('id, full_name_en, full_name_ar, role, created_at')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const counts = await countUserData(db, userId)

    return NextResponse.json({
      user: profile,
      willDelete: counts,
      totalRecords: Object.values(counts).reduce((a, b) => a + b, 0),
    })
  } catch (error) {
    console.error('User deletion preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
