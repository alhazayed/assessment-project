import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContentDisposition, getMimeTypeForFormat } from '@/lib/security/file-export'
import { fetchAll, fetchAllByIds } from '@/lib/admin/fetch-all'
import { writeAdminAudit } from '@/lib/admin/audit'
import { DEMOGRAPHIC_DIMENSIONS, DEMOGRAPHIC_SELECT, enrichDemographics, type DemographicDimension } from '@/lib/assessment-demographics'

// Formula-injection guard: a leading =,+,-,@ etc. is neutralised so spreadsheet
// apps don't execute a cell on import.
function csvSafe(value: string): string {
  if (/^[=+\-@|%\t\r]/.test(String(value))) return `'${value}`
  return String(value)
}
function rowsToCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  const esc = (v: unknown) => {
    const s = csvSafe(String(v ?? ''))
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

/**
 * GET /api/admin/assessments/[id]/answers-export?<demographic filters>
 *
 * One row per individual answer for an assessment, enriched with the submission
 * score/band and every demographic variant, so a superadmin can analyse
 * answer-level patterns (incl. per-person longitudinal change) in an external
 * stats tool. Superadmin only; rate-limited; CSV-injection hardened.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user, role } = await requireAdmin()
    if (role !== 'superadmin') return NextResponse.json({ error: 'Superadmin only' }, { status: 403 })

    const rl = await checkRateLimit(`answers-export:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Export rate limit reached. Please wait before exporting again.' }, { status: 429, headers: { 'Retry-After': '3600' } })
    }

    const { id: definitionId } = await ctx.params
    const { searchParams } = new URL(request.url)
    const filters: Partial<Record<DemographicDimension, string>> = {}
    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      const v = searchParams.get(dim)
      if (v) filters[dim] = v
    }

    const db = createAdminClient()

    const [defRes, itemsRes] = await Promise.all([
      db.from('assessment_definitions').select('id, code').eq('id', definitionId).single(),
      db.from('assessment_items').select('id, item_number, subscale, question_en').eq('definition_id', definitionId),
    ])

    if (defRes.error || !defRes.data) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    if (itemsRes.error) throw new Error(itemsRes.error.message)
    const code = defRes.data.code
    const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i]))

    // Every submission, in a deterministic order, paged past PostgREST's
    // 1,000-row max_rows cap (which previously truncated this export silently).
    type RawSub = { id: string; patient_id: string; total_score: number; severity_band: string | null; high_risk_flag: boolean; submitted_at: string } & Record<string, unknown>
    const rawSubs = await fetchAll<RawSub>(() => db
      .from('assessment_submissions')
      .select(`id, patient_id, total_score, severity_band, high_risk_flag, submitted_at, ${DEMOGRAPHIC_SELECT}`)
      .eq('definition_id', definitionId)
      .order('submitted_at', { ascending: true })
      .order('id', { ascending: true }) as unknown as { range(from: number, to: number): PromiseLike<{ data: RawSub[] | null; error: { message: string } | null }> })
    const subs = rawSubs
      .map(s => ({ sub: s, demo: enrichDemographics(s) }))
      .filter(({ demo }) => DEMOGRAPHIC_DIMENSIONS.every(dim => !filters[dim] || demo[dim] === filters[dim]))
    const subMap = new Map(subs.map(x => [x.sub.id, x]))
    const submissionIds = subs.map(x => x.sub.id)

    // Every answer for those submissions: chunked by submission and paged
    // within each chunk, so no chunk is cut at 1,000 rows.
    const responses = await fetchAllByIds<{ submission_id: string; item_id: string; response_value: number; response_label_en: string }>(
      submissionIds,
      idChunk => db
        .from('assessment_responses')
        .select('submission_id, item_id, response_value, response_label_en')
        .in('submission_id', idChunk)
        .order('submission_id', { ascending: true })
        .order('item_id', { ascending: true }),
    )

    const headers = [
      'submission_id', 'patient_id', 'submitted_at', 'assessment_code',
      'total_score', 'severity_band', 'high_risk',
      'gender', 'age_group', 'marital', 'education', 'country', 'employment', 'on_psych_medication',
      'item_number', 'subscale', 'question_en', 'response_value', 'response_label_en',
    ]
    const rows: (string | number | boolean)[][] = []
    for (const r of responses) {
      const entry = subMap.get(r.submission_id)
      if (!entry) continue
      const { sub, demo } = entry
      const it = itemMap.get(r.item_id)
      rows.push([
        sub.id, sub.patient_id, sub.submitted_at, code,
        sub.total_score, sub.severity_band ?? '', sub.high_risk_flag,
        demo.gender, demo.ageGroup, demo.marital, demo.education, demo.country, demo.employment, demo.medication,
        it?.item_number ?? '', it?.subscale ?? '', it?.question_en ?? '',
        r.response_value, r.response_label_en ?? '',
      ])
    }
    // Deterministic order: submitted_at, then submission_id, then item number.
    rows.sort((a, b) => String(a[2]).localeCompare(String(b[2])) || String(a[0]).localeCompare(String(b[0])) || Number(a[14]) - Number(b[14]))

    // Audit this PHI-level export (who exported which assessment's answers, and volume).
    await writeAdminAudit({
      actorId: user.id,
      action: 'data_export',
      targetType: 'assessment_answers',
      targetId: definitionId,
      details: { format: 'csv', assessment_code: code, row_count: rows.length, filters },
    }, db)

    const dateStr = new Date().toISOString().slice(0, 10)
    const csv = rowsToCsv(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': getMimeTypeForFormat('csv'),
        'Content-Disposition': buildContentDisposition(`${code}-answers-${dateStr}.csv`),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[answers-export] error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
