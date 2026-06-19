'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { BarChart3, Download, AlertTriangle, Filter, TrendingUp, Hash, Sigma } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type Submission = {
  id: string; patient_name: string; assessment_name: string; code: string
  total_score: number; severity_band: string; high_risk_flag: boolean
  submitted_at: string; patient_id: string | null
}

function computeStats(scores: number[]) {
  if (!scores.length) return null
  const n = scores.length
  const sorted = [...scores].sort((a, b) => a - b)
  const avg = scores.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n
  return {
    avg: +avg.toFixed(2),
    median: +median.toFixed(2),
    stddev: +Math.sqrt(variance).toFixed(2),
    min: sorted[0],
    max: sorted[n - 1],
  }
}

function severityBadge(band: string) {
  const b = (band || '').toLowerCase()
  if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  return 'badge-severe'
}

type Pagination = { page: number; pageSize: number; total: number; totalPages: number }

export default function AdminResultsPage() {
  const lang = useLang()
  const [results, setResults] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState('')
  const [severity, setSeverity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [assessmentList, setAssessmentList] = useState<{ code: string; name: string }[]>([])
  const [exporting, setExporting] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'submitted_at' | 'total_score'>('submitted_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (assessment) params.set('assessment', assessment)
    if (severity) params.set('severity', severity)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('page', String(page))
    const res = await fetch(`/api/admin/results?${params}`)
    const data = await res.json()
    setResults(data.results || [])
    if (data.assessments) setAssessmentList(data.assessments)
    if (data.pagination) setPagination(data.pagination)
    setLoading(false)
  }, [assessment, severity, from, to, page])

  useEffect(() => { setPage(1) }, [assessment, severity, from, to])
  useEffect(() => { load() }, [load])

  async function exportCsv(format: 'detailed' | 'stats' | 'risk' = 'detailed') {
    setExporting(format)
    const params = new URLSearchParams({ format })
    if (assessment) params.set('assessment', assessment)
    if (severity) params.set('severity', severity)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (format === 'risk') params.set('severity', 'high_risk')
    const res = await fetch(`/api/admin/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = format === 'stats' ? 'stats-summary' : format === 'risk' ? 'high-risk' : 'results'
    a.download = `${suffix}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(null)
  }

  const highRiskCount = results.filter(r => r.high_risk_flag).length
  const scores = results.map(r => r.total_score)
  const stats = useMemo(() => computeStats(scores), [scores])

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      const va = sortKey === 'submitted_at' ? new Date(a.submitted_at).getTime() : a.total_score
      const vb = sortKey === 'submitted_at' ? new Date(b.submitted_at).getTime() : b.total_score
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [results, sortKey, sortDir])

  function toggleSort(key: 'submitted_at' | 'total_score') {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const severityDist = useMemo(() => {
    const m: Record<string, number> = {}
    results.forEach(r => { const b = r.severity_band || 'Unknown'; m[b] = (m[b] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [results])

  const statsCards = [
    { label: t('admin.results.count', lang), value: results.length.toLocaleString(), icon: Hash, highlight: false },
    { label: t('admin.results.mean', lang), value: stats?.avg, icon: TrendingUp, highlight: false },
    { label: t('admin.results.median', lang), value: stats?.median, icon: BarChart3, highlight: false },
    { label: t('admin.results.stddev', lang), value: stats?.stddev, icon: Sigma, highlight: false },
    { label: t('admin.results.min', lang), value: stats?.min, icon: null, highlight: false },
    { label: t('admin.results.max', lang), value: stats?.max, icon: null, highlight: false },
    { label: t('admin.results.high_risk', lang), value: `${highRiskCount} (${results.length ? ((highRiskCount / results.length) * 100).toFixed(1) : 0}%)`, icon: AlertTriangle, highlight: highRiskCount > 0 },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.results.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {results.length.toLocaleString()} results · {highRiskCount} {t('admin.results.high_risk_flags', lang)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCsv('stats')} disabled={!!exporting || results.length === 0}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-40 text-sm">
            <Sigma className="w-4 h-4" />
            {exporting === 'stats' ? t('admin.results.exporting', lang) : t('admin.results.export_stats', lang)}
          </button>
          <button onClick={() => exportCsv('risk')} disabled={!!exporting || highRiskCount === 0}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-40 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {exporting === 'risk' ? t('admin.results.exporting', lang) : t('admin.results.export_risk', lang)}
          </button>
          <button onClick={() => exportCsv('detailed')} disabled={!!exporting || results.length === 0}
            className="btn-accent flex items-center gap-1.5 disabled:opacity-40 text-sm">
            <Download className="w-4 h-4" />
            {exporting === 'detailed' ? t('admin.results.exporting', lang) : t('admin.results.export_csv', lang)}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        <select className="input flex-1 min-w-36 text-sm" value={assessment} onChange={e => setAssessment(e.target.value)}>
          <option value="">{t('admin.results.all_assessments', lang)}</option>
          {assessmentList.map(a => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
        </select>
        <select className="input text-sm w-40" value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">{t('admin.results.all_severities', lang)}</option>
          <option value="high_risk">{t('admin.results.high_risk_only', lang)}</option>
          <option value="minimal">{t('admin.results.minimal', lang)}</option>
          <option value="mild">{t('admin.results.mild', lang)}</option>
          <option value="moderate">{t('admin.results.moderate', lang)}</option>
          <option value="severe">{t('admin.results.severe', lang)}</option>
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className="input text-sm w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="date" className="input text-sm w-36" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {(assessment || severity || from || to) && (
          <button onClick={() => { setAssessment(''); setSeverity(''); setFrom(''); setTo('') }}
            className="text-[12.5px] hover:underline" style={{ color: 'var(--text-muted)' }}>
            {t('admin.results.clear', lang)}
          </button>
        )}
      </div>

      {/* Stats summary bar */}
      {!loading && stats && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {statsCards.map(s => (
            <div key={s.label} className={`card px-4 py-3 ${s.highlight ? 'border-red-200' : ''}`}
              style={s.highlight ? { backgroundColor: '#FEF2F2' } : undefined}>
              <p className="text-[11px] mb-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className={`text-base font-bold ${s.highlight ? 'text-red-700' : ''}`}
                style={!s.highlight ? { color: 'var(--text-primary)' } : undefined}>{s.value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Severity distribution */}
      {!loading && severityDist.length > 0 && results.length > 0 && (
        <div className="card p-4 mb-4 flex items-center gap-6 flex-wrap">
          <span className="text-[12px] font-semibold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('admin.results.severity_mix', lang)}</span>
          {severityDist.map(([band, cnt]) => (
            <div key={band} className="flex items-center gap-1.5">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${severityBadge(band)}`}>{band}</span>
              <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{cnt} ({results.length ? ((cnt / results.length) * 100).toFixed(1) : 0}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.results.col.patient', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.results.col.assessment', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide cursor-pointer hover:text-brand-600 select-none" style={{ color: 'var(--text-muted)' }}
                onClick={() => toggleSort('total_score')}>
                {t('admin.results.col.score', lang)} {sortKey === 'total_score' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.results.col.severity', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.results.col.risk', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide cursor-pointer hover:text-brand-600 select-none" style={{ color: 'var(--text-muted)' }}
                onClick={() => toggleSort('submitted_at')}>
                {t('admin.results.col.date', lang)} {sortKey === 'submitted_at' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.loading', lang)}</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.results.empty', lang)}</td></tr>
            ) : sorted.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td className="px-4 py-3 text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{r.patient_name || t('admin.anonymous', lang)}</td>
                <td className="px-4 py-3">
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{r.assessment_name}</span>
                  <span className="ml-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>({r.code})</span>
                </td>
                <td className="px-4 py-3 text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{r.total_score}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${severityBadge(r.severity_band)}`}>{r.severity_band}</span>
                </td>
                <td className="px-4 py-3">
                  {r.high_risk_flag && (
                    <span className="flex items-center gap-1 text-red-600 text-[11.5px] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />{t('admin.results.high_risk', lang)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[12.5px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{new Date(r.submitted_at).toLocaleDateString()}</td>
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
            {t('admin.results.showing', lang)} {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('admin.results.of', lang)} {pagination.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || loading}
              className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← {t('admin.results.prev', lang)}
            </button>
            <span className="text-[12.5px] px-2" style={{ color: 'var(--text-secondary)' }}>
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('admin.results.next', lang)} →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
