import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Whether a user may see a package's combined report: they bought it (an
 * active purchase that has not expired), or they are staff (admin/superadmin,
 * for support and QA). The individual assessments inside a package stay free;
 * only the combined report is paid.
 *
 * Call with the service-role client: the decision must not depend on what RLS
 * lets the caller read.
 */
export async function hasPackageAccess(
  db: SupabaseClient,
  userId: string,
  packageId: string
): Promise<boolean> {
  const [purchaseRes, profileRes] = await Promise.all([
    db
      .from('package_purchases')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('package_id', packageId)
      .eq('status', 'active'),
    db.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ])

  if (isPurchaseActive(purchaseRes.data ?? [], new Date())) return true
  const role = (profileRes.data as { role?: string } | null)?.role
  return role === 'admin' || role === 'superadmin'
}

/** Pure check (unit-tested): any purchase with no expiry or a future expiry. */
export function isPurchaseActive(rows: { expires_at: string | null }[], now: Date): boolean {
  return rows.some(r => r.expires_at == null || new Date(r.expires_at) > now)
}
