import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_PERMISSION_KEYS } from '@/lib/types'
import { isPermissionKey } from '@/lib/permissions'

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing relationship id' }, { status: 400 })
  }

  // Fetch the relationship to verify membership
  const { data: relationship, error: relError } = await supabase
    .from('clinician_patient_relationships')
    .select('id, patient_id, clinician_id')
    .eq('id', id)
    .maybeSingle()

  if (relError) {
    console.error('[GET /api/relationships/[id]/permissions] fetch error:', relError)
    return NextResponse.json({ error: 'Failed to fetch relationship' }, { status: 500 })
  }

  if (!relationship) {
    return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
  }

  const isPatient = user.id === relationship.patient_id
  const isClinician = user.id === relationship.clinician_id

  if (!isPatient && !isClinician) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: permissions, error: permError } = await supabase
    .from('relationship_permissions')
    .select('*')
    .eq('relationship_id', id)

  if (permError) {
    console.error('[GET /api/relationships/[id]/permissions] permissions fetch error:', permError)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }

  return NextResponse.json({ permissions: permissions ?? [] })
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing relationship id' }, { status: 400 })
  }

  // Fetch the relationship to verify the user is the patient
  const { data: relationship, error: relError } = await supabase
    .from('clinician_patient_relationships')
    .select('id, patient_id, clinician_id, status')
    .eq('id', id)
    .maybeSingle()

  if (relError) {
    console.error('[PATCH /api/relationships/[id]/permissions] fetch error:', relError)
    return NextResponse.json({ error: 'Failed to fetch relationship' }, { status: 500 })
  }

  if (!relationship) {
    return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
  }

  if (user.id !== relationship.patient_id) {
    return NextResponse.json({ error: 'Forbidden: only the patient can modify permissions' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { permission_key, granted } = body as {
    permission_key?: unknown
    granted?: unknown
  }

  if (!isPermissionKey(permission_key)) {
    return NextResponse.json(
      {
        error: `permission_key must be one of: ${ALL_PERMISSION_KEYS.join(', ')}`,
      },
      { status: 400 }
    )
  }

  if (typeof granted !== 'boolean') {
    return NextResponse.json({ error: 'granted must be a boolean' }, { status: 400 })
  }

  const typedKey = permission_key
  const now = new Date().toISOString()

  const admin = createAdminClient()

  const upsertPayload = {
    relationship_id: id,
    permission_key: typedKey,
    granted,
    granted_at: granted ? now : null,
    revoked_at: !granted ? now : null,
    modified_by: user.id,
  }

  const { data: updatedPermission, error: upsertError } = await admin
    .from('relationship_permissions')
    .upsert(upsertPayload, {
      onConflict: 'relationship_id,permission_key',
    })
    .select()
    .single()

  if (upsertError) {
    console.error('[PATCH /api/relationships/[id]/permissions] upsert error:', upsertError)
    return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 })
  }

  // Audit log
  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'permission_modified',
    target_type: 'clinician_patient_relationship',
    target_id: id,
    details: { permission_key: typedKey, granted },
  })

  if (auditError) {
    console.error('[PATCH /api/relationships/[id]/permissions] audit error:', auditError)
  }

  return NextResponse.json({ permission: updatedPermission })
}
