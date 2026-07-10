'use client'

import { Suspense, useState, useEffect, lazy } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

const StripePaymentFormWrapper = lazy(() =>
  import('@/components/StripePaymentForm').then(mod => ({
    default: mod.StripePaymentFormWrapper
  }))
)

interface Package {
  id: string
  nameEn: string
  nameAr: string
  priceUSD: number
}

const PACKAGES: Record<string, Package> = {
  basic: {
    id: 'basic',
    nameEn: 'Basic',
    nameAr: 'الأساسي',
    priceUSD: 9.99,
  },
  standard: {
    id: 'standard',
    nameEn: 'Standard',
    nameAr: 'القياسي',
    priceUSD: 24.99,
  },
  professional: {
    id: 'professional',
    nameEn: 'Professional',
    nameAr: 'احترافي',
    priceUSD: 49.99,
  },
}

function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = useLang()
  const isRtl = lang === 'ar'

  const packageId = searchParams.get('package') || 'standard'
  const selectedPackage = PACKAGES[packageId]

  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [showStripeForm, setShowStripeForm] = useState(false)

  if (!selectedPackage) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-lg" style={{ color: 'var(--text-primary)' }}>
          {lang === 'ar' ? 'الحزمة غير صحيحة' : 'Invalid package'}
        </p>
        <Link href="/packages" className="btn-accent mt-4 inline-flex items-center gap-2">
          {lang === 'ar' ? '← العودة للحزم' : '← Back to Packages'}
        </Link>
      </div>
    )
  }

  const basePrice = selectedPackage.priceUSD
  const finalPrice =
    discountType === 'percentage'
      ? basePrice * (1 - discount / 100)
      : discountType === 'fixed'
        ? Math.max(0, basePrice - discount)
        : basePrice

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError(lang === 'ar' ? 'أدخل رمز الخصم' : 'Enter a promo code')
      return
    }

    setPromoLoading(true)
    setPromoError(null)

    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to fetch promo codes')

      const { codes } = await response.json()
      const appliedCode = codes.find(
        (c: any) =>
          c.code.toUpperCase() === promoCode.toUpperCase() && c.active
      )

      if (!appliedCode) {
        setPromoError(
          lang === 'ar'
            ? 'رمز الخصم غير صحيح أو منتهي الصلاحية'
            : 'Invalid or expired promo code'
        )
        return
      }

      // Check max uses
      if (
        appliedCode.max_uses &&
        appliedCode.times_used >= appliedCode.max_uses
      ) {
        setPromoError(
          lang === 'ar'
            ? 'انتهت الحد الأقصى للاستخدام'
            : 'Promo code usage limit reached'
        )
        return
      }

      setDiscount(
        appliedCode.type === 'percentage'
          ? appliedCode.discount_value
          : appliedCode.discount_value
      )
      setDiscountType(appliedCode.type)
      setPromoApplied(true)
    } catch (error) {
      setPromoError(
        lang === 'ar'
          ? 'خطأ في التحقق من الرمز'
          : 'Error validating promo code'
      )
    } finally {
      setPromoLoading(false)
    }
  }

  const handlePayment = async () => {
    setPaymentLoading(true)
    setPaymentError(null)

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          promoCode: promoApplied ? promoCode : null,
          amount: finalPrice,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const { clientSecret, sessionId } = await response.json()

      if (clientSecret) {
        setClientSecret(clientSecret)
        setShowStripeForm(true)
      } else {
        setPaymentError(
          lang === 'ar'
            ? 'فشل في إعداد الدفع'
            : 'Failed to setup payment'
        )
      }
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : lang === 'ar'
            ? 'خطأ غير متوقع'
            : 'Unexpected error'
      )
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    router.push('/checkout/success')
  }

  const handlePaymentError = (error: string) => {
    setPaymentError(error)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
      {/* Order Summary */}
      <div>
        <h2
          className="text-2xl font-bold mb-8"
          style={{ color: 'var(--text-primary)' }}
        >
          {lang === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
        </h2>

        {/* Package Details */}
        <div
          className="p-6 rounded-lg mb-6"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {lang === 'ar' ? 'الحزمة' : 'Package'}
          </p>
          <h3
            className="text-xl font-bold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            {lang === 'ar'
              ? selectedPackage.nameAr
              : selectedPackage.nameEn}
          </h3>

          <div className="space-y-2 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>
                {lang === 'ar' ? 'السعر الأساسي' : 'Base Price'}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>
                ${basePrice.toFixed(2)}
              </span>
            </div>

            {promoApplied && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>
                  {lang === 'ar'
                    ? `الخصم (${promoCode})`
                    : `Discount (${promoCode})`}
                </span>
                <span>
                  {discountType === 'percentage'
                    ? `-${discount}%`
                    : `-$${discount.toFixed(2)}`}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-4 pt-4 text-lg font-bold">
            <span style={{ color: 'var(--text-primary)' }}>
              {lang === 'ar' ? 'الإجمالي' : 'Total'}
            </span>
            <span style={{ color: '#1D6296' }}>
              ${finalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Billing Period */}
        <div
          className="p-4 rounded-lg text-sm"
          style={{
            backgroundColor: 'rgba(29, 98, 150, 0.05)',
            border: '1px solid rgba(29, 98, 150, 0.1)',
            color: 'var(--text-secondary)',
          }}
        >
          {lang === 'ar'
            ? '📅 الفترة: 30 يوم. يمكنك الإلغاء في أي وقت.'
            : '📅 Billing period: 30 days. Cancel anytime.'}
        </div>
      </div>

      {/* Payment Section */}
      <div>
        <h2
          className="text-2xl font-bold mb-8"
          style={{ color: 'var(--text-primary)' }}
        >
          {lang === 'ar' ? 'الدفع' : 'Payment'}
        </h2>

        {/* Promo Code Section */}
        <div
          className="p-6 rounded-lg mb-8"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            {lang === 'ar' ? 'هل لديك رمز خصم؟' : 'Have a promo code?'}
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'}
              disabled={promoApplied || promoLoading}
              className="flex-1 min-w-0 px-4 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--page-bg)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleApplyPromo}
              disabled={promoApplied || promoLoading || !promoCode}
              className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: promoApplied ? '#1B8A5A' : '#1D6296',
                color: 'white',
              }}
            >
              {promoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : promoApplied ? (
                lang === 'ar'
                  ? '✓ تم التطبيق'
                  : '✓ Applied'
              ) : (
                lang === 'ar'
                  ? 'تطبيق'
                  : 'Apply'
              )}
            </button>
          </div>

          {promoError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {promoError}
            </p>
          )}
        </div>

        {/* Payment Error */}
        {paymentError && (
          <div
            className="p-4 rounded-lg mb-6 text-sm flex gap-3"
            style={{
              backgroundColor: 'rgba(192, 42, 42, 0.1)',
              borderLeft: '4px solid #C02A2A',
              color: '#C02A2A',
            }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{paymentError}</p>
          </div>
        )}

        {/* Stripe Payment Form or Button */}
        {showStripeForm && clientSecret ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1D6296' }} />
              </div>
            }
          >
            <StripePaymentFormWrapper
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              isLoading={paymentLoading}
              lang={lang as 'en' | 'ar'}
            />
          </Suspense>
        ) : (
          <>
            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: '#1D6296' }}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                </>
              ) : (
                <>
                  {lang === 'ar' ? 'متابعة الدفع' : 'Proceed to Payment'}
                </>
              )}
            </button>

            {/* Trust Message */}
            <p
              className="text-center text-xs mt-6"
              style={{ color: 'var(--text-muted)' }}
            >
              {lang === 'ar'
                ? '🔒 الدفع آمن ومشفر عبر Stripe'
                : '🔒 Your payment is secure and encrypted via Stripe'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const lang = useLang()

  return (
    <div style={{ backgroundColor: 'var(--page-bg)' }} className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/packages" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {lang === 'ar' ? 'العودة للحزم' : 'Back'}
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-12">
          <h1
            className="text-3xl font-extrabold mb-2"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
            }}
          >
            {lang === 'ar' ? 'أكمل عملية الشراء' : 'Complete Your Purchase'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {lang === 'ar'
              ? 'أدخل تفاصيل الدفع لتفعيل اشتراكك'
              : 'Enter your payment details to activate your subscription'}
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1D6296' }} />
            </div>
          }
        >
          <CheckoutForm />
        </Suspense>
      </main>
    </div>
  )
}
