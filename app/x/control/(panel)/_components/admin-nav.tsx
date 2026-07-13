'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ClipboardList, BarChart3, Settings, Megaphone, ScrollText, LogOut, TrendingUp, Menu, X, Layers, ShieldAlert } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import BrandLogo from '@/components/brand-logo'

export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname()
  const lang = useLang()
  const isRtl = lang === 'ar'
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => { setIsOpen(false) }, [pathname])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const NAV = [
    { href: '/x/control/overview',      label: t('admin.nav.overview', lang),       icon: LayoutDashboard },
    { href: '/x/control/analytics',     label: t('admin.nav.analytics', lang),      icon: TrendingUp },
    { href: '/x/control/users',         label: t('admin.nav.users', lang),          icon: Users },
    { href: '/x/control/assessments',   label: t('admin.nav.assessments', lang),    icon: ClipboardList },
    { href: '/x/control/packages',      label: t('admin.nav.packages', lang),       icon: Layers },
    { href: '/x/control/results',       label: t('admin.nav.results', lang),        icon: BarChart3 },
    { href: '/x/control/risk',          label: t('admin.nav.risk', lang),           icon: ShieldAlert },
    { href: '/x/control/platform',      label: t('admin.nav.platform', lang),       icon: Settings },
    { href: '/x/control/announcements', label: t('admin.nav.announcements', lang),  icon: Megaphone },
    { href: '/x/control/audit',         label: t('admin.nav.audit', lang),          icon: ScrollText },
  ]

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    window.location.href = '/'
  }

  const sidebarContent = (
    <aside
      className={`fixed inset-y-0 z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 w-56 ${
        isOpen
          ? 'translate-x-0'
          : isRtl ? 'translate-x-full' : '-translate-x-full'
      }`}
      style={{
        backgroundColor: '#12273C',
        [isRtl ? 'right' : 'left']: 0,
      }}
    >
      <div className="px-4 py-4 flex items-center justify-between flex-shrink-0 mobile-topbar" style={{ borderBottom: '1px solid #1D6296' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo variant="icon" size={32} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">{t('admin.panel', lang)}</p>
            <p className="text-xs capitalize" style={{ color: '#F3650A' }}>{role}</p>
          </div>
        </div>
        <button
          className="lg:hidden touch-target rounded-lg transition-colors hover:bg-white/10"
          onClick={() => setIsOpen(false)}
          aria-label={lang === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
          style={{ color: '#7EB7DB' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                active ? 'text-white' : 'hover:text-white'
              }`}
              style={active
                ? { backgroundColor: '#F3650A' }
                : { color: '#7EB7DB' }
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4 space-y-1 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ borderTop: '1px solid #1D6296' }}>
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-lg text-xs transition-colors hover:text-white" style={{ color: '#53A0CF' }}>
          {t('admin.nav.back', lang)}
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors hover:text-red-400"
          style={{ color: '#7EB7DB' }}>
          <LogOut className="w-4 h-4" />
          {t('admin.nav.signout', lang)}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 mobile-topbar flex-shrink-0"
        style={{ backgroundColor: '#12273C', borderBottom: '1px solid #1D6296' }}
      >
        <button
          className="touch-target rounded-lg transition-colors hover:bg-white/10"
          onClick={() => setIsOpen(true)}
          aria-label={lang === 'ar' ? 'فتح القائمة' : 'Open menu'}
          style={{ color: '#7EB7DB' }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo variant="icon" size={26} />
          <p className="text-sm font-bold text-white truncate">{t('admin.panel', lang)}</p>
        </div>
        <div className="w-11 flex-shrink-0" />
      </div>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {sidebarContent}
    </>
  )
}
