import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/assessments/[id]/item-analytics?gender=&ageGroup=
 *
 * Answer-level statistics for one assessment: per question, the distribution of
 * chosen options, the mean response value, and n — plus optional demographic
 * filters — so admins can see how the population answers each item and spot
 * patterns that a single total score hides. Admin+ only.
 */
function ageGroup(dob: string | null): string {
  if (!dob) return 'Unknown'
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return 'Unknown'
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  if (age < 0) return 'Unknown'
  if (age < 18) return 'Under 18'
  if (age <= 24) return '18–24'
  if (age <= 34) return '25–34'
  if (age <= 44) return '35–44'
  if (age <= 54) return '45–54'
  return '55+'
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') return NextResponse.json({ error: 'Superadmin only' }, { status: 403 })
    const { id: definitionId } = await ctx.params
    const { searchParams } = new URL(request.url)
    const genderFilter = searchParams.get('gender') || ''
    const ageFilter = searchParams.get('ageGroup') || ''

    const db = createAdminClient()

    const [defRes, itemsRes, subsRes] = await Promise.all([
      db.from('assessment_definitions').select('id, code, name_en, name_ar, total_questions').eq('id', definitionId).single(),
      db.from('assessment_items').select('id, item_number, question_en, question_ar, subscale, response_options').eq('definition_id', definitionId).order('item_number', { ascending: true }),
      db.from('assessment_submissions').select('id, patient_id, profiles(gender, date_of_birth)').eq('definition_id', definitionId),
    ])

    if (defRes.error || !defRes.data) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    const items = itemsRes.data ?? []
    // Supabase types a to-one embed as an array; normalise to a single object.
    type ProfileLite = { gender: string | null; date_of_birth: string | null }
    type RawSub = { id: string; patient_id: string; profiles: ProfileLite | ProfileLite[] | null }
    const oneProfile = (p: ProfileLite | ProfileLite[] | null): ProfileLite | null => Array.isArray(p) ? (p[0] ?? null) : p
    const allSubs = ((subsRes.data ?? []) as unknown as RawSub[]).map(s => ({ id: s.id, patient_id: s.patient_id, profiles: oneProfile(s.profiles) }))

    // Apply demographic filters.
    const subs = allSubs.filter(s => {
      const g = s.profiles?.gender ?? 'Unknown'
      const ag = ageGroup(s.profiles?.date_of_birth ?? null)
      if (genderFilter && g !== genderFilter) return false
      if (ageFilter && ag !== ageFilter) return false
      return true
    })
    const submissionIds = subs.map(s => s.id)

    // Pull responses for the filtered submissions (chunked to stay under limits).
    const responses: Array<{ item_id: string; response_value: number }> = []
    const CHUNK = 500
    for (let i = 0; i < submissionIds.length; i += CHUNK) {
      const slice = submissionIds.slice(i, i + CHUNK)
      const { data } = await db
        .from('assessment_responses')
        .select('item_id, response_value')
        .in('submission_id', slice)
      if (data) responses.push(...data)
    }

    // Aggregate per item.
    const byItem = new Map<string, number[]>()
    for (const r of responses) {
      if (!byItem.has(r.item_id)) byItem.set(r.item_id, [])
      byItem.get(r.item_id)!.push(r.response_value)
    }

    const itemStats = items.map(it => {
      const values = byItem.get(it.id) ?? []
      const n = values.length
      const mean = n ? +(values.reduce((s, v) => s + v, 0) / n).toFixed(2) : 0
      const options = (it.response_options as Array<{ value: number; label_en: string; label_ar: string }>) ?? []
      const distribution = options
        .map(o => ({ value: o.value, label_en: o.label_en, label_ar: o.label_ar, count: values.filter(v => v === o.value).length }))
        .sort((a, b) => a.value - b.value)
      return {
        item_id: it.id,
        item_number: it.item_number,
        question_en: it.question_en,
        question_ar: it.question_ar,
        subscale: it.subscale ?? null,
        n,
        mean,
        distribution,
      }
    })

    return NextResponse.json({
      assessment: { id: defRes.data.id, code: defRes.data.code, name_en: defRes.data.name_en, name_ar: defRes.data.name_ar, total_questions: defRes.data.total_questions },
      submissionCount: subs.length,
      totalSubmissions: allSubs.length,
      items: itemStats,
    })
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[item-analytics] error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
