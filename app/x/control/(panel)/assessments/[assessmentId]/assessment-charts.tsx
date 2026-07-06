'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const BLUE = '#1D6296'
const ORANGE = '#F3650A'

type Breakdown = { group: string; count: number; avgScore: number }

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1 shadow-card-md min-w-[120px]">
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <b>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</b></p>
      ))}
    </div>
  )
}

export function SeverityBandChart({ severityBands, isAr }: { severityBands: { band: string; count: number }[]; isAr: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={severityBands} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
        <XAxis dataKey="band" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name={isAr ? 'العدد' : 'Count'} fill={ORANGE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CompletionsTrendChart({ trend, isAr, height = 220 }: { trend: { date: string; completions: number }[]; isAr: boolean; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={trend} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="completions" name={isAr ? 'الإكمالات' : 'Completions'} stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AvgScoreTrendChart({ trend, isAr }: { trend: { date: string; avgScore: number }[]; isAr: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={trend} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="avgScore" name={isAr ? 'متوسط الدرجة' : 'Avg score'} stroke={ORANGE} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ScoreHistogramChart({ scoreHistogram, isAr }: { scoreHistogram: { score: number; count: number }[]; isAr: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={scoreHistogram} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
        <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} label={{ value: isAr ? 'الدرجة' : 'Score', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-muted)' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name={isAr ? 'عدد المرضى' : 'Respondents'} fill={BLUE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BreakdownChart({ title, data, isAr }: { title: string; data: Breakdown[]; isAr: boolean }) {
  return (
    <div className="card p-4">
      <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {!data.length ? (
        <p className="text-[12.5px] py-8 text-center" style={{ color: 'var(--text-muted)' }}>{isAr ? 'لا توجد بيانات' : 'No data'}</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, data.length * 38)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--divider)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis type="category" dataKey="group" width={90} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name={isAr ? 'العدد' : 'Count'} fill={BLUE} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
