import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { VALID_TIERS, TIER_PRICES_USD, isValidTier, applyDiscount } from '@/lib/billing/pricing'

/**
 * POST /api/checkout/validate-promo
 *
 * Customer-facing promo-code preview for the checkout page. Validates a single
 * code and returns the resulting discount + final price WITHOUT exposing any
 * other codes or internal fields.
 *
 * Why this exists: the checkout page previously validated promos by calling the
 * superadmin-only `GET /api/admin/promo-codes`, so every real customer got a 403
 * and saw "Error validating promo code". Promo tables are RLS-locked, so — like
 * `create-session` — this endpoint reads them with the service-role client after
 * authenticating the user. The validation gates here mirror `create-session`
 * exactly, so this preview always matches the amount that will actually be
 * charged (the charge is still computed server-side there; this is display only).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'User must be authenticated' }, { status: 401 })
    }

    // Rate limit so the endpoint can't be used as a promo-code enumeration oracle.
    const rl = await checkRateLimit(`promo_validate:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { promoCode, packageId } = body as { promoCode?: string; packageId?: string }

    if (!promoCode || typeof promoCode !== 'string' || !promoCode.trim()) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }
    if (!isValidTier(packageId)) {
      return NextResponse.json({ error: 'Invalid package tier' }, { status: 400 })
    }

    const basePrice = TIER_PRICES_USD[packageId]

    // Promo tables are RLS-locked; read with the service-role client (user is
    // already authenticated above). Same lookup + gates as create-session.
    const db = createAdminClient()
    const { data: code } = await db
      .from('promo_codes')
      .select('id, code, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, active')
      .eq('code', promoCode.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle()

    if (!code) {
      return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 })
    }

    const now = new Date()
    if (code.valid_from && new Date(code.valid_from) > now) {
      return NextResponse.json({ error: 'Promo code is not yet active' }, { status: 400 })
    }
    if (code.valid_until && new Date(code.valid_until) < now) {
      return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 })
    }
    if (code.max_uses && (code.current_uses ?? 0) >= code.max_uses) {
      return NextResponse.json({ error: 'Promo code usage limit reached' }, { status: 400 })
    }

    // Authoritative final price (same helper create-session charges from).
    const finalPrice = applyDiscount(basePrice, code.discount_type, code.discount_value)
    const isPercentage = code.discount_type === 'percentage'

    return NextResponse.json({
      valid: true,
      // Normalised to what the checkout UI renders: a percentage, or a dollar amount off.
      discountType: isPercentage ? 'percentage' : 'fixed',
      discount: isPercentage
        ? code.discount_value
        : Math.round((basePrice - finalPrice) * 100) / 100,
      basePrice,
      finalPrice,
    })
  } catch (error) {
    console.error('[POST /api/checkout/validate-promo] error:', error)
    return NextResponse.json({ error: 'Error validating promo code' }, { status: 500 })
  }
}
