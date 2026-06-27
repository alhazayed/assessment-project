'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { useLang } from '@/lib/use-lang'

type SeriesPoint = {
  date: string
  label: string
  submissions: number
  highRisk: number
  patients: number
  avgScore: number
}

type HistoryResponse = {
  days: number
  source: string
  hasData: boolean
  series: SeriesPoint[]
}

type RangeOption = 7 | 30 | 90

// Shared tooltip — mirrors the styling used by the analytics dashboard.
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1 shadow-card-md min-w-[120px]">
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <b>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</b>
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="card h-[240px]" style={{ backgroundColor: 'var(--surface-alt)' }} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card h-[220px]" style={{ backgroundColor: 'var(--surface-alt)' }} />
        <div className="card h-[220px]" style={{ backgroundColor: 'var(--surface-alt)' }} />
      </div>
    </div>
  )
}

export function KpiTrendCharts() {
  const lang = useLang()
  const isAr = lang === 'ar'

  const [range, setRange] = useState<RangeOption>(30)
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/admin/kpis/history?days=${range}`)
      .then(async r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json() as Promise<HistoryResponse>
      })
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [range])

  const rangeLabels: Record<RangeOption, string> = {
    7: isAr ? '٧ أيام' : '7 days',
    30: isAr ? '٣٠ يوماً' : '30 days',
    90: isAr ? '٩٠ يوماً' : '90 days',
  }

  const header = (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4" style={{ color: '#1D6296' }} />
        <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'اتجاهات الأداء' : 'Performance Trends'}
        </h2>
      </div>
      <div className="flex gap-1.5">
        {([7, 30, 90] as RangeOption[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={range === r
              ? { backgroundColor: '#F3650A', color: 'white' }
              : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
          >
            {rangeLabels[r]}
          </button>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return <div>{header}<ChartSkeleton /></div>
  }

  if (error) {
    return (
      <div>
        {header}
        <div className="card p-6 flex items-center gap-3" style={{ borderLeft: '3px solid #ef4444' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isAr ? 'تعذّر تحميل بيانات الاتجاهات' : 'Could not load trend data'}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const series = data?.series ?? []
  const totalSubs = series.reduce((s, p) => s + p.submissions, 0)

  return (
    <div>
      {header}

      {!data?.hasData && (
        <div className="card p-4 mb-5 flex items-center gap-2.5" style={{ backgroundColor: 'var(--surface-alt)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {isAr
              ? `لا توجد تقييمات في آخر ${rangeLabels[range]}. تُعرض القيم الصفرية عبر النطاق الزمني الكامل.`
              : `No assessments recorded in the last ${rangeLabels[range]}. Showing a zero-filled baseline across the full range.`}
          </p>
        </div>
      )}

      {/* Daily submissions + high-risk overlay */}
      <div className="card p-6 mb-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'التقييمات اليومية المُقدَّمة' : 'Daily Assessment Submissions'}
          </h3>
          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {isAr ? 'الإجمالي:' : 'Total:'} <b style={{ color: 'var(--text-secondary)' }}>{totalSubs.toLocaleString()}</b>
          </span>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="submissions" name={isAr ? 'التقييمات' : 'Submissions'} stroke="#1D6296" fill="#EAF2F9" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="highRisk" name={isAr ? 'مخاطر عالية' : 'High Risk'} stroke="#ef4444" fill="#FEF2F2" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily active patients */}
        <div className="card p-6">
          <h3 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'المرضى النشطون يومياً' : 'Daily Active Patients'}
          </h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(series.length / 6))} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="patients" name={isAr ? 'مرضى فريدون' : 'Unique Patients'} fill="#F3650A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average score trend */}
        <div className="card p-6">
          <h3 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'متوسط الدرجة يومياً' : 'Average Score Trend'}
          </h3>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(series.length / 6))} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="avgScore" name={isAr ? 'متوسط الدرجة' : 'Mean Score'} stroke="#1D6296" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[11px] mt-4" style={{ color: 'var(--text-muted)' }}>
        {isAr
          ? 'المصدر: عرض admin_daily_stats المُجمَّع (يُحدَّث كل ساعة).'
          : 'Source: aggregated admin_daily_stats view (refreshed hourly).'}
      </p>
    </div>
  )
}
