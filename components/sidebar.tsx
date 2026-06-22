'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Heart,
  BookOpen,
  MessageSquare,
  User,
  LogOut,
  Brain,
  LineChart,
  Users,
  Shield,
  Settings,
  Menu,
  X,
  Layers,
} from 'lucide-react'
import type { Profile } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/language-toggle'
import NotificationBell from '@/components/notification-bell'
import UnreadMessagesBadge from '@/components/unread-messages-badge'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'

interface SidebarProps {
  profile: Profile | null
  lang: Lang
  showPackages?: boolean
}

export default function Sidebar({ profile, lang, showPackages = false }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isRtl = lang === 'ar'

  // Close on route change (mobile nav tap)
  useEffect(() => { setIsOpen(false) }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const patientNav = [
    { href: '/dashboard',   label: t('nav.dashboard', lang),   icon: LayoutDashboard, badge: undefined },
    { href: '/assessments', label: t('nav.assessments', lang),  icon: ClipboardList,   badge: undefined },
    ...(showPackages ? [{ href: '/packages', label: t('nav.packages', lang), icon: Layers, badge: t('nav.packages_badge', lang) }] : []),
    { href: '/adhd-zones',  label: t('nav.adhd_zones', lang),   icon: Brain,           badge: undefined },
    { href: '/mood',        label: t('nav.mood', lang),         icon: Heart,           badge: undefined },
    { href: '/journal',     label: t('nav.journal', lang),      icon: BookOpen,        badge: undefined },
    { href: '/insights',    label: t('nav.insights', lang),     icon: LineChart,       badge: undefined },
    { href: '/messages',    label: t('nav.messages', lang),     icon: MessageSquare,   badge: undefined },
    { href: '/profile',     label: t('nav.profile', lang),      icon: User,            badge: undefined },
  ]

  const adminNav = [
    { href: '/x/control',      label: t('nav.admin_panel', lang),    icon: Shield,        badge: undefined as string | undefined },
    { href: '/dashboard',      label: t('nav.dashboard', lang),      icon: LayoutDashboard, badge: undefined as string | undefined },
    { href: '/patients',       label: t('nav.admin_patients', lang), icon: Users,         badge: undefined as string | undefined },
    { href: '/assessments',    label: t('nav.assessments', lang),    icon: ClipboardList, badge: undefined as string | undefined },
    { href: '/profile',        label: t('nav.profile', lang),        icon: User,          badge: undefined as string | undefined },
    { href: '/admin/settings', label: t('nav.settings', lang),       icon: Settings,      badge: undefined as string | undefined },
  ]

  const nav = profile?.role === 'admin' || profile?.role === 'superadmin' ? adminNav : patientNav

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = lang === 'ar' && profile?.full_name_ar
    ? profile.full_name_ar
    : profile?.full_name_en ?? ''

  const initials = displayName
    ? displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : '?'

  const sidebarContent = (
    <aside
      className={`fixed inset-y-0 z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen
          ? 'translate-x-0'
          : isRtl ? 'translate-x-full' : '-translate-x-full'
      }`}
      style={{
        width: 'var(--sidebar-w)',
        backgroundColor: 'var(--sidebar-bg)',
        [isRtl ? 'right' : 'left']: 0,
        [isRtl ? 'borderLeft' : 'borderRight']: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Brand header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--sidebar-border)', minHeight: 'var(--topbar-h)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <BrandLogo variant="icon" size={32} />
          <span
            className="text-lg font-extrabold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            V Welfare
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <DarkModeToggle />
          <NotificationBell lang={lang} />
          {/* Close button — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ms-1"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-0.5">
        <p className="section-label px-3 mb-3">{isRtl ? 'القائمة' : 'MENU'}</p>
        {nav.map(item => {
          const Icon = item.icon
          const isActive = item.href === '/dashboard'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'nav-item-active' : 'nav-item'}
              style={isRtl && isActive ? {
                borderLeft: 'none',
                borderRight: '3px solid var(--vw-blue)',
                paddingRight: '10px',
                paddingLeft: '12px',
              } : undefined}
            >
              <Icon className="nav-item-icon" />
              <span className="flex-1 min-w-0">{item.label}</span>
              {item.href === '/messages' && <UnreadMessagesBadge />}
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0" style={{ backgroundColor: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Language toggle */}
      <div className="px-3 pb-1">
        <LanguageToggle lang={lang} className="w-full justify-center" />
      </div>

      {/* User profile + sign out */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm font-medium transition-colors text-start hover:bg-red-50 dark:hover:bg-[#2A1A1A] hover:text-red-600 dark:hover:text-red-400 mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {t('nav.signout', lang)}
        </button>
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-[10px]" style={{ background: 'var(--surface-alt)' }}>
            <div className="avatar-md flex-shrink-0">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </p>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                {isRtl ? 'حساب شخصي' : 'Personal account'}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile top bar — hidden on lg+ */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-16 flex-shrink-0"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <button
          className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          style={{ color: 'var(--text-primary)' }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 no-underline">
          <BrandLogo variant="icon" size={28} />
          <span className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            V Welfare
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <DarkModeToggle />
          <NotificationBell lang={lang} />
        </div>
      </div>

      {/* Backdrop — mobile only */}
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
