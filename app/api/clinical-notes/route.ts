import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { scrubPHI } from '@/lib/security/anonymizePHI'
import { logError } from '@/lib/safe-log'

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
    logError('clinical-notes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
  return NextResponse.json({ notes: data })
}

export async function POST(request: Request) {
  const ctx = await requireClinician()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, supabase } = ctx

  // Rate limit: 200 notes/hour per clinician
  const rl = await checkRateLimit(`clinical-notes:${ctx.user.id}`, { limit: 200, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { patient_id, body, is_ai_draft } = await request.json()
  if (!patient_id || !body) return NextResponse.json({ error: 'patient_id and body required' }, { status: 400 })
  if (typeof body !== 'string' || body.length > 10000) {
    return NextResponse.json({ error: 'body must be a string under 10000 characters' }, { status: 400 })
  }

  // Clinicians may only write notes for their own assigned patients (same check as GET)
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role === 'clinician') {
    const { data: patientProfile } = await supabase
      .from('profiles').select('assigned_clinician_id').eq('id', patient_id).single()
    if (patientProfile?.assigned_clinician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — patient is not assigned to you' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({ patient_id, clinician_id: user.id, body, is_ai_draft: !!is_ai_draft })
    .select()
    .single()

  if (error) {
    logError('clinical-notes POST error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
  return NextResponse.json({ note: data })
}

export async function PUT(request: Request) {
  const ctx = await requireClinician()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user, supabase } = ctx

  const rl = await checkRateLimit(`ai-draft:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json().catch(() => null)
  const patient_id = body?.patient_id
  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  // Same assignment guard as GET/POST
  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role === 'clinician') {
    const { data: patientProfile } = await supabase
      .from('profiles').select('assigned_clinician_id').eq('id', patient_id).single()
    if (patientProfile?.assigned_clinician_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — patient is not assigned to you' }, { status: 403 })
    }
  }

  // Collect patient context for the AI draft
  const [{ data: submissions }, { data: moods }, { data: notes }] = await Promise.all([
    supabase
      .from('assessment_submissions')
      .select('severity_band, submitted_at, assessment_definitions(name_en)')
      .eq('patient_id', patient_id)
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase
      .from('mood_logs')
      .select('mood_score, log_date')
      .eq('patient_id', patient_id)
      .order('log_date', { ascending: false })
      .limit(7),
    supabase
      .from('clinical_notes')
      .select('body, created_at')
      .eq('patient_id', patient_id)
      .eq('clinician_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const context = [
    submissions?.length ? `Recent assessments: ${submissions.map(s => `${(s as any).assessment_definitions?.name_en} (${s.severity_band})`).join(', ')}` : null,
    moods?.length ? `Mood last ${moods.length} days: avg ${Math.round(moods.reduce((a, m) => a + m.mood_score, 0) / moods.length)}/10` : null,
    notes?.length ? `Prior note excerpt: "${scrubPHI(notes[0].body.slice(0, 200))}"` : null,
  ].filter(Boolean).join('. ')

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })

    const { callGemini } = await import('@/lib/gemini')
    const prompt = scrubPHI(`You are a mental health clinician. Based on the following patient data, write a brief clinical progress note template (under 200 words). Write in the first-person clinician voice. Use only the data provided — do not invent clinical observations.\n\nPatient data: ${context || 'No recent data available.'}\n\nNote:`)
    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
    }
    const res = await callGemini(apiKey, geminiBody)
    if (!res.ok) {
      logError('Gemini clinical-notes error:', `HTTP ${res.status}`)
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
    }
    const json = await res.json()
    const draft = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return NextResponse.json({ draft })
  } catch (err) {
    logError('AI draft error:', err)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }
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
    logError('clinical-notes DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

