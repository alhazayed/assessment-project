'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type Announcement = {
  id: string; title_en: string; title_ar: string; body_en: string; body_ar: string
  type: string; target_roles: string[]; is_active: boolean; is_dismissible: boolean
  starts_at: string | null; ends_at: string | null; created_at: string
}

const ROLES = ['patient', 'clinician', 'admin', 'superadmin']
const TYPES = ['info', 'warning', 'success', 'error']

const defaultForm = { title_en: '', title_ar: '', body_en: '', body_ar: '', type: 'info', target_roles: [] as string[], is_dismissible: true, starts_at: '', ends_at: '' }

const typeBadgeClass = (type: string) => ({
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-yellow-50 text-yellow-700',
  success: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-700',
}[type] || 'bg-gray-100 text-gray-600')

export default function AdminAnnouncementsPage() {
  const lang = useLang()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/announcements')
    const data = await res.json()
    setAnnouncements(data.announcements || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    flash(t('admin.announcements.created', lang))
    setShowForm(false); setForm(defaultForm); load()
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/announcements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    flash(t(!current ? 'admin.announcements.activated' : 'admin.announcements.deactivated', lang))
    load()
  }

  async function remove(id: string) {
    if (!confirm(t('admin.announcements.confirm_delete', lang))) return
    await fetch('/api/admin/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    flash(t('admin.announcements.deleted', lang))
    load()
  }

  function toggleRole(role: string) {
    setForm(p => ({ ...p, target_roles: p.target_roles.includes(role) ? p.target_roles.filter(r => r !== role) : [...p.target_roles, role] }))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.announcements.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('admin.announcements.subtitle', lang)}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-accent flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />{t('admin.announcements.new', lang)}
        </button>
      </div>

      {msg && <div className="mb-5 alert-success">{msg}</div>}

      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.announcements.form.title', lang)}</h2>
            <button onClick={() => { setShowForm(false); setForm(defaultForm) }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-alt)] transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin.announcements.form.title_en', lang)}</label>
                <input className="input" required value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('admin.announcements.form.title_ar', lang)}</label>
                <input className="input" dir="rtl" value={form.title_ar} onChange={e => setForm(p => ({ ...p, title_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin.announcements.form.body_en', lang)}</label>
                <textarea className="input resize-none" rows={3} value={form.body_en} onChange={e => setForm(p => ({ ...p, body_en: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('admin.announcements.form.body_ar', lang)}</label>
                <textarea className="input resize-none" rows={3} dir="rtl" value={form.body_ar} onChange={e => setForm(p => ({ ...p, body_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">{t('admin.announcements.form.type', lang)}</label>
                <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {TYPES.map(tp => <option key={tp} value={tp} className="capitalize">{tp}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('admin.announcements.form.starts_at', lang)}</label>
                <input type="datetime-local" className="input" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('admin.announcements.form.ends_at', lang)}</label>
                <input type="datetime-local" className="input" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">{t('admin.announcements.form.target_roles', lang)}</label>
              <div className="flex gap-2 mt-1.5">
                {ROLES.map(r => (
                  <button key={r} type="button" onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors capitalize ${
                      form.target_roles.includes(r)
                        ? 'text-white'
                        : 'hover:opacity-80'
                    }`}
                    style={form.target_roles.includes(r)
                      ? { backgroundColor: 'var(--vw-blue)' }
                      : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    }>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dismissible" checked={form.is_dismissible} onChange={e => setForm(p => ({ ...p, is_dismissible: e.target.checked }))}
                className="rounded" style={{ accentColor: 'var(--vw-blue)' }} />
              <label htmlFor="dismissible" className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{t('admin.announcements.form.dismissible', lang)}</label>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm) }} className="btn-ghost text-sm">
                {t('admin.announcements.form.cancel', lang)}
              </button>
              <button type="submit" disabled={saving} className="btn-accent text-sm disabled:opacity-50">
                {saving ? t('admin.announcements.form.saving', lang) : t('admin.announcements.form.create', lang)}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.loading', lang)}</p>
        ) : announcements.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--surface-alt)' }}>
              <Megaphone className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.announcements.empty', lang)}</p>
          </div>
        ) : announcements.map(a => (
          <div key={a.id} className={`card p-5 ${!a.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[11.5px] px-2 py-0.5 rounded-full font-medium capitalize ${typeBadgeClass(a.type)}`}>{a.type}</span>
                  {a.target_roles?.map(r => (
                    <span key={r} className="text-[11px] px-1.5 py-0.5 rounded capitalize" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)' }}>{r}</span>
                  ))}
                  {!a.is_active && <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{t('admin.announcements.inactive', lang)}</span>}
                </div>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{a.title_en}</p>
                {a.title_ar && <p className="text-[13px] text-right mt-0.5" dir="rtl" style={{ color: 'var(--text-muted)' }}>{a.title_ar}</p>}
                <p className="text-[13px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>{a.body_en}</p>
                <p className="text-[11.5px] mt-2" style={{ color: 'var(--text-muted)' }}>Created {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(a.id, a.is_active)}>
                  {a.is_active
                    ? <ToggleRight className="w-7 h-7" style={{ color: 'var(--vw-blue)' }} />
                    : <ToggleLeft className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />}
                </button>
                <button onClick={() => remove(a.id)} className="transition-colors hover:text-red-500" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
