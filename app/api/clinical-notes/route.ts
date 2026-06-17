import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

