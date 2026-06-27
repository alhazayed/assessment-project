'use client'

import { useEffect, useState, useCallback } from 'react'
import { KPI_DEFINITIONS, type KPIValue } from '@/lib/types/kpi'
import { EnhancedKPICard } from '@/components/kpi-card-enhanced'
import { KpiTrendCharts } from '@/components/kpi-trend-charts'
import { RefreshCw, Download, AlertCircle } from 'lucide-react'

const ROWS: [number, number, string][] = [
  [0, 4, 'User Metrics'],
  [4, 8, 'Registration & Verification'],
  [8, 12, 'Assessment Activity'],
  [12, 16, 'Clinical & Messaging'],
  [16, 20, 'System Health'],
]

export function KpiDashboardClient() {
  const [values, setValues] = useState<Map<string, KPIValue>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/kpis', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data: KPIValue[] = await res.json()
      setValues(new Map(data.map(k => [k.id, k])))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive KPI Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time performance metrics and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            disabled
            title="Export coming soon"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">Failed to load KPIs: {error}</p>
        </div>
      )}

      {/* KPI grid */}
      <div className="space-y-8">
        {ROWS.map(([from, to, title], i) => (
          <div key={i}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {KPI_DEFINITIONS.slice(from, to).map(def => {
                const v = values.get(def.id)
                return (
                  <EnhancedKPICard
                    key={def.id}
                    kpi={def}
                    value={v?.value ?? 0}
                    target={def.target}
                    status={v?.status}
                    available={v?.available}
                    lastUpdated={v?.lastUpdated}
                    isLoading={loading}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Trend charts */}
      <div className="mt-10">
        <KpiTrendCharts />
      </div>

      <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 Cards marked <strong>“No data source yet”</strong> need backing tables
          (e.g. login/CAPTCHA/API telemetry) that don’t exist in the current schema.
        </p>
      </div>
    </div>
  )
}
