'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ClipboardList, BarChart3, Settings, Megaphone, ScrollText, LogOut, TrendingUp } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import BrandLogo from '@/components/brand-logo'

export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname()
  const lang = useLang()

  const NAV = [
    { href: '/x/control/overview',      label: t('admin.nav.overview', lang),       icon: LayoutDashboard },
    { href: '/x/control/analytics',     label: t('admin.nav.analytics', lang),      icon: TrendingUp },
    { href: '/x/control/users',         label: t('admin.nav.users', lang),          icon: Users },
    { href: '/x/control/assessments',   label: t('admin.nav.assessments', lang),    icon: ClipboardList },
    { href: '/x/control/results',       label: t('admin.nav.results', lang),        icon: BarChart3 },
    { href: '/x/control/platform',      label: t('admin.nav.platform', lang),       icon: Settings },
    { href: '/x/control/announcements', label: t('admin.nav.announcements', lang),  icon: Megaphone },
    { href: '/x/control/audit',         label: t('admin.nav.audit', lang),          icon: ScrollText },
  ]

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <aside className="w-56 flex flex-col flex-shrink-0 min-h-screen" style={{ backgroundColor: '#12273C' }}>
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #1D6296' }}>
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="icon" size={36} />
          <div>
            <p className="text-sm font-bold text-white leading-tight">{t('admin.panel', lang)}</p>
            <p className="text-xs capitalize" style={{ color: '#F3650A' }}>{role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'text-white' : 'hover:text-white'
              }`}
              style={active
                ? { backgroundColor: '#F3650A' }
                : { color: '#7EB7DB' }
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4 space-y-1" style={{ borderTop: '1px solid #1D6296' }}>
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors hover:text-white" style={{ color: '#53A0CF' }}>
          {t('admin.nav.back', lang)}
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:text-red-400"
          style={{ color: '#7EB7DB' }}>
          <LogOut className="w-4 h-4" />
          {t('admin.nav.signout', lang)}
        </button>
      </div>
    </aside>
  )
}
