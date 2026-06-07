'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, Download, AlertTriangle, Filter } from 'lucide-react'

type Submission = {
  id: string; patient_name: string; assessment_name: string; code: string
  total_score: number; severity_band: string; high_risk_flag: boolean
  submitted_at: string; patient_id: string | null
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState('')
  const [severity, setSeverity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [assessmentList, setAssessmentList] = useState<{ code: string; name: string }[]>([])
  const [exporting, setExporting] = useState(false)

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

  async function exportCsv() {
    setExporting(true)
    const params = new URLSearchParams()
    if (assessment) params.set('assessment', assessment)
    if (severity) params.set('severity', severity)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/admin/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  function severityColor(band: string) {
    const b = (band || '').toLowerCase()
    if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return 'bg-green-100 text-green-700'
    if (b.includes('mild')) return 'bg-yellow-100 text-yellow-700'
    if (b.includes('moderate')) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const highRiskCount = results.filter(r => r.high_risk_flag).length

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Results</h1>
          <p className="text-gray-500 mt-1">{results.length} results · {highRiskCount} high-risk flags</p>
        </div>
        <button onClick={exportCsv} disabled={exporting || results.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select className="input flex-1 min-w-36" value={assessment} onChange={e => setAssessment(e.target.value)}>
          <option value="">All assessments</option>
          {assessmentList.map(a => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
        </select>
        <select className="input w-40" value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          <option value="high_risk">High risk only</option>
          <option value="minimal">Minimal/None</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </select>
        <input type="date" className="input w-40" value={from} onChange={e => setFrom(e.target.value)} placeholder="From date" />
        <input type="date" className="input w-40" value={to} onChange={e => setTo(e.target.value)} placeholder="To date" />
        <button onClick={() => { setAssessment(''); setSeverity(''); setFrom(''); setTo('') }}
          className="text-sm text-gray-400 hover:text-gray-600">Clear</button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assessment</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Risk</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No results match filters</td></tr>
            ) : results.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.patient_name || 'Anonymous'}</td>
                <td className="px-4 py-3">
                  <span className="text-gray-700">{r.assessment_name}</span>
                  <span className="ml-1 text-xs text-gray-400">({r.code})</span>
                </td>
                <td className="px-4 py-3 font-bold text-gray-900">{r.total_score}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(r.severity_band)}`}>{r.severity_band}</span>
                </td>
                <td className="px-4 py-3">
                  {r.high_risk_flag && <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />High risk</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.submitted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
