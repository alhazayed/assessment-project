import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function requireClinician() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['clinician', 'admin', 'superadmin'].includes(profile.role)) return null
  return { user, supabase }
}

export async function GET(request: Request) {
  const ctx = await requireClinician()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, supabase } = ctx

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  // Clinicians may only fetch notes for their own assigned patients
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role === 'clinician') {
    const { data: patientProfile } = await supabase
      .from('profiles').select('assigned_clinician_id').eq('id', patientId).single()
    if (patientProfile?.assigned_clinician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — patient is not assigned to you' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('clinician_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('clinical-notes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
  return NextResponse.json({ notes: data })
}

export async function POST(request: Request) {
  const ctx = await requireClinician()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, supabase } = ctx

  const { patient_id, body, is_ai_draft } = await request.json()
  if (!patient_id || !body) return NextResponse.json({ error: 'patient_id and body required' }, { status: 400 })
  if (typeof body !== 'string' || body.length > 10000) {
    return NextResponse.json({ error: 'body must be a string under 10000 characters' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({ patient_id, clinician_id: user.id, body, is_ai_draft: !!is_ai_draft })
    .select()
    .single()

  if (error) {
    console.error('clinical-notes POST error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
  return NextResponse.json({ note: data })
}

export async function DELETE(request: Request) {
  const ctx = await requireClinician()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, supabase } = ctx

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('clinical_notes')
    .delete()
    .eq('id', id)
    .eq('clinician_id', user.id)

  if (error) {
    console.error('clinical-notes DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PUT(request: Request) {
  const ctx = await requireClinician()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, supabase } = ctx

  const { patient_id } = await request.json()
  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  // Verify caller's role — admins/superadmins may access any patient; clinicians only their own
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const callerRole = callerProfile?.role ?? ''
  if (callerRole === 'clinician') {
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('assigned_clinician_id')
      .eq('id', patient_id)
      .single()
    if (patientProfile?.assigned_clinician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — patient is not assigned to you' }, { status: 403 })
    }
  }

  // Burst: 5/min; Hourly: 20/hr — AI draft is ~1K tokens/call
  const [burstRl, hourlyRl] = await Promise.all([
    checkRateLimit(`ai-clinical-notes:burst:${user.id}`, { limit: 5, windowMs: 60 * 1000 }),
    checkRateLimit(`ai-clinical-notes:hourly:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 }),
  ])
  if (!burstRl.allowed || !hourlyRl.allowed) {
    const retryAfter = !hourlyRl.allowed ? '3600' : '60'
    return NextResponse.json(
      { error: !hourlyRl.allowed ? 'Hourly AI limit reached. Try again later.' : 'Too many requests. Please wait.' },
      { status: 429, headers: { 'Retry-After': retryAfter } }
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }

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
    `- ${m.log_date}: mood ${m.mood_score}/10, anxiety ${m.anxiety_score}/10, sleep ${m.sleep_hours}h`
  ).join('\n')

  // Use systemInstruction to separate system context from data — prevents prompt injection
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: 'You are a clinical assistant helping a mental health clinician write a brief session note. Based on provided patient data, draft a concise clinical note (3-5 sentences) in professional clinical language. Focus on observable patterns, do not diagnose. Start directly with the clinical content, no preamble.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [{
          text: `Recent assessment results:\n${submissions || 'No recent assessments.'}\n\nRecent mood logs:\n${moods || 'No recent mood data.'}`,
        }],
      }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    }),
  })

  if (!res.ok) {
    console.error('Gemini clinical-notes error:', res.status)
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const data = await res.json()
  const draft = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!draft) return NextResponse.json({ error: 'AI returned empty response' }, { status: 502 })
  return NextResponse.json({ draft })
}
