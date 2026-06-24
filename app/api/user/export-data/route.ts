import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: profile }, { data: assessments }, { data: mood }, { data: journal }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('assessment_submissions').select('id, definition_id, total_score, severity_band, submitted_at').eq('patient_id', user.id),
    supabase.from('mood_logs').select('mood_score, energy_score, anxiety_score, mood_note, log_date, created_at').eq('patient_id', user.id),
    supabase.from('journal_entries').select('body, is_shared, created_at').eq('patient_id', user.id),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    assessments: assessments || [],
    mood_logs: mood || [],
    journal_entries: journal || [],
  }

  // Audit log — record the GDPR self-export event
  try {
    const db = createAdminClient()
    await db.from('audit_log').insert({
      actor_id: user.id,
      action: 'data_export',
      target_type: 'user_data',
      target_id: user.id,
      details: {
        format: 'json',
        row_count: (assessments?.length ?? 0) + (mood?.length ?? 0) + (journal?.length ?? 0),
      },
    })
  } catch (auditErr) {
    console.error('[user/export-data] audit log failed (non-fatal):', auditErr instanceof Error ? auditErr.message : 'unknown')
  }


  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-vwelfare-data.json"',
    },
  })
}
