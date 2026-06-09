import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patient_id')

  let query = supabase
    .from('assessment_assignments')
    .select('*, assessment_definitions(id, code, name_en, name_ar)')
    .order('assigned_at', { ascending: false })

  if (patientId) query = query.eq('patient_id', patientId)
  else query = query.eq('clinician_id', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignments: data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { patient_id, definition_id, due_date, note_en, note_ar } = await request.json()
  if (!patient_id || !definition_id) {
    return NextResponse.json({ error: 'patient_id and definition_id are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('assessment_assignments')
    .insert({
      patient_id,
      clinician_id: user.id,
      definition_id,
      due_date: due_date || null,
      note_to_patient_en: note_en || null,
      note_to_patient_ar: note_ar || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignment: data })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })

  const { data, error } = await supabase
    .from('assessment_assignments')
    .update({ status })
    .eq('id', id)
    .eq('clinician_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignment: data })
}
