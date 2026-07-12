import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEMOGRAPHIC_DIMENSIONS, DEMOGRAPHIC_SELECT, enrichDemographics,
  type DemographicDimension, type Demographics, type RawDemographicSub,
} from '@/lib/assessment-demographics'

/**
 * GET /api/admin/assessments/[id]/item-analytics
 *   ?gender=&ageGroup=&marital=&education=&country=&employment=&medication=  (filters)
 *   &groupBy=<dimension>                                                     (optional breakdown)
 *
 * Answer-level statistics for one assessment: per question, the option
 * distribution, mean and n — filterable by ANY demographic variant, and
 * optionally broken down by a variant (per-group mean/n) so admins can compare
 * how different populations answer each item. Superadmin only.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') return NextResponse.json({ error: 'Superadmin only' }, { status: 403 })

    const { id: definitionId } = await ctx.params
    const { searchParams } = new URL(request.url)

    const filters: Partial<Record<DemographicDimension, string>> = {}
    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      const v = searchParams.get(dim)
      if (v) filters[dim] = v
    }
    const groupByParam = searchParams.get('groupBy')
    const groupBy = (DEMOGRAPHIC_DIMENSIONS as readonly string[]).includes(groupByParam ?? '')
      ? (groupByParam as DemographicDimension)
      : null

    const db = createAdminClient()

    const [defRes, itemsRes, subsRes] = await Promise.all([
      db.from('assessment_definitions').select('id, code, name_en, name_ar, total_questions').eq('id', definitionId).single(),
      db.from('assessment_items').select('id, item_number, question_en, question_ar, subscale, response_options').eq('definition_id', definitionId).order('item_number', { ascending: true }),
      db.from('assessment_submissions').select(`id, ${DEMOGRAPHIC_SELECT}`).eq('definition_id', definitionId).limit(20000),
    ])

    if (defRes.error || !defRes.data) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    const items = itemsRes.data ?? []

    // Enrich every submission with all demographic variants.
    const enriched = ((subsRes.data ?? []) as unknown as Array<{ id: string } & RawDemographicSub>)
      .map(s => ({ id: s.id, demo: enrichDemographics(s) }))

    // Distinct values per dimension across the full dataset → dropdown options.
    const filterOptions: Record<DemographicDimension, string[]> = {
      gender: [], ageGroup: [], marital: [], education: [], country: [], employment: [], medication: [],
    }
    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      filterOptions[dim] = Array.from(new Set(enriched.map(e => e.demo[dim]))).sort()
    }

    // Apply filters.
    const filtered = enriched.filter(e =>
      DEMOGRAPHIC_DIMENSIONS.every(dim => !filters[dim] || e.demo[dim] === filters[dim]))
    const demoBySub = new Map<string, Demographics>(filtered.map(e => [e.id, e.demo]))
    const submissionIds = filtered.map(e => e.id)

    // Responses for the filtered submissions (chunked).
    const responses: Array<{ submission_id: string; item_id: string; response_value: number }> = []
    const CHUNK = 500
    for (let i = 0; i < submissionIds.length; i += CHUNK) {
      const { data } = await db
        .from('assessment_responses')
        .select('submission_id, item_id, response_value')
        .in('submission_id', submissionIds.slice(i, i + CHUNK))
      if (data) responses.push(...data)
    }

    const byItem = new Map<string, number[]>()
    // item_id -> group value -> values
    const byItemGroup = new Map<string, Map<string, number[]>>()
    for (const r of responses) {
      if (!byItem.has(r.item_id)) byItem.set(r.item_id, [])
      byItem.get(r.item_id)!.push(r.response_value)
      if (groupBy) {
        const g = demoBySub.get(r.submission_id)?.[groupBy] ?? 'Unknown'
        if (!byItemGroup.has(r.item_id)) byItemGroup.set(r.item_id, new Map())
        const gm = byItemGroup.get(r.item_id)!
        if (!gm.has(g)) gm.set(g, [])
        gm.get(g)!.push(r.response_value)
      }
    }

    const mean = (vals: number[]) => vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : 0

    const itemStats = items.map(it => {
      const values = byItem.get(it.id) ?? []
      const options = (it.response_options as Array<{ value: number; label_en: string; label_ar: string }>) ?? []
      const distribution = options
        .map(o => ({ value: o.value, label_en: o.label_en, label_ar: o.label_ar, count: values.filter(v => v === o.value).length }))
        .sort((a, b) => a.value - b.value)
      const breakdown = groupBy
        ? Array.from(byItemGroup.get(it.id)?.entries() ?? [])
            .map(([group, vals]) => ({ group, n: vals.length, mean: mean(vals) }))
            .sort((a, b) => b.n - a.n)
        : null
      return {
        item_id: it.id,
        item_number: it.item_number,
        question_en: it.question_en,
        question_ar: it.question_ar,
        subscale: it.subscale ?? null,
        n: values.length,
        mean: mean(values),
        distribution,
        breakdown,
      }
    })

    return NextResponse.json({
      assessment: { id: defRes.data.id, code: defRes.data.code, name_en: defRes.data.name_en, name_ar: defRes.data.name_ar, total_questions: defRes.data.total_questions },
      submissionCount: filtered.length,
      totalSubmissions: enriched.length,
      filterOptions,
      groupBy,
      items: itemStats,
    })
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[item-analytics] error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
