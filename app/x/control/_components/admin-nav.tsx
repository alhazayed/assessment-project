'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ClipboardList, BarChart3, Settings, Megaphone, ScrollText, Shield, LogOut } from 'lucide-react'

const NAV = [
  { href: '/x/control/overview',      label: 'Overview',       icon: LayoutDashboard },
  { href: '/x/control/users',         label: 'Users',          icon: Users },
  { href: '/x/control/assessments',   label: 'Assessments',    icon: ClipboardList },
  { href: '/x/control/results',       label: 'Results',        icon: BarChart3 },
  { href: '/x/control/platform',      label: 'Platform',       icon: Settings },
  { href: '/x/control/announcements', label: 'Announcements',  icon: Megaphone },
  { href: '/x/control/audit',         label: 'Audit Log',      icon: ScrollText },
]

export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <aside className="w-56 bg-slate-900 flex flex-col flex-shrink-0 min-h-screen">
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Admin Panel</p>
            <p className="text-xs text-slate-400 capitalize">{role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4 border-t border-slate-800 space-y-1">
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ← Back to platform
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
