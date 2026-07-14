import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/users/[id]/assessments
 *
 * Superadmin-only deep view of ONE user's assessment history: every submission
 * with its score/severity, the per-item answers, and the metadata needed for
 * the client to render the interpretation ("report"). Reads via the service-role
 * client (RLS is bypassed by design for this superadmin surface); access is
 * audit-logged because this exposes another person's mental-health PHI.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user: caller, role } = await requireAdmin()
    if (role !== 'superadmin') return NextResponse.json({ error: 'Superadmin only' }, { status: 403 })

    const { id: userId } = await ctx.params
    const db = createAdminClient()

    const { data: profile, error: profErr } = await db
      .from('profiles')
      .select('id, full_name_en, full_name_ar, role, is_active, created_at, gender, date_of_birth, marital_status, educational_status, country_of_residence')
      .eq('id', userId)
      .single()

    if (profErr || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: subs } = await db
      .from('assessment_submissions')
      .select('id, definition_id, total_score, severity_band, high_risk_flag, is_self_initiated, submitted_at, assessment_definitions(code, name_en, name_ar)')
      .eq('patient_id', userId)
      .order('submitted_at', { ascending: false })

    const submissions = subs ?? []
    const submissionIds = submissions.map(s => s.id)
    const definitionIds = Array.from(new Set(submissions.map(s => s.definition_id)))

    const [respRes, itemsRes] = await Promise.all([
      submissionIds.length
        ? db.from('assessment_responses')
            .select('submission_id, item_id, response_value, response_label_en, response_label_ar')
            .in('submission_id', submissionIds)
        : Promise.resolve({ data: [] as Array<{ submission_id: string; item_id: string; response_value: number; response_label_en: string; response_label_ar: string }> }),
      definitionIds.length
        ? db.from('assessment_items')
            .select('id, definition_id, item_number, question_en, question_ar')
            .in('definition_id', definitionIds)
        : Promise.resolve({ data: [] as Array<{ id: string; definition_id: string; item_number: number; question_en: string; question_ar: string }> }),
    ])

    const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i]))
    const responsesBySub = new Map<string, Array<{ item_number: number; question_en: string; question_ar: string; response_value: number; response_label_en: string; response_label_ar: string }>>()
    for (const r of respRes.data ?? []) {
      const it = itemMap.get(r.item_id)
      const arr = responsesBySub.get(r.submission_id) ?? []
      arr.push({
        item_number: it?.item_number ?? 0,
        question_en: it?.question_en ?? '',
        question_ar: it?.question_ar ?? '',
        response_value: r.response_value,
        response_label_en: r.response_label_en,
        response_label_ar: r.response_label_ar,
      })
      responsesBySub.set(r.submission_id, arr)
    }

    const result = submissions.map(s => {
      const def = Array.isArray(s.assessment_definitions) ? s.assessment_definitions[0] : s.assessment_definitions
      const answers = (responsesBySub.get(s.id) ?? []).sort((a, b) => a.item_number - b.item_number)
      return {
        id: s.id,
        code: def?.code ?? 'Unknown',
        name_en: def?.name_en ?? 'Unknown',
        name_ar: def?.name_ar ?? null,
        total_score: s.total_score,
        severity_band: s.severity_band,
        high_risk_flag: s.high_risk_flag,
        is_self_initiated: s.is_self_initiated,
        submitted_at: s.submitted_at,
        answers,
      }
    })

    // Medical-privacy: log that a superadmin viewed this user's PHI.
    await db.from('audit_log').insert({
      actor_id: caller.id,
      action: 'admin_view_user_assessments',
      target_type: 'profile',
      target_id: userId,
      reason: `Superadmin viewed ${result.length} assessment submission(s) for user ${profile.full_name_en}`,
    }).then(() => {}, () => {}) // fire-and-forget; never block the read

    return NextResponse.json({ profile, submissions: result })
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[admin user assessments] error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
