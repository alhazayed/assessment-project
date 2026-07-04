'use client'

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const TIER_COLORS: Record<string, string> = {
  basic: '#7EB7DB',
  standard: '#1D6296',
  professional: '#12273C',
  other: '#9CA3AF',
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function RevenueTrendChart({
  dailyTrend,
  revenueLabel,
}: {
  dailyTrend: { date: string; label: string; revenueCents: number; count: number }[]
  revenueLabel: string
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={dailyTrend.map((d) => ({ ...d, revenue: d.revenueCents / 100 }))}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1D6296" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#1D6296" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={4} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip
          formatter={(v: number) => [fmtUSD(v), revenueLabel]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#1D6296" strokeWidth={2} fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function RevenueByTierChart({
  revenueByTier,
  revenueLabel,
}: {
  revenueByTier: { tier: string; count: number; revenueUSD: number }[]
  revenueLabel: string
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={revenueByTier}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
        <XAxis dataKey="tier" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip formatter={(v: number) => [fmtUSD(v), revenueLabel]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="revenueUSD" radius={[6, 6, 0, 0]}>
          {revenueByTier.map((entry) => (
            <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || TIER_COLORS.other} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
