import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { fetchAll } from '@/lib/admin/fetch-all'
import { buildContentDisposition, getMimeTypeForFormat } from '@/lib/security/file-export'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // This returns the caller's full PHI export — cap it to prevent scraping/abuse.
  const rl = await checkRateLimit(`export-data:${user.id}`, { limit: 5, windowMs: 24 * 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Export limit reached. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '86400' } }
    )
  }

  // Every list is paged past PostgREST's 1,000-row cap. A table that can't be
  // read is named in `incomplete_sections` rather than silently left empty,
  // so the user (and support) can see the export is partial.
  const incomplete: string[] = []
  const rows = async (
    name: string,
    build: Parameters<typeof fetchAll<unknown>>[0],
  ): Promise<unknown[]> => {
    try {
      return await fetchAll(build)
    } catch (err) {
      console.error(`[user/export-data] ${name} failed:`, err instanceof Error ? err.message : 'unknown')
      incomplete.push(name)
      return []
    }
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const [assessments, mood, journal] = await Promise.all([
    rows('assessments', () => supabase.from('assessment_submissions').select('id, definition_id, total_score, severity_band, submitted_at').eq('patient_id', user.id).order('submitted_at').order('id')),
    rows('mood_logs', () => supabase.from('mood_logs').select('mood_score, energy_score, anxiety_score, mood_note, log_date, created_at').eq('patient_id', user.id).order('created_at')),
    rows('journal_entries', () => supabase.from('journal_entries').select('body, is_shared, created_at').eq('patient_id', user.id).order('created_at')),
  ])

  // Remaining personal data (GDPR Art. 15/20). The service-role client is used
  // because some of these tables have no self-read policy, so EVERY query below
  // is filtered explicitly by the authenticated user's id (never by input).
  const db = createAdminClient()
  const uid = user.id

  const submissionIds = (assessments as Array<{ id: string }>).map(a => a.id)
  const responsesFor = async (): Promise<unknown[]> => {
    const out: unknown[] = []
    for (let i = 0; i < submissionIds.length; i += 200) {
      const ids = submissionIds.slice(i, i + 200)
      out.push(...await rows('assessment_responses', () =>
        db.from('assessment_responses')
          .select('submission_id, item_id, response_value, response_label_en, response_label_ar')
          .in('submission_id', ids)
          .order('submission_id')
          .order('item_id')
      ))
    }
    return out
  }

  const [
    assessmentResponses, assessmentDrafts, patientProfile, messages, aiChatSessions, aiInsights,
    relationships, packageResults, packageSessions, packagePurchases, purchasedPackageResults,
    personalityResults, adhdZoneCheckins, gratitude, consents, medications, wellnessPlans,
  ] = await Promise.all([
    responsesFor(),
    rows('assessment_drafts', () => db.from('assessment_drafts').select('definition_id, answers, current_index, updated_at').eq('patient_id', uid)),
    rows('patient_profiles', () => db.from('patient_profiles').select('*').eq('id', uid)),
    rows('messages', () => db.from('messages').select('id, patient_id, clinician_id, sender_id, body, attachments, is_urgent, read_at, created_at').or(`patient_id.eq.${uid},clinician_id.eq.${uid}`).order('created_at').order('id')),
    rows('chat_sessions', () => db.from('chat_sessions').select('id, messages, started_at, updated_at').eq('patient_id', uid)),
    rows('ai_insights', () => db.from('ai_insights').select('*').eq('patient_id', uid)),
    rows('clinician_patient_relationships', () => db.from('clinician_patient_relationships').select('*').or(`patient_id.eq.${uid},clinician_id.eq.${uid}`)),
    rows('package_results', () => db.from('package_results').select('*').eq('user_id', uid)),
    rows('package_sessions', () => db.from('package_sessions').select('*').eq('user_id', uid)),
    rows('package_purchases', () => db.from('package_purchases').select('*').eq('user_id', uid)),
    rows('purchased_package_results', () => db.from('purchased_package_results').select('*').eq('user_id', uid)),
    rows('personality_results', () => db.from('personality_results').select('*').eq('patient_id', uid)),
    rows('adhd_zone_checkins', () => db.from('adhd_zone_checkins').select('zone, answers, created_at').eq('user_id', uid)),
    rows('gratitude_entries', () => db.from('gratitude_entries').select('body, category, word_count, created_at, updated_at').eq('patient_id', uid)),
    rows('user_consents', () => db.from('user_consents').select('document_id, action, actioned_at, method, notes').eq('user_id', uid)),
    rows('medications', () => db.from('medications').select('*').eq('patient_id', uid)),
    rows('wellness_plans', () => db.from('wellness_plans').select('plan_json, generated_at').eq('patient_id', uid)),
  ])

  // Permissions belong to relationships the user is party to (ids come from the
  // user-filtered query above, not from the request).
  const relationshipIds = (relationships as Array<{ id: string }>).map(r => r.id)
  const relationshipPermissions = relationshipIds.length
    ? await rows('relationship_permissions', () => db.from('relationship_permissions').select('relationship_id, permission_key, granted, granted_at, revoked_at').in('relationship_id', relationshipIds))
    : []

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    patient_profile: patientProfile[0] ?? null,
    incomplete_sections: Array.from(new Set(incomplete)),
    assessments,
    assessment_responses: assessmentResponses,
    assessment_drafts: assessmentDrafts,
    mood_logs: mood,
    journal_entries: journal,
    gratitude_entries: gratitude,
    messages,
    ai_chat_sessions: aiChatSessions,
    ai_insights: aiInsights,
    clinician_relationships: relationships,
    clinician_relationship_permissions: relationshipPermissions,
    package_results: packageResults,
    package_sessions: packageSessions,
    package_purchases: packagePurchases,
    purchased_package_results: purchasedPackageResults,
    personality_results: personalityResults,
    adhd_zone_checkins: adhdZoneCheckins,
    medications,
    wellness_plans: wellnessPlans,
    consents,
  }

  const rowCount = Object.values(exportData).reduce<number>((n, v) => n + (Array.isArray(v) ? v.length : 0), 0)

  // Audit log — record the GDPR self-export event
  try {
    await db.from('audit_log').insert({
      actor_id: user.id,
      action: 'data_export',
      target_type: 'user_data',
      target_id: user.id,
      details: {
        format: 'json',
        row_count: rowCount,
        incomplete_sections: Array.from(new Set(incomplete)),
      },
    })
  } catch (auditErr) {
    console.error('[user/export-data] audit log failed (non-fatal):', auditErr instanceof Error ? auditErr.message : 'unknown')
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': getMimeTypeForFormat('json'),
      'Content-Disposition': buildContentDisposition('my-vwelfare-data.json'),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}
