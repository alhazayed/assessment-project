'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Download, TrendingUp, TrendingDown, AlertTriangle, Users, Brain, ChevronUp, ChevronDown, Minus } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type DailyPoint = { date: string; label: string; submissions: number; highRisk: number }
type SeverityPoint = { band: string; count: number; percent: number }
type AssessmentStat = {
  id: string; code: string; name_en: string; is_active: boolean
  count: number; highRiskCount: number; highRiskPct: number
  avg: number; median: number; stddev: number; min: number; max: number
  severityBands: Record<string, number>
}
type UserGrowthPoint = { date: string; label: string; count: number }
type OverallStats = {
  total: number; avg: number; median: number; stddev: number; min: number; max: number
  highRisk: number; highRiskPct: number
  totalUsers: number; newUsersThisMonth: number
  last30DaySubmissions: number; periodChange: number | null
  roleDistribution: Record<string, number>
}
type Analytics = {
  dailySubmissions: DailyPoint[]
  severityDistribution: SeverityPoint[]
  assessmentStats: AssessmentStat[]
  userGrowth: UserGrowthPoint[]
  overallStats: OverallStats
}

type SortKey = 'count' | 'avg' | 'median' | 'stddev' | 'min' | 'max' | 'highRiskPct'

function severityFill(band: string): string {
  const b = band.toLowerCase()
  if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return '#22c55e'
  if (b.includes('mild')) return '#f59e0b'
  if (b.includes('moderate')) return '#f97316'
  if (b.includes('severe') || b.includes('high')) return '#ef4444'
  return '#9ca3af'
}

