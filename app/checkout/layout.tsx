import { redirect } from 'next/navigation'
import { isPackagesEnabled } from '@/lib/feature-flags'

export const metadata = { robots: { index: false, follow: false } }

/**
 * Gate the checkout flow on the same flag that governs the paid Packages
 * feature. While it is disabled (and Stripe is mocked), no one can reach the
 * checkout UI — even by navigating directly — so the no-op mock "purchase"
 * path is closed. Re-enabling `show_packages` (after wiring real Stripe)
 * restores checkout automatically.
 */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  if (!(await isPackagesEnabled())) {
    redirect('/packages')
  }
  return children
}
