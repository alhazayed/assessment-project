import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/promo-codes
 *
 * Superadmin-only endpoint to create promo codes or free use codes.
 *
 * Request body:
 * {
 *   code: string (required) - Code value (e.g., "SUMMER2024", "FREE100")
 *   codeType: 'free_use' | 'discount' (required)
 *   discountType: 'percentage' | 'fixed_amount' | 'free' (required if discount)
 *   discountValue: number (required if discount)
 *   description: string (optional)
 *   maxUses: number (optional)
 *   validUntil: ISO date string (optional)
 * }
 */
export async function POST(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can create promo codes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      code,
      codeType,
      discountType,
      discountValue,
      description,
      maxUses,
      validUntil,
    } = body

    // Validate input
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Code is required and must be non-empty' },
        { status: 400 }
      )
    }

    if (!codeType || !['free_use', 'discount'].includes(codeType)) {
      return NextResponse.json(
        { error: 'Code type must be: free_use or discount' },
        { status: 400 }
      )
    }

    if (codeType === 'discount') {
      if (!discountType || !['percentage', 'fixed_amount', 'free'].includes(discountType)) {
        return NextResponse.json(
          { error: 'Discount type required: percentage, fixed_amount, or free' },
          { status: 400 }
        )
      }

      if (discountType !== 'free' && (discountValue === undefined || discountValue <= 0)) {
        return NextResponse.json(
          { error: 'Discount value must be positive' },
          { status: 400 }
        )
      }
    }

    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createAdminClient()

    // Check if code already exists
    const { data: existing } = await db
      .from('promo_codes')
      .select('id')
      .eq('code', code.toUpperCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Code already exists' },
        { status: 409 }
      )
    }

    // Create promo code
    const { data: newCode, error } = await db
      .from('promo_codes')
      .insert({
        code: code.toUpperCase(),
        code_type: codeType,
        discount_type: codeType === 'discount' ? discountType : null,
        discount_value: codeType === 'discount' ? discountValue : null,
        description: description || null,
        created_by: currentUser.id,
        max_uses: maxUses || null,
        valid_until: validUntil || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log
    await db.from('audit_log').insert({
      actor_id: currentUser.id,
      action: 'promo_code_created',
      target_type: 'promo_code',
      target_id: newCode.id,
      reason: `Created ${codeType} code: ${code}`,
      metadata: {
        code: code.toUpperCase(),
        code_type: codeType,
        discount_type: discountType,
        discount_value: discountValue,
      },
    })

    return NextResponse.json({ ok: true, code: newCode }, { status: 201 })
  } catch (error) {
    console.error('Promo code creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/promo-codes
 *
 * List all promo codes (superadmin only)
 */
export async function GET(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can view promo codes' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active') === 'true'

    const db = createAdminClient()

    let query = db
      .from('promo_codes')
      .select('*, created_by_profile:profiles(full_name_en)')
      .order('created_at', { ascending: false })

    if (active) {
      query = query.eq('active', true).gte('valid_until', new Date().toISOString())
    }

    const { data: codes, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      codes: codes || [],
      total: codes?.length || 0,
    })
  } catch (error) {
    console.error('Promo codes fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/promo-codes/[id]
 *
 * Update a promo code (superadmin only)
 */
export async function PATCH(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can update promo codes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, active, maxUses, validUntil } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Code ID is required' },
        { status: 400 }
      )
    }

    const db = createAdminClient()
    const update: Record<string, unknown> = {}

    if (active !== undefined) update.active = Boolean(active)
    if (maxUses !== undefined) update.max_uses = maxUses
    if (validUntil !== undefined) update.valid_until = validUntil

    const { data: updated, error } = await db
      .from('promo_codes')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      await db.from('audit_log').insert({
        actor_id: currentUser.id,
        action: 'promo_code_updated',
        target_type: 'promo_code',
        target_id: id,
        reason: `Updated promo code: ${Object.entries(update).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      })
    }

    return NextResponse.json({ ok: true, code: updated })
  } catch (error) {
    console.error('Promo code update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/promo-codes/[id]
 *
 * Delete a promo code (superadmin only)
 */
export async function DELETE(request: Request) {
  try {
    const { role } = await requireAdmin()
    if (role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can delete promo codes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Code ID is required' },
        { status: 400 }
      )
    }

    const db = createAdminClient()

    // Get code before deletion
    const { data: codeData } = await db
      .from('promo_codes')
      .select('code')
      .eq('id', id)
      .single()

    // Delete
    const { error } = await db
      .from('promo_codes')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      await db.from('audit_log').insert({
        actor_id: currentUser.id,
        action: 'promo_code_deleted',
        target_type: 'promo_code',
        target_id: id,
        reason: `Deleted promo code: ${codeData?.code}`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Promo code deletion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
