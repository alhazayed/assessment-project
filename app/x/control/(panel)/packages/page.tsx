'use client'

import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2, ToggleLeft, ToggleRight, X, Archive, ChevronDown, Download, Settings2, BarChart3 } from 'lucide-react'
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

interface InterpBand {
  min: number; max: number; band_en: string; band_ar: string; color: string
}

interface OutputDim {
  key: string; label_en: string; label_ar: string
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
  interpretation_bands: InterpBand[]
  output_dimensions: OutputDim[]
  package_assessments: PackageAssessment[]
}

interface PkgStat {
  package_id: string; name_en: string; category: string; color: string
  count: number; avg_score: number; min_score: number; max_score: number
}

interface Analytics {
  packageStats: PkgStat[]
  genderBreakdown: { gender: string; count: number; avg_score: number }[]
  categoryStats: { category: string; count: number; avg_score: number }[]
  totalCompleted: number
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

const BAND_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444', '#3b82f6', '#8b5cf6']

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
  const [editingScoring, setEditingScoring] = useState<string | null>(null)
  const [bands, setBands] = useState<InterpBand[]>([])
  const [dims, setDims] = useState<OutputDim[]>([])
  const [savingScoring, setSavingScoring] = useState(false)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  function openScoringEditor(pkg: Package) {
    setEditingScoring(pkg.id)
    setBands(pkg.interpretation_bands?.length
      ? [...pkg.interpretation_bands]
      : [{ min: 80, max: 100, band_en: 'High', band_ar: 'عالٍ', color: '#22c55e' },
         { min: 60, max: 79, band_en: 'Moderate', band_ar: 'معتدل', color: '#f59e0b' },
         { min: 40, max: 59, band_en: 'Developing', band_ar: 'في التطوير', color: '#f97316' },
         { min: 0,  max: 39, band_en: 'Needs Attention', band_ar: 'يحتاج اهتماماً', color: '#ef4444' }])
    setDims(pkg.output_dimensions?.length
      ? [...pkg.output_dimensions]
      : [{ key: 'dimension_1', label_en: 'Dimension 1', label_ar: 'البُعد الأول' }])
  }

