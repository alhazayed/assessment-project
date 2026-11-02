import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPackagesEnabled } from '@/lib/feature-flags'
import { resolveProduct } from '@/lib/billing/product'
import { hasPackageAccess } from '@/lib/billing/package-access'

/**
 * GET /api/checkout/product?id=<package uuid>
 *
 * Name and server-side price of what the checkout page is selling, so the
 * page shows the same price create-session will charge.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'User must be authenticated' }, { status: 401 })

  if (!(await isPackagesEnabled())) {
    return NextResponse.json({ error: 'Packages are not currently available' }, { status: 403 })
  }

  const id = new URL(request.url).searchParams.get('id')
  const db = createAdminClient()
  const resolved = await resolveProduct(db, id)
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error === 'not_for_sale' ? 'This package is not for sale' : 'Invalid package', reason: resolved.error },
      { status: resolved.error === 'not_for_sale' ? 409 : 404 }
    )
  }
  const p = resolved.product
  const owned = p.kind === 'package' ? await hasPackageAccess(db, user.id, p.packageId) : false

  return NextResponse.json({
    id: p.id,
    kind: p.kind,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    priceUSD: p.priceUSD,
    owned,
  })
}
