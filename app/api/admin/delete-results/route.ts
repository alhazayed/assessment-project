import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * DELETE /api/admin/delete-results
 *
 * Superadmin-only endpoint to delete specific assessment submissions and responses.
 *
 * Request body (one of):
 * {
 *   submissionId: string - Delete a single assessment submission and its responses
 * }
 * OR
 * {
 *   patientId: string - Delete all assessment submissions/responses for a patient
 * }
 * OR
 * {
 *   definitionId: string - Delete all submissions for a specific assessment definition
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   deleted: {
 *     submissionCount: number,
 *     responseCount: number,
 *     timestamp: string
 *   }
 * }
 */
export async function DELETE(request: Request) {
  try {
    // Require superadmin
    const { user: callerUser, role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can delete assessment results' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { submissionId, patientId, definitionId } = body

    // Validate that exactly one filter is provided
    const filterCount = [submissionId, patientId, definitionId].filter(x => x).length
    if (filterCount !== 1) {
      return NextResponse.json(
        {
          error: 'Provide exactly one of: submissionId, patientId, or definitionId',
        },
        { status: 400 }
      )
    }

    const db = createAdminClient()

    let submissionsToDelete: string[] = []

    // Determine which submissions to delete
    if (submissionId) {
      // Single submission
      const { data } = await db
        .from('assessment_submissions')
        .select('id')
        .eq('id', submissionId)
        .single()

      if (!data) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        )
      }
      submissionsToDelete = [data.id]
    } else if (patientId) {
      // All submissions for patient
      const { data: submissions } = await db
        .from('assessment_submissions')
        .select('id')
        .eq('patient_id', patientId)

      submissionsToDelete = submissions?.map((s: any) => s.id) || []

      if (submissionsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No submissions found for this patient' },
          { status: 404 }
        )
      }
    } else if (definitionId) {
      // All submissions for definition
      const { data: submissions } = await db
        .from('assessment_submissions')
        .select('id')
        .eq('definition_id', definitionId)

      submissionsToDelete = submissions?.map((s: any) => s.id) || []

      if (submissionsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No submissions found for this assessment definition' },
          { status: 404 }
        )
      }
    }

    // Count records before deletion
    const { count: responseCount } = await db
      .from('assessment_responses')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionsToDelete)

    // Delete in order (responses before submissions)
    await db
      .from('assessment_responses')
      .delete()
      .in('submission_id', submissionsToDelete)

    await db
      .from('assessment_submissions')
      .delete()
      .in('id', submissionsToDelete)

    // Audit log
    const filterType = submissionId ? 'submission' : patientId ? 'patient' : 'definition'
    const filterValue = submissionId || patientId || definitionId

    await db.from('audit_log').insert({
      actor_id: callerUser.id,
      action: 'assessment_results_deletion',
      target_type: 'assessment_submissions',
      target_id: submissionsToDelete[0],
      reason: `Deleted ${submissionsToDelete.length} submission(s) by ${filterType}: ${filterValue}`,
      details: {
        filter_type: filterType,
        filter_value: filterValue,
        submissions_deleted: submissionsToDelete.length,
        responses_deleted: responseCount || 0,
      },
    })

    return NextResponse.json({
      ok: true,
      deleted: {
        submissionCount: submissionsToDelete.length,
        responseCount: responseCount || 0,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Assessment results deletion error:', error)
    return adminRouteError(error)
  }
}

/**
 * GET /api/admin/delete-results?type=[submission|patient|definition]&id=[id]
 *
 * Preview what assessment results will be deleted (superadmin only, no actual deletion)
 */
export async function GET(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can preview deletions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // submission, patient, definition
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Query parameters required: type (submission|patient|definition) and id' },
        { status: 400 }
      )
    }

    if (!['submission', 'patient', 'definition'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be: submission, patient, or definition' },
        { status: 400 }
      )
    }

    const db = createAdminClient()

    let query = db.from('assessment_submissions').select('id, patient_id, definition_id, submitted_at')

    if (type === 'submission') {
      query = query.eq('id', id)
    } else if (type === 'patient') {
      query = query.eq('patient_id', id)
    } else if (type === 'definition') {
      query = query.eq('definition_id', id)
    }

    const { data: submissions } = await query

    if (!submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: `No submissions found for ${type}: ${id}` },
        { status: 404 }
      )
    }

    const submissionIds = submissions.map((s: any) => s.id)

    // Count related records
    const { count: responseCount } = await db
      .from('assessment_responses')
      .select('*', { count: 'exact', head: true })
      .in('submission_id', submissionIds)

    return NextResponse.json({
      submissions: submissions.length,
      willDelete: {
        submissions: submissions.length,
        responses: responseCount || 0,
        total: (submissions.length || 0) + (responseCount || 0),
      },
      details: submissions,
    })
  } catch (error) {
    console.error('Deletion preview error:', error)
    return adminRouteError(error)
  }
}