  async function saveScoring(pkgId: string) {
    setSavingScoring(true)
    await fetch('/api/admin/packages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pkgId, interpretation_bands: bands, output_dimensions: dims }),
    })
    flash(isAr ? 'تم حفظ قواعد التقييم' : 'Scoring rules saved.')
    setEditingScoring(null)
    load()
    setSavingScoring(false)
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true)
    try {
      const res = await fetch('/api/admin/packages/analytics')
      const data = await res.json()
      setAnalytics(data)
    } catch { /* ignore */ }
    setAnalyticsLoading(false)
  }

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
                          title={isAr ? 'تعديل قواعد التقييم' : 'Edit Scoring Rules'}
                          onClick={() => editingScoring === pkg.id ? setEditingScoring(null) : openScoringEditor(pkg)}
                          className="transition-colors hover:text-blue-600"
                          style={{ color: editingScoring === pkg.id ? 'var(--vw-blue)' : 'var(--text-muted)' }}
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
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

                  {/* Scoring Rule Builder */}
                  {editingScoring === pkg.id && (
                    <tr key={`${pkg.id}-scoring`} style={{ backgroundColor: 'var(--page-bg)', borderBottom: '2px solid var(--vw-blue)' }}>
                      <td colSpan={6} className="px-6 py-5">
                        <div className="space-y-6">
                          {/* Interpretation Bands */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {isAr ? 'نطاقات التفسير' : 'Interpretation Bands'}
                              </p>
                              <button
                                type="button"
                                onClick={() => setBands(prev => [...prev, { min: 0, max: 0, band_en: '', band_ar: '', color: '#22c55e' }])}
                                className="text-[11px] px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
                              >
                                + {isAr ? 'نطاق' : 'Band'}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {bands.map((band, i) => (
                                <div key={i} className="grid grid-cols-[60px_60px_1fr_1fr_80px_28px] gap-2 items-center">
                                  <input type="number" className="input text-xs py-1" placeholder="Min" value={band.min}
                                    onChange={e => setBands(prev => prev.map((b, j) => j === i ? { ...b, min: +e.target.value } : b))} />
                                  <input type="number" className="input text-xs py-1" placeholder="Max" value={band.max}
                                    onChange={e => setBands(prev => prev.map((b, j) => j === i ? { ...b, max: +e.target.value } : b))} />
                                  <input className="input text-xs py-1" placeholder="Band label (EN)" value={band.band_en}
                                    onChange={e => setBands(prev => prev.map((b, j) => j === i ? { ...b, band_en: e.target.value } : b))} />
                                  <input className="input text-xs py-1" dir="rtl" placeholder="تسمية النطاق (AR)" value={band.band_ar}
                                    onChange={e => setBands(prev => prev.map((b, j) => j === i ? { ...b, band_ar: e.target.value } : b))} />
                                  <div className="flex gap-1 flex-wrap">
                                    {BAND_COLORS.map(c => (
                                      <button key={c} type="button" onClick={() => setBands(prev => prev.map((b, j) => j === i ? { ...b, color: c } : b))}
                                        className="w-4 h-4 rounded-full border-2 transition-all"
                                        style={{ backgroundColor: c, borderColor: band.color === c ? '#12273C' : 'transparent' }} />
                                    ))}
                                  </div>
                                  <button type="button" onClick={() => setBands(prev => prev.filter((_, j) => j !== i))}
                                    className="text-red-400 hover:text-red-600 flex items-center justify-center">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Output Dimensions */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {isAr ? 'أبعاد المخرجات' : 'Output Dimensions'}
                              </p>
                              <button
                                type="button"
                                onClick={() => setDims(prev => [...prev, { key: `dim_${prev.length + 1}`, label_en: '', label_ar: '' }])}
                                className="text-[11px] px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
                              >
                                + {isAr ? 'بُعد' : 'Dimension'}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {dims.map((dim, i) => (
                                <div key={i} className="grid grid-cols-[120px_1fr_1fr_28px] gap-2 items-center">
                                  <input className="input text-xs py-1 font-mono" placeholder="key_name" value={dim.key}
                                    onChange={e => setDims(prev => prev.map((d, j) => j === i ? { ...d, key: e.target.value.replace(/\s/g, '_').toLowerCase() } : d))} />
                                  <input className="input text-xs py-1" placeholder="Label (EN)" value={dim.label_en}
                                    onChange={e => setDims(prev => prev.map((d, j) => j === i ? { ...d, label_en: e.target.value } : d))} />
                                  <input className="input text-xs py-1" dir="rtl" placeholder="التسمية (AR)" value={dim.label_ar}
                                    onChange={e => setDims(prev => prev.map((d, j) => j === i ? { ...d, label_ar: e.target.value } : d))} />
                                  <button type="button" onClick={() => setDims(prev => prev.filter((_, j) => j !== i))}
                                    className="text-red-400 hover:text-red-600 flex items-center justify-center">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button onClick={() => saveScoring(pkg.id)} disabled={savingScoring} className="btn-accent text-xs px-4 py-2 disabled:opacity-50">
                              {savingScoring ? (isAr ? 'جاري الحفظ…' : 'Saving…') : (isAr ? 'حفظ قواعد التقييم' : 'Save Scoring Rules')}
                            </button>
                            <button onClick={() => setEditingScoring(null)} className="btn-ghost text-xs px-4 py-2">
                              {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
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

      {/* Analytics Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {isAr ? 'تحليلات الحزم' : 'Package Analytics'}
            </h2>
          </div>
          <button
            onClick={async () => {
              if (!showAnalytics) {
                setShowAnalytics(true)
                if (!analytics) await loadAnalytics()
              } else {
                setShowAnalytics(false)
              }
            }}
            className="text-[12px] px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: showAnalytics ? 'var(--vw-blue)' : 'var(--surface-alt)', color: showAnalytics ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--divider)' }}
          >
            {showAnalytics ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'عرض التحليلات' : 'Show Analytics')}
          </button>
        </div>

        {showAnalytics && (
          <div className="space-y-5">
            {analyticsLoading ? (
              <div className="card p-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {isAr ? 'جاري التحميل…' : 'Loading analytics…'}
              </div>
            ) : analytics ? (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--vw-blue)' }}>{analytics.totalCompleted}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{isAr ? 'نتائج مكتملة' : 'Completed Results'}</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--vw-blue)' }}>{analytics.packageStats.length}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{isAr ? 'حزم نشطة' : 'Active Packages'}</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--vw-blue)' }}>{analytics.categoryStats.length}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{isAr ? 'فئات' : 'Categories'}</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--vw-blue)' }}>
                      {analytics.packageStats.length > 0
                        ? Math.round(analytics.packageStats.reduce((s, p) => s + p.avg_score, 0) / analytics.packageStats.length)
                        : '—'}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{isAr ? 'متوسط الدرجات' : 'Avg Score'}</p>
                  </div>
                </div>

                {/* Per-package stats */}
                {analytics.packageStats.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                      <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {isAr ? 'إحصائيات الحزم' : 'Package Stats'}
                      </p>
                    </div>
                    <div className="divide-y">
                      {analytics.packageStats.map(p => {
                        const barColor = p.avg_score >= 70 ? '#22c55e' : p.avg_score >= 45 ? '#f59e0b' : '#ef4444'
                        return (
                          <div key={p.package_id} className="px-5 py-3 flex items-center gap-4" style={{ borderColor: 'var(--divider)' }}>
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name_en}</p>
                              <p className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>{p.category}</p>
                            </div>
                            <div className="text-[11px] text-right flex-shrink-0 space-y-0.5" style={{ color: 'var(--text-muted)', minWidth: 120 }}>
                              <div>{isAr ? 'المشاركون' : 'Participants'}: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.count}</span></div>
                              <div>{isAr ? 'النطاق' : 'Range'}: <span className="font-mono">{p.min_score}–{p.max_score}</span></div>
                            </div>
                            <div className="flex-shrink-0 text-center" style={{ minWidth: 56 }}>
                              <p className="text-[18px] font-extrabold" style={{ color: barColor }}>{p.avg_score}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'متوسط' : 'avg'}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Gender breakdown */}
                  {analytics.genderBreakdown.length > 0 && (
                    <div className="card overflow-hidden">
                      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {isAr ? 'توزيع الجنس' : 'Gender Breakdown'}
                        </p>
                      </div>
                      <div className="divide-y">
                        {analytics.genderBreakdown.map(g => {
                          const barColor = g.avg_score >= 70 ? '#22c55e' : g.avg_score >= 45 ? '#f59e0b' : '#ef4444'
                          const label = g.gender === 'male' ? (isAr ? 'ذكر' : 'Male')
                            : g.gender === 'female' ? (isAr ? 'أنثى' : 'Female')
                            : (isAr ? 'غير محدد' : 'Unspecified')
                          return (
                            <div key={g.gender} className="px-5 py-2.5 flex items-center justify-between gap-3" style={{ borderColor: 'var(--divider)' }}>
                              <span className="text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{g.count} {isAr ? 'مشارك' : 'participants'}</span>
                                <span className="text-[13px] font-bold" style={{ color: barColor }}>{g.avg_score}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category stats */}
                  {analytics.categoryStats.length > 0 && (
                    <div className="card overflow-hidden">
                      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {isAr ? 'إحصائيات الفئات' : 'Category Stats'}
                        </p>
                      </div>
                      <div className="divide-y">
                        {analytics.categoryStats.map(c => {
                          const barColor = c.avg_score >= 70 ? '#22c55e' : c.avg_score >= 45 ? '#f59e0b' : '#ef4444'
                          return (
                            <div key={c.category} className="px-5 py-2.5 flex items-center justify-between gap-3" style={{ borderColor: 'var(--divider)' }}>
                              <span className="text-[12.5px] capitalize" style={{ color: 'var(--text-primary)' }}>{c.category}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.count} {isAr ? 'نتيجة' : 'results'}</span>
                                <span className="text-[13px] font-bold" style={{ color: barColor }}>{c.avg_score}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {analytics.totalCompleted === 0 && (
                  <div className="card p-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {isAr ? 'لا توجد نتائج مكتملة بعد.' : 'No completed results yet.'}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
