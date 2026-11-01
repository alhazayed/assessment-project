import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateRichNarrative } from '@/lib/package-interpret'
import type { ScoringBand, InterpretationBand } from '@/lib/types'
import { PROFILE_DEFS, buildProfileReport, toResultColumns } from '@/lib/package-profiles'
import { loadScaleInputs } from '@/lib/package-profiles/load'

interface PkgAssessment {
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  is_available: boolean
}

function findBand(bands: InterpretationBand[], score: number): InterpretationBand | null {
  return bands.find(b => score >= b.min && score <= b.max) ?? bands[bands.length - 1] ?? null
}

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 30 package computations per hour per user
    const rl = await checkRateLimit(`package-compute:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many package computations. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const db = createAdminClient()

    const { data: pkg } = await db
      .from('packages')
      .select('*, package_assessments(assessment_code, name_en, name_ar, weight_pct, is_available)')
      .eq('id', params.id)
      .single()

    // Only active packages can produce results (draft/archived are treated as missing).
    if (!pkg || pkg.status !== 'active') {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const available = (pkg.package_assessments as PkgAssessment[]).filter(a => a.is_available)
    if (available.length === 0) {
      return NextResponse.json({ error: 'No available assessments in this package' }, { status: 400 })
    }

    // Profile packages: each scale is read on its own published bands and the
    // report is built from evidence-based pattern rules (lib/package-profiles).
    if (pkg.scoring_method === 'profile_rules') {
      const baseDef = pkg.profile_key ? PROFILE_DEFS[pkg.profile_key as string] : undefined
      if (!baseDef) {
        return NextResponse.json({ error: 'Package configuration invalid' }, { status: 500 })
      }
      const availableCodes = new Set(available.map(a => a.assessment_code))
      const def = { ...baseDef, codes: baseDef.codes.filter(c => availableCodes.has(c)) }
      const inputs = await loadScaleInputs(db, user.id, def)
      const done = new Set(inputs.map(i => i.code))
      const notDone = def.codes.filter(c => !done.has(c))
      if (notDone.length > 0) {
        return NextResponse.json({ error: 'Complete every assessment in this package first', missing: notDone }, { status: 400 })
      }

      const report = buildProfileReport(def, inputs)
      const now = new Date().toISOString()
      const { data: result, error: resultErr } = await db
        .from('package_results')
        .upsert({
          package_id: params.id,
          user_id: user.id,
          composite_score: report.composite?.score ?? null,
          band_en: report.headline.en,
          band_ar: report.headline.ar,
          individual_scores: Object.fromEntries(report.scales.map(s => [s.code, s.total])),
          dimension_scores: report,
          ...toResultColumns(report),
          status: 'completed',
          completed_at: now,
        }, { onConflict: 'package_id,user_id' })
        .select('id')
        .single()

      if (resultErr || !result) {
        console.error('compute: save profile result failed:', resultErr?.message ?? 'unknown')
        return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
      }

      await db
        .from('package_sessions')
        .upsert({
          package_id: params.id,
          user_id: user.id,
          status: 'completed',
          completed_at: now,
          result_id: result.id,
        }, { onConflict: 'package_id,user_id' })

      return NextResponse.json({ result_id: result.id, composite_score: report.composite?.score ?? null })
    }

    const codes = available.map(a => a.assessment_code)
    const { data: definitions } = await db
      .from('assessment_definitions')
      .select('id, code, scoring_logic')
      .in('code', codes)

    if (!definitions || definitions.length === 0) {
      return NextResponse.json({ error: 'Assessment definitions not found' }, { status: 404 })
    }

    const defMap = new Map(definitions.map(d => [d.code, d]))
    const defIds = definitions.map(d => d.id)

    const { data: submissions } = await db
      .from('assessment_submissions')
      .select('definition_id, total_score, submitted_at')
      .eq('patient_id', user.id)
      .in('definition_id', defIds)
      .order('submitted_at', { ascending: false })

    // Latest submission per definition
    const latestByDef = new Map<string, number>()
    for (const s of (submissions ?? [])) {
      if (!latestByDef.has(s.definition_id)) {
        latestByDef.set(s.definition_id, s.total_score)
      }
    }

    // Compute normalized scores and weighted composite
    const individualScores: Record<string, number> = {}
    let weightedSum = 0
    let totalWeight = 0

    for (const a of available) {
      const def = defMap.get(a.assessment_code)
      if (!def) continue
      const rawScore = latestByDef.get(def.id)
      if (rawScore === undefined) continue

      const bands = def.scoring_logic as ScoringBand[]
      const maxScore = Math.max(...bands.map(b => b.max))
      const normalized = maxScore > 0 ? Math.min(100, Math.round((rawScore / maxScore) * 100)) : 0

      individualScores[a.assessment_code] = normalized
      weightedSum += normalized * a.weight_pct
      totalWeight += a.weight_pct
    }

    if (totalWeight === 0) {
      return NextResponse.json({ error: 'No completed assessments found for this package' }, { status: 400 })
    }

    const compositeScore = Math.round(weightedSum / totalWeight)
    const pkgBands = pkg.interpretation_bands as InterpretationBand[]
    if (!Array.isArray(pkgBands) || pkgBands.length === 0) {
      return NextResponse.json({ error: 'Package configuration invalid' }, { status: 500 })
    }
    const band = findBand(pkgBands, compositeScore)

    // Rich narrative generation
    const assessmentScores = available
      .filter(a => individualScores[a.assessment_code] !== undefined)
      .map(a => ({
        assessment_code: a.assessment_code,
        name_en: a.name_en,
        name_ar: a.name_ar,
        weight_pct: a.weight_pct,
        normalized: individualScores[a.assessment_code],
      }))

    const narrative = generateRichNarrative(
      pkg.category as string,
      assessmentScores,
      compositeScore,
      band,
    )

    const strengthsEn = narrative.strengths_en
    const strengthsAr = narrative.strengths_ar
    const risksEn = narrative.risks_en
    const risksAr = narrative.risks_ar
    const recommendationsEn = narrative.recommendations_en
    const recommendationsAr = narrative.recommendations_ar

    // Upsert result
    const { data: result, error: resultErr } = await db
      .from('package_results')
      .upsert({
        package_id: params.id,
        user_id: user.id,
        composite_score: compositeScore,
        band_en: band?.band_en ?? null,
        band_ar: band?.band_ar ?? null,
        individual_scores: individualScores,
        dimension_scores: individualScores,
        strengths_en: strengthsEn,
        strengths_ar: strengthsAr,
        risk_indicators_en: risksEn,
        risk_indicators_ar: risksAr,
        recommendations_en: recommendationsEn,
        recommendations_ar: recommendationsAr,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }, { onConflict: 'package_id,user_id' })
      .select('id')
      .single()

    if (resultErr || !result) {
      console.error('compute: save result failed:', resultErr?.message ?? 'unknown')
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
    }

    // Upsert session
    await db
      .from('package_sessions')
      .upsert({
        package_id: params.id,
        user_id: user.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_id: result.id,
      }, { onConflict: 'package_id,user_id' })

    return NextResponse.json({ result_id: result.id, composite_score: compositeScore })
  } catch (err) {
    console.error('compute error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
