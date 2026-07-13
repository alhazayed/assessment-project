import { requireAdmin } from '@/lib/admin-auth'
import AdminNav from './_components/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireAdmin()
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <AdminNav role={role} />
      <main className="flex-1 min-w-0 overflow-auto pt-16 lg:pt-0 lg:ms-[224px] app-shell-main">
        {children}
      </main>
    </div>
  )
}
