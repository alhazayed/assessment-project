import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll, chunk } from '@/lib/admin/fetch-all'
import { writeAdminAudit } from '@/lib/admin/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// IDs per DELETE/count request, keeping `.in()` filters under URL-length limits.
const DELETE_CHUNK = 200
// Rows returned in the preview's `details` sample (counts are always exact).
const PREVIEW_DETAILS_LIMIT = 100

type FilterType = 'submission' | 'patient' | 'definition'
const FILTER_COLUMN: Record<FilterType, 'id' | 'patient_id' | 'definition_id'> = {
  submission: 'id',
  patient: 'patient_id',
  definition: 'definition_id',
}

/**
 * Every submission ID matching the filter, paged past PostgREST's 1,000-row
 * max_rows cap (a plain select previously returned only the first 1,000, so a
 * bulk delete silently left the rest behind).
 */
async function matchingSubmissionIds(
  db: ReturnType<typeof createAdminClient>,
  type: FilterType,
  value: string,
): Promise<string[]> {
  const rows = await fetchAll<{ id: string }>(() => db
    .from('assessment_submissions')
    .select('id')
    .eq(FILTER_COLUMN[type], value)
    .order('id', { ascending: true }))
  return rows.map(r => r.id)
}

async function countResponses(db: ReturnType<typeof createAdminClient>, submissionIds: string[]): Promise<number> {
  let total = 0
  for (const ids of chunk(submissionIds, DELETE_CHUNK)) {
    const { count, error } = await db
      .from('assessment_responses')
      .select('id', { count: 'exact', head: true })
      .in('submission_id', ids)
    if (error) throw new Error(`count responses: ${error.message}`)
    total += count ?? 0
  }
  return total
}

/**
 * DELETE /api/admin/delete-results
 *
 * Superadmin-only endpoint to delete assessment submissions and their responses.
 *
 * Request body (exactly one of):
 *   { submissionId: uuid }  - one submission and its responses
 *   { patientId: uuid }     - every submission for a patient
 *   { definitionId: uuid }  - every submission for an assessment definition
 *
 * Every matching submission is deleted (paged, then deleted in chunks), every
 * step's error is checked, and the response reports the exact counts deleted.
 * The success audit row and `ok: true` are written only when everything
 * succeeded. If a chunk fails part-way, the route stops, records a
 * `assessment_results_deletion_partial` audit row with what was actually
 * deleted (deleted PHI must never go unlogged), and returns 500 with the counts.
 *
 * Response: { ok: true, deleted: { submissionCount, responseCount, timestamp } }
 */
export async function DELETE(request: Request) {
  try {
    const { user: callerUser, role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can delete assessment results' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const { submissionId, patientId, definitionId } = (body ?? {}) as Record<string, unknown>

    const provided = ([
      ['submission', submissionId],
      ['patient', patientId],
      ['definition', definitionId],
    ] as const).filter(([, v]) => v != null && v !== '')
    if (provided.length !== 1) {
      return NextResponse.json(
        { error: 'Provide exactly one of: submissionId, patientId, or definitionId' },
        { status: 400 }
      )
    }
    const [filterType, rawValue] = provided[0]
    if (typeof rawValue !== 'string' || !UUID_RE.test(rawValue)) {
      return NextResponse.json({ error: 'The id must be a UUID' }, { status: 400 })
    }
    const filterValue = rawValue

    const db = createAdminClient()
    const submissionIds = await matchingSubmissionIds(db, filterType, filterValue)

    if (submissionIds.length === 0) {
      const msg = filterType === 'submission'
        ? 'Submission not found'
        : filterType === 'patient'
          ? 'No submissions found for this patient'
          : 'No submissions found for this assessment definition'
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    // Delete responses first, then submissions, chunk by chunk, counting what
    // each statement actually removed.
    let responsesDeleted = 0
    let submissionsDeleted = 0
    let failure: string | null = null

    for (const ids of chunk(submissionIds, DELETE_CHUNK)) {
      const { count: rCount, error: rErr } = await db
        .from('assessment_responses')
        .delete({ count: 'exact' })
        .in('submission_id', ids)
      if (rErr) { failure = `responses: ${rErr.message}`; break }
      responsesDeleted += rCount ?? 0

      const { count: sCount, error: sErr } = await db
        .from('assessment_submissions')
        .delete({ count: 'exact' })
        .in('id', ids)
      if (sErr) { failure = `submissions: ${sErr.message}`; break }
      submissionsDeleted += sCount ?? 0
    }

    const auditDetails = {
      filter_type: filterType,
      filter_value: filterValue,
      submissions_matched: submissionIds.length,
      submissions_deleted: submissionsDeleted,
      responses_deleted: responsesDeleted,
    }

    if (failure || submissionsDeleted !== submissionIds.length) {
      console.error('[delete-results] incomplete deletion:', failure ?? 'count mismatch', auditDetails)
      await writeAdminAudit({
        actorId: callerUser.id,
        action: 'assessment_results_deletion_partial',
        targetType: 'assessment_submissions',
        targetId: filterValue,
        details: { ...auditDetails, error: failure ?? 'deleted count did not match matched count' },
      }, db)
      return NextResponse.json(
        {
          error: 'Deletion did not complete. Some results may remain; retry to delete the rest.',
          deleted: { submissionCount: submissionsDeleted, responseCount: responsesDeleted },
          matched: submissionIds.length,
        },
        { status: 500 }
      )
    }

    const audited = await writeAdminAudit({
      actorId: callerUser.id,
      action: 'assessment_results_deletion',
      targetType: 'assessment_submissions',
      targetId: filterValue,
      details: auditDetails,
    }, db)
    if (!audited) {
      // The data is gone; surface that the audit trail is missing so it can be
      // reconstructed from server logs rather than reporting a clean success.
      return NextResponse.json(
        {
          error: 'Results were deleted but the audit log entry could not be written.',
          deleted: { submissionCount: submissionsDeleted, responseCount: responsesDeleted },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      deleted: {
        submissionCount: submissionsDeleted,
        responseCount: responsesDeleted,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    if (!isAuthRedirectError(error)) console.error('Assessment results deletion error:', error)
    return adminRouteError(error)
  }
}

/**
 * GET /api/admin/delete-results?type=[submission|patient|definition]&id=[uuid]
 *
 * Preview what assessment results will be deleted (superadmin only, no
 * deletion). Counts are exact; `details` is a sample of the first rows.
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
    const type = searchParams.get('type')
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
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'id must be a UUID' }, { status: 400 })
    }

    const db = createAdminClient()
    const filterType = type as FilterType
    const submissionIds = await matchingSubmissionIds(db, filterType, id)

    if (submissionIds.length === 0) {
      return NextResponse.json({ error: 'No submissions found' }, { status: 404 })
    }

    const responseCount = await countResponses(db, submissionIds)

    const { data: details, error: detailsErr } = await db
      .from('assessment_submissions')
      .select('id, patient_id, definition_id, submitted_at')
      .eq(FILTER_COLUMN[filterType], id)
      .order('submitted_at', { ascending: false })
      .limit(PREVIEW_DETAILS_LIMIT)
    if (detailsErr) throw new Error(detailsErr.message)

    return NextResponse.json({
      submissions: submissionIds.length,
      willDelete: {
        submissions: submissionIds.length,
        responses: responseCount,
        total: submissionIds.length + responseCount,
      },
      details: details ?? [],
      detailsTruncated: submissionIds.length > (details?.length ?? 0),
    })
  } catch (error) {
    if (!isAuthRedirectError(error)) console.error('Deletion preview error:', error)
    return adminRouteError(error)
  }
}
