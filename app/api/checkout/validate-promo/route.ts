import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { applyDiscount } from '@/lib/billing/pricing'
import { resolveProduct } from '@/lib/billing/product'
import { isPackagesEnabled } from '@/lib/feature-flags'
import { checkPromoCode } from '@/lib/billing/promo'

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

    // Hard gate: no promo validation while the paid Packages feature is disabled
    // (mirrors create-session, which refuses to create a session).
    if (!(await isPackagesEnabled())) {
      return NextResponse.json(
        { error: 'Packages are not currently available' },
        { status: 403 }
      )
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
    // Promo tables are RLS-locked; read with the service-role client (user is
    // already authenticated above). Same checker create-session charges from.
    const db = createAdminClient()

    // A tier or a package UUID; same price lookup create-session charges from.
    const resolved = await resolveProduct(db, packageId)
    if (!resolved.ok) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
    }
    const basePrice = resolved.product.priceUSD
    const check = await checkPromoCode(db, promoCode, user.id)
    if (!check.ok) {
      return NextResponse.json({ error: check.error, reason: check.reason }, { status: 400 })
    }
    const code = check.code

    // Authoritative final price (same helper create-session charges from).
    const finalPrice = applyDiscount(basePrice, code.discount_type, code.discount_value, code.code_type)
    const isPercentage = code.code_type !== 'free_use' && code.discount_type === 'percentage'

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