function severityBadge(band: string): string {
  const b = band.toLowerCase()
  if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  return 'badge-severe'
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card rounded-lg shadow-lg p-3 text-xs border">
      <p className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const lang = useLang()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('count')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }, [sortKey])

  async function exportData(type: 'detailed' | 'stats' | 'risk') {
    setExporting(type)
    const params = new URLSearchParams({ format: type })
    const res = await fetch(`/api/admin/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(null)
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--vw-blue)', borderTopColor: 'transparent' }} />
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.analytics.loading', lang)}</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="p-8 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.analytics.error', lang)}</div>
  )

  const { dailySubmissions, severityDistribution, assessmentStats, userGrowth, overallStats } = data

  const sortedAssessments = [...assessmentStats].sort((a, b) =>
    sortDir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
  )

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-25" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" style={{ color: 'var(--vw-blue)' }} /> : <ChevronDown className="w-3 h-3" style={{ color: 'var(--vw-blue)' }} />
  }

  const PeriodBadge = () => {
    if (overallStats.periodChange === null) return null
    const up = overallStats.periodChange > 0
    const flat = overallStats.periodChange === 0
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${flat ? 'bg-gray-100 text-gray-500' : up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {flat ? <Minus className="w-3 h-3" /> : up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}{overallStats.periodChange}% {t('admin.analytics.vs_prev_30d', lang)}
      </span>
    )
  }

  const statCards = [
    {
      label: t('admin.analytics.total_submissions', lang),
      value: overallStats.total.toLocaleString(),
      sub: `${t('admin.analytics.col.mean', lang)}: ${overallStats.avg} · ${t('admin.analytics.col.median', lang)}: ${overallStats.median}`,
      icon: Brain, color: 'text-brand-600 bg-brand-50',
      extra: <PeriodBadge />,
    },
    {
      label: t('admin.analytics.high_risk_flags', lang),
      value: overallStats.highRisk.toLocaleString(),
      sub: `${overallStats.highRiskPct}% ${t('admin.analytics.pct_high_risk', lang)}`,
      icon: AlertTriangle, color: 'text-red-600 bg-red-50', extra: null,
    },
    {
      label: t('admin.analytics.registered_users', lang),
      value: overallStats.totalUsers.toLocaleString(),
      sub: `+${overallStats.newUsersThisMonth} ${t('admin.analytics.new_this_month', lang)}`,
      icon: Users, color: 'text-brand-600 bg-brand-50', extra: null,
    },
    {
      label: t('admin.analytics.score_stddev', lang),
      value: overallStats.stddev.toString(),
      sub: `${t('admin.analytics.range', lang)}: ${overallStats.min} – ${overallStats.max}`,
      icon: TrendingUp, color: 'text-accent-600 bg-accent-50', extra: null,
    },
  ]

  const tableCols: { key: SortKey; label: string }[] = [
    { key: 'count', label: t('admin.analytics.col.count', lang) },
    { key: 'avg', label: t('admin.analytics.col.mean', lang) },
    { key: 'median', label: t('admin.analytics.col.median', lang) },
    { key: 'stddev', label: t('admin.analytics.col.stddev', lang) },
    { key: 'min', label: t('admin.analytics.col.min', lang) },
    { key: 'max', label: t('admin.analytics.col.max', lang) },
    { key: 'highRiskPct', label: t('admin.analytics.col.risk_pct', lang) },
  ]

  return (
    <div className="p-7 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.analytics.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {t('admin.analytics.subtitle', lang)} · {overallStats.total.toLocaleString()} {t('admin.analytics.submissions', lang).toLowerCase()} {assessmentStats.length} {t('admin.assessments.col.assessment', lang).toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportData('stats')} disabled={!!exporting}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-40 text-sm">
            <Download className="w-4 h-4" />
            {exporting === 'stats' ? t('admin.analytics.exporting', lang) : t('admin.analytics.export_stats', lang)}
          </button>
          <button onClick={() => exportData('risk')} disabled={!!exporting}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-40 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {exporting === 'risk' ? t('admin.analytics.exporting', lang) : t('admin.analytics.export_risk', lang)}
          </button>
          <button onClick={() => exportData('detailed')} disabled={!!exporting}
            className="btn-accent flex items-center gap-1.5 disabled:opacity-40 text-sm">
            <Download className="w-4 h-4" />
            {exporting === 'detailed' ? t('admin.analytics.exporting', lang) : t('admin.analytics.export_full', lang)}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              {s.extra}
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* 30-day Submission Trend */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.analytics.trends', lang)}</h2>
          <div className="flex items-center gap-4 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-brand-500 inline-block rounded" />{t('admin.analytics.submissions', lang)}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" />{t('admin.analytics.high_risk', lang)}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailySubmissions} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="gSubs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1D6296" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1D6296" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="submissions" name={t('admin.analytics.submissions', lang)} stroke="#1D6296" fill="url(#gSubs)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="highRisk" name={t('admin.analytics.high_risk', lang)} stroke="#ef4444" fill="url(#gRisk)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Severity Distribution + Top Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-[13.5px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{t('admin.analytics.severity_dist', lang)}</h2>
          {severityDistribution.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.analytics.no_data', lang)}</p>
          ) : (
            <div className="space-y-3.5">
              {severityDistribution.map(s => (
                <div key={s.band}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${severityBadge(s.band)}`}>{s.band}</span>
                    <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{s.count.toLocaleString()} <span>({s.percent}%)</span></span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${s.percent}%`, backgroundColor: severityFill(s.band) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 card p-6">
          <h2 className="text-[13.5px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{t('admin.analytics.top_by_volume', lang)}</h2>
          {assessmentStats.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.analytics.no_submissions', lang)}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={assessmentStats.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={42} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name={t('admin.analytics.submissions', lang)} fill="#1D6296" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Per-Assessment Stats Table */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.analytics.per_assessment', lang)}</h2>
            <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{assessmentStats.length} {t('admin.analytics.assessments_with_subs', lang)} · {t('admin.analytics.click_sort', lang)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
                <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide min-w-[180px]" style={{ color: 'var(--text-muted)' }}>{t('admin.analytics.col.assessment', lang)}</th>
                {tableCols.map(col => (
                  <th key={col.key}
                    className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-brand-600"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => toggleSort(col.key)}>
                    <span className="flex items-center gap-1">{col.label} <SortIcon k={col.key} /></span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide min-w-[140px]" style={{ color: 'var(--text-muted)' }}>{t('admin.analytics.col.severity_mix', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssessments.map(a => {
                const topBands = Object.entries(a.severityBands).sort((x, y) => y[1] - x[1]).slice(0, 3)
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{a.name_en}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {a.code}
                        {!a.is_active && <span className="ml-1 text-orange-500">· {t('admin.analytics.hidden', lang)}</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{a.count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{a.avg}</td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{a.median}</td>
                    <td className="px-4 py-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{a.stddev}</td>
                    <td className="px-4 py-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{a.min}</td>
                    <td className="px-4 py-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{a.max}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.highRiskPct >= 25 ? 'bg-red-100 text-red-700' :
                        a.highRiskPct >= 10 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {a.highRiskCount} ({a.highRiskPct}%)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {topBands.map(([band, cnt]) => (
                          <span key={band}
                            className="text-[10.5px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: severityFill(band) + '20', color: severityFill(band) }}>
                            {band.split(' ')[0]} {cnt}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-[13.5px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{t('admin.analytics.user_growth', lang)}</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={userGrowth} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name={t('admin.analytics.new_users', lang)} fill="#F3650A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-[13.5px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{t('admin.analytics.role_breakdown', lang)}</h2>
          <div className="space-y-3">
            {[
              { role: 'patient', label: t('admin.analytics.patients', lang), color: '#1D6296' },
              { role: 'clinician', label: t('admin.analytics.clinicians', lang), color: '#2E8ABF' },
              { role: 'admin', label: t('admin.analytics.admins', lang), color: '#F3650A' },
              { role: 'superadmin', label: t('admin.analytics.superadmins', lang), color: '#C44D08' },
            ].map(({ role, label, color }) => {
              const count = overallStats.roleDistribution[role] || 0
              const pct = overallStats.totalUsers ? +((count / overallStats.totalUsers) * 100).toFixed(1) : 0
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{count} <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span></span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--divider)' }}>
            <p className="text-[11.5px] font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>{t('admin.analytics.population_stats', lang)}</p>
            <div className="space-y-1.5">
              {[
                { label: t('admin.analytics.global_mean', lang), value: overallStats.avg },
                { label: t('admin.analytics.global_median', lang), value: overallStats.median },
                { label: t('admin.analytics.std_deviation', lang), value: overallStats.stddev },
                { label: t('admin.analytics.score_range', lang), value: `${overallStats.min}–${overallStats.max}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
