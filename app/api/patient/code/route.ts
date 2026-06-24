import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

// GET /api/patient/code - get or generate patient access code
export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'patient') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: existingCode, error: codeError } = await supabase
    .from('patient_access_codes')
    .select('code, created_at, last_used_at')
    .eq('patient_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!codeError && existingCode) {
    return NextResponse.json({
      code: existingCode.code,
      created_at: existingCode.created_at,
      last_used_at: existingCode.last_used_at,
    })
  }

  // No active code found — generate one
  const adminClient = createAdminClient()

  const { data: generatedCode, error: rpcError } = await adminClient.rpc(
    'generate_patient_access_code',
  )

  if (rpcError || !generatedCode) {
    return NextResponse.json(
      { error: 'Failed to generate access code' },
      { status: 500 },
    )
  }

  const { data: newRecord, error: insertError } = await adminClient
    .from('patient_access_codes')
    .insert({
      patient_id: user.id,
      code: generatedCode,
      is_active: true,
    })
    .select('code, created_at, last_used_at')
    .single()

  if (insertError || !newRecord) {
    return NextResponse.json(
      { error: 'Failed to save access code' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    code: newRecord.code,
    created_at: newRecord.created_at,
    last_used_at: newRecord.last_used_at,
  })
}

// POST /api/patient/code - regenerate patient access code
export async function POST() {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'patient') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit: max 3 regenerations per 24 hours
  const rateLimitKey = `access_code_regen:${user.id}`
  const { allowed, remaining } = await checkRateLimit(rateLimitKey, {
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  })

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. You may regenerate your access code at most 3 times per day.',
        remaining,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(24 * 60 * 60),
        },
      },
    )
  }

  const adminClient = createAdminClient()

  // Deactivate existing active codes
  const { error: deactivateError } = await adminClient
    .from('patient_access_codes')
    .update({ is_active: false })
    .eq('patient_id', user.id)
    .eq('is_active', true)

  if (deactivateError) {
    return NextResponse.json(
      { error: 'Failed to deactivate existing access code' },
      { status: 500 },
    )
  }

  // Generate new code
  const { data: generatedCode, error: rpcError } = await adminClient.rpc(
    'generate_patient_access_code',
  )

  if (rpcError || !generatedCode) {
    return NextResponse.json(
      { error: 'Failed to generate new access code' },
      { status: 500 },
    )
  }

  // Insert new active code
  const { data: newRecord, error: insertError } = await adminClient
    .from('patient_access_codes')
    .insert({
      patient_id: user.id,
      code: generatedCode,
      is_active: true,
    })
    .select('code, created_at')
    .single()

  if (insertError || !newRecord) {
    return NextResponse.json(
      { error: 'Failed to save new access code' },
      { status: 500 },
    )
  }

  // Write audit log
  await adminClient.from('audit_log').insert({
    action: 'access_code_regenerated',
    actor_id: user.id,
    target_type: 'patient_access_code',
  })

  return NextResponse.json({
    code: newRecord.code,
    created_at: newRecord.created_at,
  })
}
