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
      // Hard delete: remove all data
      await hardDeleteUserData(db, userId)
    } else {
      // Soft delete: mark as deleted_at
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
  const { count: submissionCount } = await db
    .from('assessment_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', userId)
  counts['assessment_submissions'] = submissionCount || 0

  // Count assessment responses (answers/results)
  const { count: responseCount } = await db
    .from('assessment_responses')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', userId)
  counts['assessment_responses'] = responseCount || 0

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
 * Hard delete: Remove all data from database
 */
async function hardDeleteUserData(db: ReturnType<typeof createAdminClient>, userId: string) {
  // Order matters: delete child records before parent
  // Assessment responses must be deleted before submissions

  // 1. Delete assessment responses (answers/results)
  await db
    .from('assessment_responses')
    .delete()
    .eq('patient_id', userId)

  // 2. Delete assessment submissions
  await db
    .from('assessment_submissions')
    .delete()
    .eq('patient_id', userId)

  // 3. Delete messages (both sent and received)
  await db
    .from('messages')
    .delete()
    .or(`patient_id.eq.${userId},clinician_id.eq.${userId}`)

  // 4. Delete notifications
  await db
    .from('notifications')
    .delete()
    .eq('user_id', userId)

  // 5. Delete clinical notes
  await db
    .from('clinical_notes')
    .delete()
    .eq('patient_id', userId)

  // 6. Delete patient profile
  await db
    .from('patient_profiles')
    .delete()
    .eq('user_id', userId)

  // 7. Delete clinician profile
  await db
    .from('clinician_profiles')
    .delete()
    .eq('user_id', userId)

  // 8. Delete user profile
  await db
    .from('profiles')
    .delete()
    .eq('id', userId)

  // 9. Delete from auth.users (if service role permits)
  // NOTE: This requires server-side Supabase client with service role
  // Supabase doesn't expose auth.users deletion via normal API
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

    // Verify user exists
    const { data: profile } = await db
      .from('profiles')
      .select('id, full_name_en, full_name_ar, email, role, created_at')
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
