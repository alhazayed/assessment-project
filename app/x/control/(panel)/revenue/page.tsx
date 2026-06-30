'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  DollarSign, CreditCard, TrendingUp, Percent, RefreshCw, Tag, Brain, Users,
} from 'lucide-react'
import { useLang } from '@/lib/use-lang'

interface RevenueData {
  headline: {
    totalRevenueUSD: number
    totalDiscountCents: number
    avgOrderUSD: number
    successfulPayments: number
    totalPayments: number
    conversionRate: number
    activeSubscriptions: number
  }
  paymentsByStatus: Record<string, number>
  revenueByTier: { tier: string; count: number; revenueUSD: number }[]
  activeByTier: Record<string, number>
  dailyTrend: { date: string; label: string; revenueCents: number; count: number }[]
  promoUses: number
  adhdCheckins30d: number
}

const TIER_COLORS: Record<string, string> = {
  basic: '#7EB7DB',
  standard: '#1D6296',
  professional: '#12273C',
  other: '#9CA3AF',
}

const STATUS_COLORS: Record<string, string> = {
  succeeded: '#1B8A5A',
  pending: '#B5790B',
  failed: '#C02A2A',
  cancelled: '#6B7280',
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function RevenuePage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/revenue')
      if (!res.ok) throw new Error('Failed to load revenue data')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tr = (en: string, ar: string) => (isAr ? ar : en)

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-7 h-7 animate-spin" style={{ color: '#1D6296' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="card p-6 text-center" style={{ color: '#C02A2A' }}>{error}</div>
      </div>
    )
  }

  if (!data) return null

  const h = data.headline
  const cards = [
    {
      label: tr('Total Revenue', 'إجمالي الإيرادات'),
      value: fmtUSD(h.totalRevenueUSD),
      icon: DollarSign,
      bg: '#E6F4EC',
      color: '#1B8A5A',
    },
    {
      label: tr('Active Subscriptions', 'الاشتراكات النشطة'),
      value: String(h.activeSubscriptions),
      icon: Users,
      bg: '#EAF2F9',
      color: '#1D6296',
    },
    {
      label: tr('Avg Order Value', 'متوسط قيمة الطلب'),
      value: fmtUSD(h.avgOrderUSD),
      icon: CreditCard,
      bg: '#FEF2EC',
      color: '#F3650A',
    },
    {
      label: tr('Conversion Rate', 'معدل التحويل'),
      value: `${h.conversionRate}%`,
      icon: Percent,
      bg: '#F3ECFB',
      color: '#7A3FB0',
    },
  ]

  const statusEntries = Object.entries(data.paymentsByStatus)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {tr('Revenue Analytics', 'تحليلات الإيرادات')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tr('Payments, subscriptions, and conversion performance', 'المدفوعات والاشتراكات وأداء التحويل')}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {tr('Refresh', 'تحديث')}
        </button>
      </div>

      {/* Headline cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">{c.label}</span>
              <div className="stat-icon" style={{ background: c.bg }}>
                <c.icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
            </div>
            <p className="stat-value">{c.value}</p>
            <p className="stat-sub">
              {c.label === cards[3].label
                ? `${h.successfulPayments}/${h.totalPayments} ${tr('paid', 'مدفوع')}`
                : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Daily revenue trend */}
      <div className="card p-6 mb-6">
        <h2 className="text-[15px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {tr('Revenue — Last 30 Days', 'الإيرادات — آخر 30 يوماً')}
        </h2>
        <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {tr('Daily successful payment volume (USD)', 'حجم المدفوعات الناجحة اليومية (دولار)')}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.dailyTrend.map((d) => ({ ...d, revenue: d.revenueCents / 100 }))}>
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
              formatter={(v: number) => [fmtUSD(v), tr('Revenue', 'الإيراد')]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#1D6296" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue by tier */}
        <div className="card p-6">
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {tr('Revenue by Tier', 'الإيرادات حسب الباقة')}
          </h2>
          {data.revenueByTier.length === 0 ? (
            <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>
              {tr('No revenue yet', 'لا توجد إيرادات بعد')}
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.revenueByTier}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
                  <XAxis dataKey="tier" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v: number) => [fmtUSD(v), tr('Revenue', 'الإيراد')]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="revenueUSD" radius={[6, 6, 0, 0]}>
                    {data.revenueByTier.map((entry) => (
                      <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || TIER_COLORS.other} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {data.revenueByTier.map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLORS[tier.tier] || TIER_COLORS.other }} />
                      <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>{tier.tier}</span>
                      <span style={{ color: 'var(--text-muted)' }}>· {tier.count} {tr('orders', 'طلب')}</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtUSD(tier.revenueUSD)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Payments by status + secondary metrics */}
        <div className="card p-6">
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {tr('Payments by Status', 'المدفوعات حسب الحالة')}
          </h2>
          {statusEntries.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
              {tr('No payments yet', 'لا توجد مدفوعات بعد')}
            </p>
          ) : (
            <div className="space-y-2.5 mb-6">
              {statusEntries.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[status] || '#9CA3AF' }} />
                    <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>{status}</span>
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Tag className="w-4 h-4" style={{ color: '#7A3FB0' }} />
                {tr('Promo codes redeemed', 'الرموز الترويجية المستخدمة')}
              </span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.promoUses}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <DollarSign className="w-4 h-4" style={{ color: '#1B8A5A' }} />
                {tr('Total discounts given', 'إجمالي الخصومات الممنوحة')}
              </span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtUSD(data.headline.totalDiscountCents / 100)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Brain className="w-4 h-4" style={{ color: '#F3650A' }} />
                {tr('ADHD check-ins (30d)', 'فحوصات ADHD (30 يوماً)')}
              </span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.adhdCheckins30d}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
