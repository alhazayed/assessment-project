import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, CheckCircle2, Clock, XCircle, Receipt, Sparkles, ArrowRight } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface PaymentRow {
  id: string
  tier: string | null
  package_id: string | null
  amount_cents: number
  currency: string
  status: string
  discount_applied_cents: number | null
  created_at: string
  metadata: Record<string, any> | null
}

interface PurchaseRow {
  id: string
  tier: string | null
  package_id: string | null
  status: string
  access_level: string | null
  purchased_at: string
  expires_at: string | null
}

function tierLabel(tier: string | null, lang: 'en' | 'ar'): string {
  if (!tier) return lang === 'ar' ? 'باقة' : 'Package'
  switch (tier) {
    case 'basic':
      return t('billing.tier_basic', lang)
    case 'standard':
      return t('billing.tier_standard', lang)
    case 'professional':
      return t('billing.tier_professional', lang)
    default:
      return tier.charAt(0).toUpperCase() + tier.slice(1)
  }
}

function formatAmount(cents: number, currency: string, lang: 'en' | 'ar'): string {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function formatDate(value: string, lang: 'en' | 'ar'): string {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function payStatusLabel(status: string, lang: 'en' | 'ar'): string {
  switch (status) {
    case 'succeeded':
      return t('billing.pay_succeeded', lang)
    case 'failed':
      return t('billing.pay_failed', lang)
    case 'cancelled':
      return t('billing.pay_cancelled', lang)
    default:
      return t('billing.pay_pending', lang)
  }
}

const PAY_STATUS: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  succeeded: { icon: CheckCircle2, color: '#1B8A5A', bg: '#E6F4EC' },
  pending: { icon: Clock, color: '#B5790B', bg: '#FBF1DC' },
  failed: { icon: XCircle, color: '#C02A2A', bg: '#FDE8E8' },
  cancelled: { icon: XCircle, color: '#6B7280', bg: '#F1F1F2' },
}

export default async function BillingPage() {
  const supabase = await createClient()
  const lang = await getLanguage()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/billing')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const p = profile as Pick<Profile, 'role'> | null
  if (p?.role === 'admin' || p?.role === 'superadmin') redirect('/x/control')

  const [paymentsRes, purchaseRes] = await Promise.all([
    supabase
      .from('payments')
      .select('id, tier, package_id, amount_cents, currency, status, discount_applied_cents, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('package_purchases')
      .select('id, tier, package_id, status, access_level, purchased_at, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('purchased_at', { ascending: false })
      .limit(1),
  ])

  const payments = (paymentsRes.data || []) as PaymentRow[]
  const activeSub = (purchaseRes.data?.[0] || null) as PurchaseRow | null

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-extrabold tracking-tight mb-1"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
        >
          {t('billing.title', lang)}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('billing.subtitle', lang)}</p>
      </div>

      {/* Current Plan */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-4 h-4" style={{ color: '#1D6296' }} />
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('billing.current_plan', lang)}
          </h2>
        </div>

        {activeSub ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0"
                style={{ background: '#EAF2F9' }}
              >
                <CreditCard className="w-6 h-6" style={{ color: '#1D6296' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {tierLabel(activeSub.tier, lang)}
                  </p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: '#E6F4EC', color: '#1B8A5A' }}
                  >
                    {t('billing.status_active', lang)}
                  </span>
                </div>
                {activeSub.expires_at && (
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {t('billing.renews_on', lang)} {formatDate(activeSub.expires_at, lang)}
                  </p>
                )}
              </div>
            </div>
            <Link href="/packages" className="btn-secondary text-center">
              {t('billing.manage', lang)}
            </Link>
          </div>
        ) : (
          <div className="text-center py-8">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--surface-alt)' }}
            >
              <CreditCard className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('billing.no_subscription', lang)}
            </p>
            <p className="text-[13px] mb-4 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {t('billing.no_subscription_desc', lang)}
            </p>
            <Link href="/packages" className="btn-accent inline-flex items-center gap-2">
              {t('billing.browse_packages', lang)}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Receipt className="w-4 h-4" style={{ color: '#1D6296' }} />
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('billing.history', lang)}
          </h2>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-10">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--surface-alt)' }}
            >
              <Receipt className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('billing.no_payments', lang)}
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {t('billing.no_payments_desc', lang)}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  <th className="text-start pb-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {t('billing.col_date', lang)}
                  </th>
                  <th className="text-start pb-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {t('billing.col_description', lang)}
                  </th>
                  <th className="text-end pb-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {t('billing.col_amount', lang)}
                  </th>
                  <th className="text-end pb-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {t('billing.col_status', lang)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => {
                  const st = PAY_STATUS[pay.status] || PAY_STATUS.pending
                  const StIcon = st.icon
                  const hasDiscount = (pay.discount_applied_cents ?? 0) > 0
                  return (
                    <tr key={pay.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                      <td className="py-3.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(pay.created_at, lang)}
                      </td>
                      <td className="py-3.5">
                        <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {tierLabel(pay.tier, lang)}
                        </p>
                        {hasDiscount && (
                          <p className="text-[11.5px]" style={{ color: '#1B8A5A' }}>
                            {t('billing.discount_applied', lang)}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 text-end text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatAmount(pay.amount_cents, pay.currency, lang)}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-full"
                            style={{ background: st.bg, color: st.color }}
                          >
                            <StIcon className="w-3 h-3" />
                            {payStatusLabel(pay.status, lang)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[12px] mt-5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          🔒 {t('billing.secure_note', lang)}
        </p>
      </div>
    </div>
  )
}
