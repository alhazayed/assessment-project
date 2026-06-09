import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('clinician_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { patient_id, body, is_ai_draft } = await request.json()
  if (!patient_id || !body) return NextResponse.json({ error: 'patient_id and body required' }, { status: 400 })

  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({ patient_id, clinician_id: user.id, body, is_ai_draft: !!is_ai_draft })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('clinical_notes')
    .delete()
    .eq('id', id)
    .eq('clinician_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PUT(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { patient_id } = await request.json()
  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })

  // Gather context: recent submissions + mood logs for this patient
  const [subsRes, moodRes] = await Promise.all([
    supabase.from('assessment_submissions')
      .select('submitted_at, total_score, severity_band, high_risk_flag, assessment_definitions(name_en)')
      .eq('patient_id', patient_id)
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase.from('mood_logs')
      .select('logged_at, mood_score, anxiety_score, sleep_hours, notes')
      .eq('patient_id', patient_id)
      .order('logged_at', { ascending: false })
      .limit(7),
  ])

  const submissions = (subsRes.data || []).map((s: any) =>
    `- ${s.assessment_definitions?.name_en ?? 'Assessment'} on ${new Date(s.submitted_at).toLocaleDateString()}: score ${s.total_score} (${s.severity_band})${s.high_risk_flag ? ' ⚠ HIGH RISK' : ''}`
  ).join('\n')

  const moods = (moodRes.data || []).map((m: any) =>
    `- ${new Date(m.logged_at).toLocaleDateString()}: mood ${m.mood_score}/10, anxiety ${m.anxiety_score}/10, sleep ${m.sleep_hours}h${m.notes ? `, note: "${m.notes}"` : ''}`
  ).join('\n')

  const anthropic = new Anthropic({ apiKey })
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    messages: [{
      role: 'user',
      content: `You are a clinical assistant helping a mental health clinician write a brief session note. Based on the following patient data, draft a concise clinical note (3-5 sentences) in professional clinical language. Focus on observable patterns, do not diagnose.

Recent assessment results:
${submissions || 'No recent assessments.'}

Recent mood logs:
${moods || 'No recent mood data.'}

Write the note now. Start directly with the clinical content, no preamble.`,
    }],
  })

  const draft = msg.content.filter(b => b.type === 'text').map((b: any) => b.text).join('')
  return NextResponse.json({ draft })
}
