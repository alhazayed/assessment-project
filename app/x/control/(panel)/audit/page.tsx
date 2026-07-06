'use client'

import { useEffect, useState, useCallback } from 'react'
import { ScrollText, Search, Filter, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type AuditLog = {
  id: string
  action: string
  target_type: string | null
  target_id: string | null
  reason: string | null
  created_at: string
  profiles?: { full_name_en: string | null; role: string | null } | null
}

type Pagination = { page: number; pageSize: number; total: number; totalPages: number }

export default function AdminAuditPage() {
  const lang = useLang()
  const tr = (en: string, ar: string) => (lang === 'ar' ? ar : en)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [callerRole, setCallerRole] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [targetTypes, setTargetTypes] = useState<string[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  // Mutations
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [purgeBefore, setPurgeBefore] = useState('')
  const [purging, setPurging] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgError, setMsgError] = useState(false)

  const canDelete = callerRole === 'superadmin'

  const flash = (text: string, error = false) => {
    setMsg(text); setMsgError(error)
    setTimeout(() => setMsg(''), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (action) params.set('action', action)
    if (targetType) params.set('targetType', targetType)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('page', String(page))
    const res = await fetch(`/api/admin/audit?${params}`)
    const data = await res.json()
    setLogs(data.logs || [])
    if (data.filters) { setActions(data.filters.actions || []); setTargetTypes(data.filters.targetTypes || []) }
    if (data.pagination) setPagination(data.pagination)
    if (data.callerRole !== undefined) setCallerRole(data.callerRole || '')
    setLoading(false)
  }, [search, action, targetType, from, to, page])

  useEffect(() => { setPage(1) }, [search, action, targetType, from, to])
  useEffect(() => { load() }, [load])

  async function deleteEntry(log: AuditLog) {
    if (!confirm(tr(
      `Delete this audit entry?\n${log.action} · ${new Date(log.created_at).toLocaleString()}\nThis cannot be undone.`,
      `حذف هذا السجل؟\n${log.action} · ${new Date(log.created_at).toLocaleString()}\nلا يمكن التراجع.`))) return
    setDeletingId(log.id)
    try {
      const res = await fetch('/api/admin/audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: log.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { flash(tr('Audit entry deleted', 'تم حذف السجل')); setLogs(prev => prev.filter(l => l.id !== log.id)) }
      else flash(data.error || 'Failed to delete entry', true)
    } finally {
      setDeletingId(null)
    }
  }

  async function purgeOld() {
    if (!purgeBefore) { flash(tr('Pick a date first', 'اختر تاريخاً أولاً'), true); return }
    if (!confirm(tr(
      `Permanently delete ALL audit entries before ${purgeBefore}? This cannot be undone.`,
      `حذف جميع السجلات قبل ${purgeBefore} نهائياً؟ لا يمكن التراجع.`))) return
    setPurging(true)
    try {
      const res = await fetch('/api/admin/audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ before: purgeBefore }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { flash(tr(`Purged ${data.deletedCount} entries`, `تم حذف ${data.deletedCount} سجلاً`)); setPurgeBefore(''); load() }
      else flash(data.error || 'Failed to purge', true)
    } finally {
      setPurging(false)
    }
  }

  const hasFilters = search || action || targetType || from || to

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.audit.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {pagination ? `${pagination.total.toLocaleString()} ${tr('entries', 'سجل')} · ` : ''}{t('admin.audit.subtitle', lang)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
          <ScrollText className="w-5 h-5 text-brand-600" />
        </div>
      </div>

      {msg && <div className={`mb-4 ${msgError ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        <div className="relative flex-1 min-w-44">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${lang === 'ar' ? 'right-3' : 'left-3'}`} style={{ color: 'var(--text-muted)' }} />
          <input className={`input w-full text-sm ${lang === 'ar' ? 'pr-9' : 'pl-9'}`} placeholder={tr('Search action or reason', 'ابحث في الإجراء أو السبب')}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-44" value={action} onChange={e => setAction(e.target.value)}>
          <option value="">{tr('All actions', 'كل الإجراءات')}</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="input text-sm w-40" value={targetType} onChange={e => setTargetType(e.target.value)}>
          <option value="">{tr('All targets', 'كل الأهداف')}</option>
          {targetTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className="input text-sm w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="date" className="input text-sm w-36" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setAction(''); setTargetType(''); setFrom(''); setTo('') }}
            className="text-[12.5px] hover:underline" style={{ color: 'var(--text-muted)' }}>
            {tr('Clear', 'مسح')}
          </button>
        )}
      </div>

      {/* Purge old (superadmin) */}
      {canDelete && (
        <div className="card p-4 mb-4 flex flex-wrap items-center gap-3" style={{ borderColor: 'rgba(192,42,42,0.2)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {tr('Purge entries older than', 'حذف السجلات الأقدم من')}
          </span>
          <input type="date" className="input text-sm w-40" value={purgeBefore} onChange={e => setPurgeBefore(e.target.value)} />
          <button onClick={purgeOld} disabled={purging || !purgeBefore}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 flex items-center gap-1.5">
            {purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {tr('Purge', 'حذف')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.actor', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.action', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.target', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.reason', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.col.timestamp', lang)}</th>
              {canDelete && <th className="text-right px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{tr('Actions', 'إجراءات')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canDelete ? 6 : 5} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.loading', lang)}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={canDelete ? 6 : 5} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.audit.empty', lang)}</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className={deletingId === log.id ? 'opacity-50' : ''} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td className="px-4 py-3">
                  <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{log.profiles?.full_name_en || '—'}</p>
                  <p className="text-[11.5px] capitalize" style={{ color: 'var(--text-muted)' }}>{log.profiles?.role}</p>
                </td>
                <td className="px-4 py-3">
                  <code className="text-[11.5px] font-mono px-2 py-0.5 rounded-[4px]"
                    style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{log.action}</code>
                </td>
                <td className="px-4 py-3 text-[12.5px] capitalize" style={{ color: 'var(--text-secondary)' }}>{log.target_type || '—'}</td>
                <td className="px-4 py-3 text-[12px] max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>{log.reason || '—'}</td>
                <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                {canDelete && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteEntry(log)} disabled={deletingId === log.id}
                      title={tr('Delete entry', 'حذف السجل')} aria-label={tr('Delete entry', 'حذف السجل')}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50">
                      {deletingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} {tr('of', 'من')} {pagination.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1 || loading}
              className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed">← {tr('Prev', 'السابق')}</button>
            <span className="text-[12.5px] px-2" style={{ color: 'var(--text-secondary)' }}>{pagination.page} / {pagination.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed">{tr('Next', 'التالي')} →</button>
          </div>
        </div>
      )}
    </div>
  )
}
