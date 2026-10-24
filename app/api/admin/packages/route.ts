import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAdminAudit } from '@/lib/admin/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUSES = ['draft', 'active', 'archived'] as const
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

type Validated = { ok: true; value: Record<string, unknown> } | { ok: false; error: string }

// Columns an admin may set through this API, with their validators. Anything
// else in the request body (id, created_at, is_prototype, disclaimers, …) is
// rejected rather than written through, so the route cannot be used for mass
// assignment.
type FieldCheck = (v: unknown) => string | null
const text = (max: number, required = false): FieldCheck => v => {
  if (v === null || v === undefined || v === '') return required ? 'is required' : null
  if (typeof v !== 'string') return 'must be a string'
  if (required && !v.trim()) return 'is required'
  if (v.length > max) return `must be at most ${max} characters`
  return null
}
const jsonArray = (maxItems: number): FieldCheck => v => {
  if (!Array.isArray(v)) return 'must be an array'
  if (v.length > maxItems) return `must have at most ${maxItems} items`
  if (!v.every(x => x !== null && typeof x === 'object' && !Array.isArray(x))) return 'must be an array of objects'
  if (JSON.stringify(v).length > 20000) return 'is too large'
  return null
}

const FIELDS: Record<string, FieldCheck> = {
  name_en: text(200, true),
  name_ar: text(200, true),
  description_en: text(4000),
  description_ar: text(4000),
  purpose_en: text(4000),
  purpose_ar: text(4000),
  category: text(64),
  status: v => (typeof v === 'string' && (STATUSES as readonly string[]).includes(v) ? null : `must be one of ${STATUSES.join(', ')}`),
  icon: text(64),
  color: v => (typeof v === 'string' && COLOR_RE.test(v) ? null : 'must be a #RRGGBB colour'),
  index_name_en: text(200),
  index_name_ar: text(200),
  sort_order: v => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10000 ? null : 'must be an integer 0–10000'),
  interpretation_bands: jsonArray(20),
  output_dimensions: jsonArray(50),
}

/** Picks and validates only allow-listed columns from `body`. */
function pickFields(body: Record<string, unknown>, { partial }: { partial: boolean }): Validated {
  const value: Record<string, unknown> = {}
  const unknown = Object.keys(body).filter(k => k !== 'id' && !(k in FIELDS))
  if (unknown.length) return { ok: false, error: `Unknown field(s): ${unknown.join(', ')}` }
  for (const [key, check] of Object.entries(FIELDS)) {
    if (!(key in body)) {
      if (!partial && (key === 'name_en' || key === 'name_ar')) return { ok: false, error: `${key} is required` }
      continue
    }
    const err = check(body[key])
    if (err) return { ok: false, error: `${key} ${err}` }
    const v = body[key]
    value[key] = typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v
  }
  // Required text columns must never be nulled by an update.
  for (const key of ['name_en', 'name_ar', 'category', 'status']) {
    if (key in value && value[key] === null) return { ok: false, error: `${key} cannot be empty` }
  }
  return { ok: true, value }
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null
}

export async function GET() {
  try {
    await requireAdmin()
    const db = createAdminClient()
    const { data: packages, error } = await db
      .from('packages')
      .select('*, package_assessments(id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)')
      .order('sort_order')
    if (error) throw error
    return NextResponse.json({ packages: packages || [] })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin()
    const body = await readBody(request)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    const picked = pickFields(body, { partial: false })
    if (!picked.ok) return NextResponse.json({ error: picked.error }, { status: 400 })

    const db = createAdminClient()
    const { data, error } = await db
      .from('packages')
      .insert({ category: 'general', status: 'draft', color: '#1D6296', ...picked.value })
      .select()
      .single()
    if (error) throw error

    await writeAdminAudit({
      actorId: user.id,
      action: 'package_create',
      targetType: 'package',
      targetId: data.id,
      details: { fields: Object.keys(picked.value), name_en: data.name_en, status: data.status },
    }, db)
    return NextResponse.json({ package: data }, { status: 201 })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdmin()
    const body = await readBody(request)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    const id = body.id
    if (typeof id !== 'string' || !UUID_RE.test(id)) return NextResponse.json({ error: 'id must be a UUID' }, { status: 400 })
    const picked = pickFields(body, { partial: true })
    if (!picked.ok) return NextResponse.json({ error: picked.error }, { status: 400 })
    if (Object.keys(picked.value).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: updated, error } = await db
      .from('packages')
      .update({ ...picked.value, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!updated || updated.length === 0) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    await writeAdminAudit({
      actorId: user.id,
      action: 'package_update',
      targetType: 'package',
      targetId: id,
      details: {
        fields: Object.keys(picked.value),
        ...('status' in picked.value ? { status: picked.value.status } : {}),
      },
    }, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requireAdmin()
    const body = await readBody(request)
    const id = body?.id
    if (typeof id !== 'string' || !UUID_RE.test(id)) return NextResponse.json({ error: 'id must be a UUID' }, { status: 400 })

    const db = createAdminClient()
    const { data: deleted, error } = await db
      .from('packages')
      .delete()
      .eq('id', id)
      .select('id, name_en')
    if (error) {
      // FK violation: the package has results/payments that reference it.
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Package is in use and cannot be deleted; archive it instead.' }, { status: 409 })
      }
      throw error
    }
    if (!deleted || deleted.length === 0) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    await writeAdminAudit({
      actorId: user.id,
      action: 'package_delete',
      targetType: 'package',
      targetId: id,
      details: { name_en: deleted[0].name_en },
    }, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminRouteError(error)
  }
}
