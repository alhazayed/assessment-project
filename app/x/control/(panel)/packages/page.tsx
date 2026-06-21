'use client'

import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2, ToggleLeft, ToggleRight, X, Archive, ChevronDown, Download } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

interface PackageAssessment {
  id: string
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  is_available: boolean
  sort_order: number
}

interface Package {
  id: string
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  category: string
  status: string
  color: string
  index_name_en: string | null
  index_name_ar: string | null
  is_prototype: boolean
  updated_at: string
  package_assessments: PackageAssessment[]
}

const CATEGORIES = ['general', 'marriage', 'employment', 'leadership', 'academic']
const STATUSES = ['draft', 'active', 'archived']
const COLORS = ['#7C3AED', '#0369A1', '#D97706', '#059669', '#1D6296', '#DC2626', '#DB2777']

const defaultForm = {
  name_en: '', name_ar: '',
  description_en: '', description_ar: '',
  purpose_en: '', purpose_ar: '',
  category: 'general',
  status: 'draft',
  color: '#1D6296',
  index_name_en: '', index_name_ar: '',
}

const statusBadge = (s: string) => ({
  active:   'bg-green-50 text-green-700 border-green-200',
  draft:    'bg-gray-100 text-gray-600 border-gray-200',
  archived: 'bg-amber-50 text-amber-700 border-amber-200',
}[s] || 'bg-gray-100 text-gray-600 border-gray-200')

export default function AdminPackagesPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/packages')
      const data = await res.json()
      setPackages(data.packages || [])
    } catch {
      setPackages([])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/admin/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    flash(t('admin.packages.created', lang))
    setShowForm(false); setForm(defaultForm); load()
    setSaving(false)
  }

  async function setStatus(id: string, status: string) {
    await fetch('/api/admin/packages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    const key = status === 'active' ? 'admin.packages.activated'
      : status === 'archived' ? 'admin.packages.deactivated'
      : 'admin.packages.updated'
    flash(t(key, lang))
    load()
  }

  async function remove(id: string) {
    if (!confirm(t('admin.packages.confirm_delete', lang))) return
    await fetch('/api/admin/packages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    flash(t('admin.packages.deleted', lang))
    load()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.packages.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.packages.subtitle', lang)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-50">
            <Layers className="w-5 h-5 text-brand-600" />
          </div>
          <a
            href="/api/admin/packages/export"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
            download
          >
            <Download className="w-4 h-4" />{t('admin.packages.export_results', lang)}
          </a>
          <button onClick={() => setShowForm(true)} className="btn-accent flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />{t('admin.packages.create', lang)}
          </button>
        </div>
      </div>

      {msg && <div className="mb-5 alert-success">{msg}</div>}

      {/* Create Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('admin.packages.form.title', lang)}
            </h2>
            <button
              onClick={() => { setShowForm(false); setForm(defaultForm) }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-alt)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin.packages.form.name_en', lang)}</label>
                <input className="input" required value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('admin.packages.form.name_ar', lang)}</label>
                <input className="input" dir="rtl" required value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin.packages.form.desc_en', lang)}</label>
                <textarea className="input resize-none" rows={3} value={form.description_en} onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('admin.packages.form.desc_ar', lang)}</label>
                <textarea className="input resize-none" rows={3} dir="rtl" value={form.description_ar} onChange={e => setForm(p => ({ ...p, description_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin.packages.form.index_en', lang)}</label>
                <input className="input" placeholder="e.g. Marriage Readiness Index" value={form.index_name_en} onChange={e => setForm(p => ({ ...p, index_name_en: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('admin.packages.form.index_ar', lang)}</label>
                <input className="input" dir="rtl" placeholder="مثال: مؤشر الاستعداد للزواج" value={form.index_name_ar} onChange={e => setForm(p => ({ ...p, index_name_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">{t('admin.packages.form.category', lang)}</label>
                <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('admin.packages.form.status', lang)}</label>
                <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: form.color === c ? '#12273C' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm) }} className="btn-ghost text-sm">
                {t('admin.packages.form.cancel', lang)}
              </button>
              <button type="submit" disabled={saving} className="btn-accent text-sm disabled:opacity-50">
                {saving ? t('admin.packages.form.saving', lang) : t('admin.packages.form.save', lang)}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Packages List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
                {(['admin.packages.col.name', 'admin.packages.col.category', 'admin.packages.col.assessments', 'admin.packages.col.status', 'admin.packages.col.updated', 'admin.packages.col.actions'] as const).map(key => (
                  <th key={key} className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {t(key, lang)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Layers className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.packages.empty', lang)}</p>
                  </td>
                </tr>
              ) : packages.map(pkg => (
                <>
                  <tr key={pkg.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pkg.color }} />
                        <div>
                          <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{pkg.name_en}</p>
                          <p className="text-[12px]" dir="rtl" style={{ color: 'var(--text-muted)' }}>{pkg.name_ar}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] capitalize" style={{ color: 'var(--text-secondary)' }}>
                      {pkg.category}
                      {pkg.is_prototype && (
                        <span className="ms-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)' }}>
                          {t('admin.packages.prototype', lang)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(expanded === pkg.id ? null : pkg.id)}
                        className="flex items-center gap-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}
                      >
                        {pkg.package_assessments?.length || 0} scales
                        <ChevronDown className={`w-3 h-3 transition-transform ${expanded === pkg.id ? 'rotate-180' : ''}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11.5px] px-2 py-0.5 rounded-full border font-medium ${statusBadge(pkg.status)}`}>
                        {t(`admin.packages.status.${pkg.status}` as Parameters<typeof t>[0], lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(pkg.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          title={pkg.status === 'active' ? t('admin.packages.deactivate', lang) : t('admin.packages.activate', lang)}
                          onClick={() => setStatus(pkg.id, pkg.status === 'active' ? 'draft' : 'active')}
                        >
                          {pkg.status === 'active'
                            ? <ToggleRight className="w-6 h-6" style={{ color: 'var(--vw-blue)' }} />
                            : <ToggleLeft className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />}
                        </button>
                        <button
                          title={t('admin.packages.archive', lang)}
                          onClick={() => setStatus(pkg.id, 'archived')}
                          className="transition-colors hover:text-amber-500"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          title={t('admin.packages.delete', lang)}
                          onClick={() => remove(pkg.id)}
                          className="transition-colors hover:text-red-500"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === pkg.id && pkg.package_assessments?.length > 0 && (
                    <tr key={`${pkg.id}-expand`} style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
                      <td colSpan={6} className="px-6 py-3">
                        <div className="flex flex-wrap gap-2">
                          {[...pkg.package_assessments].sort((a, b) => a.sort_order - b.sort_order).map(a => (
                            <div key={a.id} className="flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--page-bg)', border: '1px solid var(--divider)', color: 'var(--text-secondary)' }}>
                              <span className={`w-1.5 h-1.5 rounded-full ${a.is_available ? 'bg-green-500' : 'bg-gray-300'}`} />
                              {a.name_en}
                              <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.weight_pct}%</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {isAr ? 'مقياس متاح' : 'Scale available'}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          {isAr ? 'قيد الإضافة' : 'Pending integration'}
        </div>
      </div>
    </div>
  )
}
