import { createClient } from '@/lib/supabase/server'

/**
 * Server-side feature-flag read. `feature_flags` is world-readable via RLS
 * (`flags_read` = true), so this works for anonymous and authenticated callers
 * alike. Fails closed (returns false) on any error so a flag lookup failure can
 * never accidentally expose a gated feature.
 */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('flag_key', flagKey)
      .maybeSingle()
    return data?.is_enabled ?? false
  } catch {
    return false
  }
}

/**
 * Whether the paid Packages/checkout feature is live. Gates the checkout page
 * and the checkout APIs so the (currently mocked) payment flow cannot be
 * exercised until real Stripe is wired and `show_packages` is enabled.
 */
export function isPackagesEnabled(): Promise<boolean> {
  return isFeatureEnabled('show_packages')
}
