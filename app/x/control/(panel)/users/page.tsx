'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Search, CheckCircle, XCircle, ChevronDown, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type User = {
  id: string; full_name_en: string; full_name_ar: string | null; role: string
  is_active: boolean; created_at: string; language_preference: string
  submission_count?: number
}

type DeletePreview = {
  user: { id: string; full_name_en: string; full_name_ar: string | null; role: string }
  willDelete: Record<string, number>
  totalRecords: number
}

const ROLES = ['patient', 'clinician', 'admin', 'superadmin']

const roleBadgeClass = (role: string) => {
  const m: Record<string, string> = {
    patient: 'bg-blue-50 text-blue-700',
    clinician: 'bg-green-50 text-green-700',
    admin: 'bg-purple-50 text-purple-700',
    superadmin: 'bg-red-50 text-red-700',
  }
  return m[role] || 'bg-gray-100 text-gray-600'
}

export default function AdminUsersPage() {
  const lang = useLang()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [msgError, setMsgError] = useState(false)
  const [callerRole, setCallerRole] = useState('')

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [preview, setPreview] = useState<DeletePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft')
  const [reason, setReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}`)
    const data = await res.json()
    setUsers(data.users || [])
    setCallerRole(data.callerRole || '')
    setLoading(false)
  }, [search, roleFilter])

  useEffect(() => { load() }, [load])

  async function toggleActive(id: string, current: boolean) {
    setUpdating(id)
    const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    setMsgError(!res.ok)
    setMsg(res.ok ? t(!current ? 'admin.users.activated' : 'admin.users.deactivated', lang) : 'Failed to update user')
    setTimeout(() => setMsg(''), 4000)
    load()
    setUpdating(null)
  }

  async function changeRole(id: string, role: string) {
    setUpdating(id)
    const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role }) })
    if (res.ok) {
      setMsgError(false)
      setMsg(t('admin.users.role_updated', lang))
    } else {
      const data = await res.json().catch(() => ({}))
      setMsgError(true)
      setMsg(data.error || 'Failed to update role')
    }
    setTimeout(() => setMsg(''), 4000)
    load()
    setUpdating(null)
  }

  async function openDelete(u: User) {
    setDeleteTarget(u)
    setDeleteMode('soft')
    setReason('')
    setPreview(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/delete-user?userId=${u.id}`)
      if (res.ok) setPreview(await res.json())
    } catch { /* preview is best-effort */ }
    setPreviewLoading(false)
  }

  function closeDelete() {
    setDeleteTarget(null)
    setPreview(null)
    setReason('')
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: deleteTarget.id,
          hardDelete: deleteMode === 'hard',
          reason: reason.trim() || (deleteMode === 'hard' ? 'Administrative hard delete' : 'Administrative soft delete'),
        }),
      })
      const data = await res.json().catch(() => ({}))
      setMsgError(!res.ok)
      if (res.ok) {
        setMsg(
          deleteMode === 'hard'
            ? (lang === 'ar' ? 'تم حذف المستخدم وبياناته نهائياً' : 'User and all their data permanently deleted')
            : (lang === 'ar' ? 'تم تعطيل المستخدم' : 'User deactivated')
        )
        closeDelete()
      } else {
        setMsg(data.error || 'Failed to delete user')
      }
      setTimeout(() => setMsg(''), 5000)
      load()
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = (u: User) => callerRole === 'superadmin' && u.role !== 'superadmin'

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.users.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {users.length} {t('admin.nav.users', lang).toLowerCase()} · {t('admin.users.subtitle', lang)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
          <Users className="w-5 h-5 text-brand-600" />
        </div>
      </div>

      {msg && (
        <div className={`mb-5 ${msgError ? 'alert-error' : 'alert-success'}`}>{msg}</div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${lang === 'ar' ? 'right-3' : 'left-3'}`} style={{ color: 'var(--text-muted)' }} />
          <input className={`input w-full ${lang === 'ar' ? 'pr-9' : 'pl-9'}`} placeholder={t('admin.users.search', lang)} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">{t('admin.users.all_roles', lang)}</option>
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.users.col.name', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.users.col.role', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.users.col.status', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.users.col.joined', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.users.col.submissions', lang)}</th>
              <th className="text-right px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.users.col.actions', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.loading', lang)}</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.users.empty', lang)}</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={updating === u.id ? 'opacity-50' : ''} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td className="px-4 py-3">
                  <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{u.full_name_en}</p>
                  {u.full_name_ar && <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{u.full_name_ar}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 appearance-none pr-5 cursor-pointer ${roleBadgeClass(u.role)}`}
                    >
                      {ROLES.map(r => <option key={r} value={r} className="text-gray-900 bg-white">{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 w-fit text-[12px] font-medium ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {u.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {u.is_active ? t('admin.users.active', lang) : t('admin.users.inactive', lang)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{u.submission_count ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleActive(u.id, u.is_active)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      {u.is_active ? t('admin.users.deactivate', lang) : t('admin.users.activate', lang)}
                    </button>
                    {canDelete(u) && (
                      <button
                        onClick={() => openDelete(u)}
                        title={lang === 'ar' ? 'حذف المستخدم' : 'Delete user'}
                        aria-label={lang === 'ar' ? 'حذف المستخدم' : 'Delete user'}
                        className="text-xs p-1.5 rounded-lg font-medium transition-colors bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeDelete}
        >
          <div
            className="card w-full max-w-md p-6"
            style={{ backgroundColor: 'var(--surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? 'حذف المستخدم' : 'Delete user'}
                  </h2>
                  <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    {lang === 'ar' ? deleteTarget.full_name_ar || deleteTarget.full_name_en : deleteTarget.full_name_en}
                  </p>
                </div>
              </div>
              <button onClick={closeDelete} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview of affected data */}
            <div className="rounded-lg p-3 mb-4 text-[13px]" style={{ backgroundColor: 'var(--surface-alt)' }}>
              {previewLoading ? (
                <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {lang === 'ar' ? 'جارٍ حساب البيانات المتأثرة...' : 'Calculating affected data…'}
                </span>
              ) : preview ? (
                <div style={{ color: 'var(--text-secondary)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? 'البيانات المرتبطة' : 'Associated data'} · {preview.totalRecords}
                  </p>
                  <ul className="space-y-0.5">
                    {Object.entries(preview.willDelete).map(([k, v]) => (
                      <li key={k} className="flex justify-between">
                        <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>
                  {lang === 'ar' ? 'تعذّر تحميل المعاينة' : 'Preview unavailable'}
                </span>
              )}
            </div>

            {/* Mode selection */}
            <div className="space-y-2 mb-4">
              <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border ${deleteMode === 'soft' ? 'border-brand-400' : ''}`} style={{ borderColor: deleteMode === 'soft' ? '#1D6296' : 'var(--divider)' }}>
                <input type="radio" name="delmode" checked={deleteMode === 'soft'} onChange={() => setDeleteMode('soft')} className="mt-0.5" />
                <div>
                  <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? 'حذف ناعم (موصى به)' : 'Soft delete (recommended)'}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {lang === 'ar' ? 'تعطيل الحساب مع الاحتفاظ بالبيانات. قابل للعكس.' : 'Deactivate the account, keep data. Reversible.'}
                  </p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border`} style={{ borderColor: deleteMode === 'hard' ? '#C02A2A' : 'var(--divider)' }}>
                <input type="radio" name="delmode" checked={deleteMode === 'hard'} onChange={() => setDeleteMode('hard')} className="mt-0.5" />
                <div>
                  <p className="text-[13.5px] font-semibold text-red-600">
                    {lang === 'ar' ? 'حذف نهائي' : 'Hard delete'}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {lang === 'ar' ? 'إزالة المستخدم وكل بياناته نهائياً. لا يمكن التراجع.' : 'Permanently remove the user and all their data. Cannot be undone.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Reason */}
            <input
              className="input w-full mb-4"
              placeholder={lang === 'ar' ? 'سبب الحذف (اختياري)' : 'Reason (optional)'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="flex gap-3">
              <button onClick={closeDelete} className="btn-secondary flex-1" disabled={deleting}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: deleteMode === 'hard' ? '#C02A2A' : '#1D6296' }}
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteMode === 'hard'
                  ? (lang === 'ar' ? 'حذف نهائي' : 'Delete permanently')
                  : (lang === 'ar' ? 'تعطيل' : 'Deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
