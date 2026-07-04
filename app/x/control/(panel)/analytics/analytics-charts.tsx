'use client'

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function fmt(n: number | null | undefined) { return n == null ? '—' : n.toLocaleString() }

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1 shadow-card-md min-w-[120px]">
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <b>{fmt(p.value)}</b></p>
      ))}
    </div>
  )
}

type DailyPoint = { date: string; label: string; submissions: number; highRisk: number }
type UserGrowthPoint = { date: string; label: string; count: number }
type TrendPoint = { label: string; count: number; mean: number; highRisk: number }

export function DailySubmissionsChart({ dailySubmissions, isAr }: { dailySubmissions: DailyPoint[]; isAr: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={dailySubmissions} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="submissions" name={isAr ? 'التقييمات' : 'Submissions'} stroke="#1D6296" fill="#EAF2F9" strokeWidth={1.5} dot={false} />
        <Area type="monotone" dataKey="highRisk" name={isAr ? 'مخاطر عالية' : 'High Risk'} stroke="#ef4444" fill="#FEF2F2" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function UserGrowthChart({ userGrowth, isAr }: { userGrowth: UserGrowthPoint[]; isAr: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={userGrowth} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name={isAr ? 'مستخدمون جدد' : 'New Users'} fill="#F3650A" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendVolumeChart({ data, isAr }: { data: TrendPoint[]; isAr: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="count" name={isAr ? 'التقييمات' : 'Assessments'} stroke="#1D6296" fill="#EAF2F9" strokeWidth={1.5} dot={false} />
        <Area type="monotone" dataKey="highRisk" name={isAr ? 'مخاطر عالية' : 'High Risk'} stroke="#ef4444" fill="#FEF2F2" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function TrendMeanScoreChart({ data, isAr }: { data: TrendPoint[]; isAr: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="mean" name={isAr ? 'متوسط الدرجة' : 'Mean Score'} stroke="#F3650A" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
