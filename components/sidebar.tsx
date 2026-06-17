'use client'

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
}

export default function Sidebar({ profile, lang }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isRtl = lang === 'ar'

  const patientNav = [
    { href: '/dashboard',   label: t('nav.dashboard', lang),   icon: LayoutDashboard },
    { href: '/assessments', label: t('nav.assessments', lang),  icon: ClipboardList },
    { href: '/adhd-zones',  label: t('nav.adhd_zones', lang),   icon: Brain },
    { href: '/mood',        label: t('nav.mood', lang),         icon: Heart },
    { href: '/journal',     label: t('nav.journal', lang),      icon: BookOpen },
    { href: '/insights',    label: t('nav.insights', lang),     icon: LineChart },
    { href: '/messages',    label: t('nav.messages', lang),     icon: MessageSquare },
    { href: '/profile',     label: t('nav.profile', lang),      icon: User },
  ]

  const adminNav = [
    { href: '/x/control',      label: t('nav.admin_panel', lang),    icon: Shield },
    { href: '/dashboard',      label: t('nav.dashboard', lang),      icon: LayoutDashboard },
    { href: '/patients',       label: t('nav.admin_patients', lang), icon: Users },
    { href: '/assessments',    label: t('nav.assessments', lang),    icon: ClipboardList },
    { href: '/profile',        label: t('nav.profile', lang),        icon: User },
    { href: '/admin/settings', label: t('nav.settings', lang),       icon: Settings },
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

  return (
    <aside
      className="fixed inset-y-0 flex flex-col z-10"
      style={{
        width: 'var(--sidebar-w)',
        backgroundColor: 'var(--sidebar-bg)',
        [isRtl ? 'right' : 'left']: 0,
        [isRtl ? 'borderLeft' : 'borderRight']: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Brand header */}
      <div
        className="flex items-center justify-between px-5 py-4"
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
            </Link>
          )
        })}
      </nav>

      {/* Language toggle */}
      <div className="px-3 pb-1">
        <LanguageToggle lang={lang} className="w-full justify-center" />
      </div>

      {/* User profile + sign out */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
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
}
