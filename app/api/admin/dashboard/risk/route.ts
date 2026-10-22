import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllByIds } from '@/lib/admin/fetch-all'
import { writeAdminAudit } from '@/lib/admin/audit'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Clinical Risk Dashboard data.
//
// NOTE: this intentionally queries base tables directly rather than the
// get_high_risk_patients() RPC / admin_high_risk_alerts view, both of which
// reference columns (full_name, email, assessment_name, consecutive_high_risk_count)
// that do not exist in the live schema and therefore error at runtime.
//
// Access: the named, per-patient alert list is PHI and is returned only to
// superadmins. A plain admin receives the aggregate counts only
// (`restricted: true`, `alerts: []`). Every view is written to audit_log; for
// the named list, the response is refused if that audit row cannot be written.

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
    const { user, role } = await requireAdmin()
    const canSeeNames = role === 'superadmin'
    const db = createAdminClient()

    const url = new URL(request.url)
    const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '100', 10) || 100))

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
      await writeAdminAudit({
        actorId: user.id,
        action: 'risk_dashboard_view',
        targetType: 'risk_dashboard',
        details: { names_shown: false, alert_count: 0, patient_count: 0, role },
      }, db)
      return NextResponse.json({
        alerts: [],
        restricted: !canSeeNames,
        summary: { totalAlerts: 0, patientsAtRisk: 0, repeatRiskPatients: 0, topAssessment: null },
        byPriority: { critical: 0, high: 0, moderate: 0 },
      })
    }

    const patientIds = Array.from(new Set(rows.map(r => r.patient_id).filter(Boolean))) as string[]
    const definitionIds = Array.from(new Set(rows.map(r => r.definition_id).filter(Boolean)))

    // 2. Enrich: assessment names, per-patient high-risk totals and (superadmin
    // only) patient names. The per-patient totals are paged so a patient set
    // with more than 1,000 high-risk submissions is not truncated.
    const [defsRes, allHighRisk, profiles] = await Promise.all([
      db.from('assessment_definitions').select('id, code, name_en').in('id', definitionIds),
      fetchAllByIds<{ patient_id: string }>(patientIds, ids => db
        .from('assessment_submissions')
        .select('patient_id')
        .eq('high_risk_flag', true)
        .in('patient_id', ids)
        .order('id', { ascending: true })),
      canSeeNames
        ? fetchAllByIds<{ id: string; full_name_en: string }>(patientIds, ids => db
          .from('profiles')
          .select('id, full_name_en')
          .in('id', ids)
          .order('id', { ascending: true }))
        : Promise.resolve([] as { id: string; full_name_en: string }[]),
    ])
    if (defsRes.error) throw new Error(defsRes.error.message)

    const nameById = new Map(profiles.map(p => [p.id, p.full_name_en]))
    const defById = new Map((defsRes.data ?? []).map(d => [d.id, d]))

    // Per-patient high-risk submission count → drives prioritisation
    const repeatByPatient = new Map<string, number>()
    for (const r of allHighRisk) {
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
    const byPriority: Record<Priority, number> = { critical: 0, high: 0, moderate: 0 }
    for (const a of alerts) byPriority[a.priority]++

    // Audit every view. For the named list (PHI), refuse to return it unaudited.
    const audited = await writeAdminAudit({
      actorId: user.id,
      action: 'risk_dashboard_view',
      targetType: 'risk_dashboard',
      details: {
        names_shown: canSeeNames,
        alert_count: alerts.length,
        patient_count: patientIds.length,
        role,
        ...(canSeeNames ? { patient_ids: patientIds } : {}),
      },
    }, db)
    if (canSeeNames && !audited) {
      return NextResponse.json({ error: 'Could not record access; the named list was not returned.' }, { status: 500 })
    }

    return NextResponse.json({
      // Plain admins get aggregate counts only, never the named list.
      alerts: canSeeNames ? alerts : [],
      restricted: !canSeeNames,
      byPriority,
      summary: {
        totalAlerts: alerts.length,
        patientsAtRisk: patientIds.length,
        repeatRiskPatients,
        topAssessment,
      },
    })
  } catch (err) {
    if (!isAuthRedirectError(err)) console.error('Risk API error:', err)
    return adminRouteError(err)
  }
}
