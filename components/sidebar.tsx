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
  Users,
  Settings,
  LineChart,
  Shield,
  Brain,
} from 'lucide-react'
import type { Profile } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/language-toggle'
import NotificationBell from '@/components/notification-bell'
import UnreadMessagesBadge from '@/components/unread-messages-badge'
import BrandLogo from '@/components/brand-logo'

interface SidebarProps {
  profile: Profile | null
  lang: Lang
}

export default function Sidebar({ profile, lang }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const patientNav = [
    { href: '/dashboard', label: t('nav.dashboard', lang), icon: LayoutDashboard },
    { href: '/assessments', label: t('nav.assessments', lang), icon: ClipboardList },
    { href: '/adhd-zones', label: t('nav.adhd_zones', lang), icon: Brain },
    { href: '/mood', label: t('nav.mood', lang), icon: Heart },
    { href: '/journal', label: t('nav.journal', lang), icon: BookOpen },
    { href: '/insights', label: t('nav.insights', lang), icon: LineChart },
    { href: '/messages', label: t('nav.messages', lang), icon: MessageSquare },
    { href: '/profile', label: t('nav.profile', lang), icon: User },
  ]

  const clinicianNav = [
    { href: '/dashboard', label: t('nav.dashboard', lang), icon: LayoutDashboard },
    { href: '/patients', label: t('nav.patients', lang), icon: Users },
    { href: '/assessments', label: t('nav.assessments', lang), icon: ClipboardList },
    { href: '/messages', label: t('nav.messages', lang), icon: MessageSquare },
    { href: '/profile', label: t('nav.profile', lang), icon: User },
  ]

  const adminNav = [
    { href: '/x/control', label: t('nav.admin_panel', lang), icon: Shield },
    { href: '/dashboard', label: t('nav.dashboard', lang), icon: LayoutDashboard },
    { href: '/patients', label: t('nav.admin_patients', lang), icon: Users },
    { href: '/assessments', label: t('nav.assessments', lang), icon: ClipboardList },
    { href: '/profile', label: t('nav.profile', lang), icon: User },
    { href: '/admin/settings', label: t('nav.settings', lang), icon: Settings },
  ]

  const nav = profile?.role === 'clinician' ? clinicianNav
    : profile?.role === 'admin' || profile?.role === 'superadmin' ? adminNav
    : patientNav

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = lang === 'ar' && profile?.full_name_ar
    ? profile.full_name_ar
    : profile?.full_name_en ?? ''

  return (
    <aside className={`fixed inset-y-0 w-64 bg-white flex flex-col z-10 ${lang === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} border-gray-200`}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="icon" size={38} />
          <span className="font-semibold text-gray-900">{t('app.name', lang)}</span>
        </div>
        <NotificationBell lang={lang} />
      </div>

      {profile && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-brand-700">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
              {item.label}
              {item.href === '/messages' && <UnreadMessagesBadge />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-2">
        <LanguageToggle lang={lang} className="w-full justify-center mb-1" />
      </div>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 text-gray-400" />
          {t('nav.signout', lang)}
        </button>
      </div>
    </aside>
  )
}
