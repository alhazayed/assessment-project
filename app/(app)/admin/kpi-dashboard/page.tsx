import { requireAdmin } from '@/lib/admin-auth'
import { KpiDashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

export default async function KPIDashboardPage() {
  // Redirects non-admins to /x/control/login. Matches the rest of the admin API.
  await requireAdmin()
  return <KpiDashboardClient />
}
