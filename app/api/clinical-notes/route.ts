import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

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

  // Only clinicians and admins may generate AI clinical note drafts
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || !['clinician', 'admin', 'superadmin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { patient_id } = await request.json()
  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }

  // Gather context: recent submissions + mood logs for this patient
  const [subsRes, moodRes] = await Promise.all([
    supabase.from('assessment_submissions')
      .select('submitted_at, total_score, severity_band, high_risk_flag, assessment_definitions(name_en)')
      .eq('patient_id', patient_id)
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase.from('mood_logs')
      .select('log_date, mood_score, anxiety_score, sleep_hours, mood_note')
      .eq('patient_id', patient_id)
      .order('log_date', { ascending: false })
      .limit(7),
  ])

  const submissions = (subsRes.data || []).map((s: any) =>
    `- ${s.assessment_definitions?.name_en ?? 'Assessment'} on ${new Date(s.submitted_at).toLocaleDateString()}: score ${s.total_score} (${s.severity_band})${s.high_risk_flag ? ' ⚠ HIGH RISK' : ''}`
  ).join('\n')

  const moods = (moodRes.data || []).map((m: any) =>
    `- ${m.log_date}: mood ${m.mood_score}/10, anxiety ${m.anxiety_score}/10, sleep ${m.sleep_hours}h${m.mood_note ? `, note: "${m.mood_note}"` : ''}`
  ).join('\n')

  const prompt = `You are a clinical assistant helping a mental health clinician write a brief session note. Based on the following patient data, draft a concise clinical note (3-5 sentences) in professional clinical language. Focus on observable patterns, do not diagnose.

Recent assessment results:
${submissions || 'No recent assessments.'}

Recent mood logs:
${moods || 'No recent mood data.'}

Write the note now. Start directly with the clinical content, no preamble.`

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const data = await res.json()
  const draft = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return NextResponse.json({ draft })
}
