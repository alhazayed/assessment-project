'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Search, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type User = {
  id: string; full_name_en: string; full_name_ar: string | null; role: string
  is_active: boolean; created_at: string; language_preference: string
  submission_count?: number
}

const ROLES = ['patient', 'clinician', 'admin', 'superadmin']

export default function AdminUsersPage() {
  const lang = useLang()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}`)
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [search, roleFilter])

  useEffect(() => { load() }, [load])

  async function toggleActive(id: string, current: boolean) {
    setUpdating(id)
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    setMsg(t(!current ? 'admin.users.activated' : 'admin.users.deactivated', lang))
    setTimeout(() => setMsg(''), 3000)
    load()
    setUpdating(null)
  }

  async function changeRole(id: string, role: string) {
    setUpdating(id)
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role }) })
    setMsg(t('admin.users.role_updated', lang))
    setTimeout(() => setMsg(''), 3000)
    load()
    setUpdating(null)
  }

  const roleBadge = (role: string) => {
    const m: Record<string, string> = { patient: 'bg-blue-50 text-blue-700', clinician: 'bg-green-50 text-green-700', admin: 'bg-purple-50 text-purple-700', superadmin: 'bg-red-50 text-red-700' }
    return m[role] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.users.title', lang)}</h1>
          <p className="text-gray-500 mt-1">{users.length} {t('admin.nav.users', lang).toLowerCase()} · {t('admin.users.subtitle', lang)}</p>
        </div>
        <Users className="w-6 h-6 text-gray-400" />
      </div>

      {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-700 rounded-lg">{msg}</div>}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
          <input className={`input w-full ${lang === 'ar' ? 'pr-9' : 'pl-9'}`} placeholder={t('admin.users.search', lang)} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">{t('admin.users.all_roles', lang)}</option>
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.users.col.name', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.users.col.role', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.users.col.status', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.users.col.joined', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.users.col.submissions', lang)}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{t('admin.users.col.actions', lang)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('admin.loading', lang)}</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('admin.users.empty', lang)}</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${updating === u.id ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.full_name_en}</p>
                  {u.full_name_ar && <p className="text-xs text-gray-400">{u.full_name_ar}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 appearance-none pr-5 cursor-pointer ${roleBadge(u.role)}`}
                    >
                      {ROLES.map(r => <option key={r} value={r} className="text-gray-900 bg-white">{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 w-fit text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {u.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {u.is_active ? t('admin.users.active', lang) : t('admin.users.inactive', lang)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{u.submission_count ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                  >
                    {u.is_active ? t('admin.users.deactivate', lang) : t('admin.users.activate', lang)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
