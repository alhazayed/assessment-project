import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/assessment-history?definition_id=<uuid>
 *
 * Returns the authenticated patient's own attempts of one assessment, each with
 * its per-item answers, so the UI can compare progress across attempts (score
 * trend + which questions were answered differently). RLS scopes both the
 * submissions and their responses to the caller (see responses_patient_select /
 * the submissions self policies) — a patient can only ever read their own.
 *
 * Attempts are returned newest-first. `items` carries the question text so the
 * client can render a labelled diff.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const definitionId = searchParams.get('definition_id')
    if (!definitionId) {
      return NextResponse.json({ error: 'definition_id is required' }, { status: 400 })
    }

    // Own attempts of this assessment (RLS: patient_id = auth.uid()).
    const { data: subs, error: subErr } = await supabase
      .from('assessment_submissions')
      .select('id, total_score, severity_band, high_risk_flag, submitted_at')
      .eq('patient_id', user.id)
      .eq('definition_id', definitionId)
      .order('submitted_at', { ascending: false })
      .limit(50)

    if (subErr) return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })

    const submissions = subs ?? []
    if (submissions.length === 0) {
      return NextResponse.json({ attempts: [], items: [] })
    }

    const submissionIds = submissions.map(s => s.id)

    const [respRes, itemsRes] = await Promise.all([
      supabase
        .from('assessment_responses')
        .select('submission_id, item_id, response_value, response_label_en, response_label_ar')
        .in('submission_id', submissionIds),
      supabase
        .from('assessment_items')
        .select('id, item_number, question_en, question_ar')
        .eq('definition_id', definitionId)
        .order('item_number', { ascending: true }),
    ])

    const responses = respRes.data ?? []
    const items = itemsRes.data ?? []

    // Group answers by submission, keyed by item_id.
    const answersBySubmission: Record<string, Record<string, { value: number; label_en: string; label_ar: string }>> = {}
    for (const r of responses) {
      if (!answersBySubmission[r.submission_id]) answersBySubmission[r.submission_id] = {}
      answersBySubmission[r.submission_id][r.item_id] = {
        value: r.response_value,
        label_en: r.response_label_en,
        label_ar: r.response_label_ar,
      }
    }

    const attempts = submissions.map(s => ({
      id: s.id,
      submitted_at: s.submitted_at,
      total_score: s.total_score,
      severity_band: s.severity_band,
      high_risk_flag: s.high_risk_flag,
      answers: answersBySubmission[s.id] ?? {},
    }))

    return NextResponse.json({ attempts, items })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
