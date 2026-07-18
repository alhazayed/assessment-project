import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

import type { PermissionKey } from '@/lib/types'
import { ALL_PERMISSION_KEYS, isValidPermissionKey } from '@/lib/permissions'

const VALID_ACTIONS = ['approve', 'reject', 'revoke'] as const
type Action = (typeof VALID_ACTIONS)[number]

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing relationship id' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, granted_permissions } = body as {
    action?: string
    granted_permissions?: unknown
  }

  if (!action || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  const typedAction = action as Action

  // Fetch the relationship
  const { data: relationship, error: fetchError } = await supabase
    .from('clinician_patient_relationships')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('[PATCH /api/access-requests/[id]] fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch relationship' }, { status: 500 })
  }

  if (!relationship) {
    return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
  }

  // Determine if the user is the patient or an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role)
  const isPatient = user.id === relationship.patient_id

  if (!isPatient && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  if (typedAction === 'approve') {
    // Validate granted_permissions
    if (!Array.isArray(granted_permissions)) {
      return NextResponse.json(
        { error: 'granted_permissions must be an array of permission keys' },
        { status: 400 }
      )
    }

    const invalidKeys = (granted_permissions as unknown[]).filter((k) => !isValidPermissionKey(k))
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid permission keys: ${invalidKeys.join(', ')}. Valid values: ${ALL_PERMISSION_KEYS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const grantedSet = new Set(granted_permissions as string[])

    // Update relationship status
    const { data: updatedRelationship, error: updateError } = await admin
      .from('clinician_patient_relationships')
      .update({
        status: 'active',
        responded_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/access-requests/[id]] approve update error:', updateError)
      return NextResponse.json({ error: 'Failed to update relationship' }, { status: 500 })
    }

    // Upsert permissions for all valid keys
    const permissionUpserts = ALL_PERMISSION_KEYS.map((key: PermissionKey) => ({
      relationship_id: id,
      permission_key: key,
      granted: grantedSet.has(key),
      granted_at: grantedSet.has(key) ? now : null,
      modified_by: user.id,
    }))

    const { error: permError } = await admin
      .from('relationship_permissions')
      .upsert(permissionUpserts, {
        onConflict: 'relationship_id,permission_key',
      })

    if (permError) {
      console.error('[PATCH /api/access-requests/[id]] permissions upsert error:', permError)
    }

    // Notify clinician
    const { error: notifError } = await admin.from('notification_events').insert({
      recipient_id: relationship.clinician_id,
      sender_id: user.id,
      event_type: 'access_approved',
      related_id: id,
      related_type: 'clinician_patient_relationship',
      title_en: 'Access Approved',
      title_ar: 'تم الموافقة على الوصول',
      body_en: 'The patient has approved your access request',
      body_ar: 'وافق المريض على طلب الوصول الخاص بك',
      link: '/clinician/patients',
    })

    if (notifError) {
      console.error('[PATCH /api/access-requests/[id]] approve notification error:', notifError)
    }

    // Audit log
    const { error: auditError } = await admin.from('audit_log').insert({
      actor_id: user.id,
      action: 'access_request_approved',
      target_type: 'clinician_patient_relationship',
      target_id: id,
      details: { granted_permissions: Array.from(grantedSet) },
    })

    if (auditError) {
      console.error('[PATCH /api/access-requests/[id]] approve audit error:', auditError)
    }

    return NextResponse.json({ relationship: updatedRelationship })
  }

  if (typedAction === 'reject') {
    const { data: updatedRelationship, error: updateError } = await admin
      .from('clinician_patient_relationships')
      .update({
        status: 'rejected',
        responded_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/access-requests/[id]] reject update error:', updateError)
      return NextResponse.json({ error: 'Failed to update relationship' }, { status: 500 })
    }

    // Notify clinician
    const { error: notifError } = await admin.from('notification_events').insert({
      recipient_id: relationship.clinician_id,
      sender_id: user.id,
      event_type: 'access_rejected',
      related_id: id,
      related_type: 'clinician_patient_relationship',
      title_en: 'Access Rejected',
      title_ar: 'تم رفض الوصول',
      body_en: 'The patient has rejected your access request',
      body_ar: 'رفض المريض طلب الوصول الخاص بك',
      link: '/clinician/patients',
    })

    if (notifError) {
      console.error('[PATCH /api/access-requests/[id]] reject notification error:', notifError)
    }

    // Audit log
    const { error: auditError } = await admin.from('audit_log').insert({
      actor_id: user.id,
      action: 'access_request_rejected',
      target_type: 'clinician_patient_relationship',
      target_id: id,
    })

    if (auditError) {
      console.error('[PATCH /api/access-requests/[id]] reject audit error:', auditError)
    }

    return NextResponse.json({ relationship: updatedRelationship })
  }

  if (typedAction === 'revoke') {
    if (relationship.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active relationships can be revoked' },
        { status: 400 }
      )
    }

    const { data: updatedRelationship, error: updateError } = await admin
      .from('clinician_patient_relationships')
      .update({
        status: 'revoked',
        revoked_at: now,
        revoked_by: user.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/access-requests/[id]] revoke update error:', updateError)
      return NextResponse.json({ error: 'Failed to revoke relationship' }, { status: 500 })
    }

    // Notify clinician
    const { error: notifError } = await admin.from('notification_events').insert({
      recipient_id: relationship.clinician_id,
      sender_id: user.id,
      event_type: 'access_revoked',
      related_id: id,
      related_type: 'clinician_patient_relationship',
      title_en: 'Access Revoked',
      title_ar: 'تم سحب الوصول',
      body_en: 'The patient has revoked your access',
      body_ar: 'قام المريض بسحب حق الوصول الخاص بك',
      link: '/clinician/patients',
    })

    if (notifError) {
      console.error('[PATCH /api/access-requests/[id]] revoke notification error:', notifError)
    }

    // Audit log
    const { error: auditError } = await admin.from('audit_log').insert({
      actor_id: user.id,
      action: 'access_revoked',
      target_type: 'clinician_patient_relationship',
      target_id: id,
    })

    if (auditError) {
      console.error('[PATCH /api/access-requests/[id]] revoke audit error:', auditError)
    }

    return NextResponse.json({ relationship: updatedRelationship })
  }

  // Unreachable, but TypeScript safety
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
