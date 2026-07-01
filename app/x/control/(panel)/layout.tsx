import { requireAdmin } from '@/lib/admin-auth'
import AdminNav from './_components/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireAdmin()
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      {/* Skip-to-content link for keyboard/screen-reader users (WCAG 2.4.1) */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <AdminNav role={role} />
      <main id="admin-main" className="flex-1 min-w-0 overflow-auto pt-16 lg:pt-0 lg:ms-[224px]">
        {children}
      </main>
    </div>
  )
}
