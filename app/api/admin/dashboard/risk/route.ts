import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Clinical Risk Dashboard data.
//
// NOTE: this intentionally queries base tables directly rather than the
// get_high_risk_patients() RPC / admin_high_risk_alerts view, both of which
// reference columns (full_name, email, assessment_name, consecutive_high_risk_count)
// that do not exist in the live schema and therefore error at runtime.

type Priority = 'critical' | 'high' | 'moderate'

function stratify(repeatCount: number): { priority: Priority; action: string } {
  if (repeatCount >= 3) {
    return { priority: 'critical', action: 'Immediate clinical outreach — schedule urgent review' }
  }
  if (repeatCount === 2) {
    return { priority: 'high', action: 'Schedule follow-up within 48 hours' }
  }
  return { priority: 'moderate', action: 'Monitor; review at next scheduled session' }
}

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const db = createAdminClient()

    const url = new URL(request.url)
    const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '100', 10)))

    // 1. High-risk submissions (most recent first)
    const { data: subs, error: subsErr } = await db
      .from('assessment_submissions')
      .select('id, patient_id, definition_id, total_score, severity_band, submitted_at')
      .eq('high_risk_flag', true)
      .order('submitted_at', { ascending: false })
      .limit(limit)

    if (subsErr) {
      console.error('Risk: submissions query failed:', subsErr.message)
      return NextResponse.json({ error: 'Failed to fetch risk data' }, { status: 500 })
    }

    const rows = subs ?? []
    if (rows.length === 0) {
      return NextResponse.json({
        alerts: [],
        summary: { totalAlerts: 0, patientsAtRisk: 0, repeatRiskPatients: 0, topAssessment: null },
      })
    }

    const patientIds = Array.from(new Set(rows.map(r => r.patient_id).filter(Boolean)))
    const definitionIds = Array.from(new Set(rows.map(r => r.definition_id).filter(Boolean)))

    // 2. Enrich: patient names, assessment names, and per-patient high-risk totals
    const [{ data: profiles }, { data: defs }, { data: allHighRisk }] = await Promise.all([
      db.from('profiles').select('id, full_name_en').in('id', patientIds),
      db.from('assessment_definitions').select('id, code, name_en').in('id', definitionIds),
      db.from('assessment_submissions').select('patient_id').eq('high_risk_flag', true).in('patient_id', patientIds),
    ])

    const nameById = new Map((profiles ?? []).map(p => [p.id, p.full_name_en]))
    const defById = new Map((defs ?? []).map(d => [d.id, d]))

    // Per-patient high-risk submission count → drives prioritisation
    const repeatByPatient = new Map<string, number>()
    for (const r of allHighRisk ?? []) {
      repeatByPatient.set(r.patient_id, (repeatByPatient.get(r.patient_id) ?? 0) + 1)
    }

    const priorityRank: Record<Priority, number> = { critical: 0, high: 1, moderate: 2 }

    const alerts = rows.map(r => {
      const repeatCount = repeatByPatient.get(r.patient_id) ?? 1
      const { priority, action } = stratify(repeatCount)
      const def = defById.get(r.definition_id)
      return {
        submissionId: r.id,
        patientId: r.patient_id,
        patientName: nameById.get(r.patient_id) ?? 'Unknown',
        assessmentCode: def?.code ?? '—',
        assessmentName: def?.name_en ?? def?.code ?? '—',
        score: r.total_score,
        severityBand: r.severity_band,
        submittedAt: r.submitted_at,
        repeatCount,
        priority,
        recommendedAction: action,
      }
    })

    // Sort by priority, then most recent
    alerts.sort((a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )

    // 3. Summary
    const assessmentCounts = new Map<string, number>()
    for (const a of alerts) assessmentCounts.set(a.assessmentCode, (assessmentCounts.get(a.assessmentCode) ?? 0) + 1)
    const topAssessment = Array.from(assessmentCounts.entries()).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null
    const repeatRiskPatients = Array.from(repeatByPatient.values()).filter(c => c >= 2).length

    return NextResponse.json({
      alerts,
      summary: {
        totalAlerts: alerts.length,
        patientsAtRisk: patientIds.length,
        repeatRiskPatients,
        topAssessment,
      },
    })
  } catch (err: any) {
    if (err?.digest?.toString().startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Risk API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
