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

function severityColor(band: string) {
  const b = (band || '').toLowerCase()
  if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return 'bg-green-100 text-green-700'
  if (b.includes('mild')) return 'bg-yellow-100 text-yellow-700'
  if (b.includes('moderate')) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

export default function AdminResultsPage() {
  const lang = useLang()
  const [results, setResults] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState('')
  const [severity, setSeverity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
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
    const res = await fetch(`/api/admin/results?${params}`)
    const data = await res.json()
    setResults(data.results || [])
    if (data.assessments) setAssessmentList(data.assessments)
    setLoading(false)
  }, [assessment, severity, from, to])

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
    { label: t('admin.results.count', lang), value: results.length.toLocaleString(), icon: Hash },
    { label: t('admin.results.mean', lang), value: stats?.avg, icon: TrendingUp },
    { label: t('admin.results.median', lang), value: stats?.median, icon: BarChart3 },
    { label: t('admin.results.stddev', lang), value: stats?.stddev, icon: Sigma },
    { label: t('admin.results.min', lang), value: stats?.min, icon: null },
    { label: t('admin.results.max', lang), value: stats?.max, icon: null },
    {
      label: t('admin.results.high_risk', lang),
      value: `${highRiskCount} (${results.length ? ((highRiskCount / results.length) * 100).toFixed(1) : 0}%)`,
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.results.title', lang)}</h1>
          <p className="text-gray-500 mt-1">{results.length.toLocaleString()} results · {highRiskCount} {t('admin.results.high_risk_flags', lang)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCsv('stats')} disabled={!!exporting || results.length === 0}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Sigma className="w-4 h-4" />
            {exporting === 'stats' ? t('admin.results.exporting', lang) : t('admin.results.export_stats', lang)}
          </button>
          <button onClick={() => exportCsv('risk')} disabled={!!exporting || highRiskCount === 0}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <AlertTriangle className="w-4 h-4" />
            {exporting === 'risk' ? t('admin.results.exporting', lang) : t('admin.results.export_risk', lang)}
          </button>
          <button onClick={() => exportCsv('detailed')} disabled={!!exporting || results.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            {exporting === 'detailed' ? t('admin.results.exporting', lang) : t('admin.results.export_csv', lang)}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select className="input flex-1 min-w-36 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={assessment} onChange={e => setAssessment(e.target.value)}>
          <option value="">{t('admin.results.all_assessments', lang)}</option>
          {assessmentList.map(a => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
        </select>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
          value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">{t('admin.results.all_severities', lang)}</option>
          <option value="high_risk">{t('admin.results.high_risk_only', lang)}</option>
          <option value="minimal">{t('admin.results.minimal', lang)}</option>
          <option value="mild">{t('admin.results.mild', lang)}</option>
          <option value="moderate">{t('admin.results.moderate', lang)}</option>
          <option value="severe">{t('admin.results.severe', lang)}</option>
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
            value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">–</span>
          <input type="date" className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
            value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {(assessment || severity || from || to) && (
          <button onClick={() => { setAssessment(''); setSeverity(''); setFrom(''); setTo('') }}
            className="text-sm text-gray-400 hover:text-gray-600 px-2">
            {t('admin.results.clear', lang)}
          </button>
        )}
      </div>

      {/* Stats summary bar */}
      {!loading && stats && results.length > 0 && (
        <div className="grid grid-cols-7 gap-3 mb-4">
          {statsCards.map(s => (
            <div key={s.label} className={`bg-white border rounded-xl px-4 py-3 ${s.label === t('admin.results.high_risk', lang) && highRiskCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-lg font-bold ${s.label === t('admin.results.high_risk', lang) && highRiskCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Severity distribution for current filter */}
      {!loading && severityDist.length > 0 && results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-6 flex-wrap">
          <span className="text-xs font-medium text-gray-500 flex-shrink-0">{t('admin.results.severity_mix', lang)}</span>
          {severityDist.map(([band, cnt]) => (
            <div key={band} className="flex items-center gap-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(band)}`}>{band}</span>
              <span className="text-xs text-gray-500">{cnt} ({results.length ? ((cnt / results.length) * 100).toFixed(1) : 0}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.results.col.patient', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.results.col.assessment', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort('total_score')}>
                {t('admin.results.col.score', lang)} {sortKey === 'total_score' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.results.col.severity', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.results.col.risk', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => toggleSort('submitted_at')}>
                {t('admin.results.col.date', lang)} {sortKey === 'submitted_at' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('admin.loading', lang)}</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('admin.results.empty', lang)}</td></tr>
            ) : sorted.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-gray-800">{r.patient_name || t('admin.anonymous', lang)}</td>
                <td className="px-4 py-3">
                  <span className="text-gray-700">{r.assessment_name}</span>
                  <span className="ml-1 text-xs text-gray-400">({r.code})</span>
                </td>
                <td className="px-4 py-3 font-bold text-gray-900">{r.total_score}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(r.severity_band)}`}>{r.severity_band}</span>
                </td>
                <td className="px-4 py-3">
                  {r.high_risk_flag && (
                    <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />{t('admin.results.high_risk', lang)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(r.submitted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
