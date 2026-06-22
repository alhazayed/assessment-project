import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: profile }, { data: assessments }, { data: mood }, { data: journal }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('assessment_submissions').select('id, assessment_code, score, severity, submitted_at').eq('user_id', user.id),
    supabase.from('mood_entries').select('mood, note, created_at').eq('user_id', user.id),
    supabase.from('journal_entries').select('title, content, created_at').eq('user_id', user.id),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    assessments: assessments || [],
    mood_entries: mood || [],
    journal_entries: journal || [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-vwelfare-data.json"',
    },
  })
}
