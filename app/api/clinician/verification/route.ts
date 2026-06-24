import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const REQUIRED_FIELDS = ['full_name', 'professional_title', 'license_number', 'country', 'specialty', 'organization'] as const

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: record } = await supabase
    .from('clinician_verifications')
    .select('*')
    .eq('clinician_id', user.id)
    .maybeSingle()

  if (!record) return NextResponse.json({ status: 'not_submitted' })
  return NextResponse.json(record)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'clinician') {
    return NextResponse.json({ error: 'Forbidden: clinician role required' }, { status: 403 })
  }

  const rateLimit = await checkRateLimit(`verification_submit:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || typeof body[field] !== 'string' || !(body[field] as string).trim()) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  const document_urls = Array.isArray(body.document_urls) ? body.document_urls : []

  const admin = createAdminClient()

  const { data: record, error } = await admin
    .from('clinician_verifications')
    .upsert(
      {
        clinician_id: user.id,
        full_name: (body.full_name as string).trim(),
        professional_title: (body.professional_title as string).trim(),
        license_number: (body.license_number as string).trim(),
        country: (body.country as string).trim(),
        specialty: (body.specialty as string).trim(),
        organization: (body.organization as string).trim(),
        document_urls,
        status: 'pending_verification',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'clinician_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save verification' }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'verification_submitted',
    target_type: 'clinician_verification',
    target_id: user.id,
  })

  return NextResponse.json(record, { status: 201 })
}
