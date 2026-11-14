'use client'

import { Suspense, useState, useEffect, lazy } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import { trackEvent } from '@/lib/analytics'
import { BULK_MIN, BULK_MAX } from '@/lib/billing/bulk-limits'

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

function CheckoutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = useLang()
  const isRtl = lang === 'ar'

  // Packages are the only paid product: a profile package UUID. Its name and
  // price come from the server, the same price create-session charges.
  const packageId = searchParams.get('package') || ''
  const [fetchedPackage, setFetchedPackage] = useState<Package | null>(null)
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState<'invalid' | 'not_for_sale' | null>(null)
  const [alreadyOwned, setAlreadyOwned] = useState(false)
  const selectedPackage = fetchedPackage

  // Buy for someone else: the recipient gets a one-time code by email.
  const [isGift, setIsGift] = useState(false)
  const [giftEmail, setGiftEmail] = useState('')
  const giftEmailValid = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(giftEmail.trim())

  // Several codes in one order (clinician intake, staff). Not a gift, no promo.
  const [isBulk, setIsBulk] = useState(false)
  const [bulkQty, setBulkQty] = useState('10')
  const bulkQtyNum = Number(bulkQty)
  const bulkQtyValid = Number.isInteger(bulkQtyNum) && bulkQtyNum >= BULK_MIN && bulkQtyNum <= BULK_MAX

  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)
  const [appliedFinalPrice, setAppliedFinalPrice] = useState<number | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [showStripeForm, setShowStripeForm] = useState(false)

  useEffect(() => {
    let cancelled = false
    setProductLoading(true)
    fetch(`/api/checkout/product?id=${encodeURIComponent(packageId)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setProductError(data.reason === 'not_for_sale' ? 'not_for_sale' : 'invalid')
        } else {
          setFetchedPackage({ id: data.id, nameEn: data.nameEn, nameAr: data.nameAr, priceUSD: data.priceUSD })
          // Already theirs: they can still buy it for someone else.
          if (data.owned) { setAlreadyOwned(true); setIsGift(true) }
        }
      })
      .catch(() => { if (!cancelled) setProductError('invalid') })
      .finally(() => { if (!cancelled) setProductLoading(false) })
    return () => { cancelled = true }
  }, [packageId])

  if (productLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1D6296' }} />
      </div>
    )
  }

  if (!selectedPackage) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-lg" style={{ color: 'var(--text-primary)' }}>
          {productError === 'not_for_sale'
            ? (lang === 'ar' ? 'هذه الباقة غير متاحة للشراء حالياً' : 'This package is not on sale right now')
            : (lang === 'ar' ? 'الحزمة غير صحيحة' : 'Invalid package')}
        </p>
        <Link href="/packages" className="btn-accent mt-4 inline-flex items-center gap-2">
          {lang === 'ar' ? '← العودة للحزم' : '← Back to Packages'}
        </Link>
      </div>
    )
  }

  const unitPrice = selectedPackage.priceUSD
  const basePrice = isBulk && bulkQtyValid ? (Math.round(unitPrice * 100) * bulkQtyNum) / 100 : unitPrice
  // A package purchase goes straight back to the package, now unlocked.
  // A gift or a multi-code order goes to billing, where the buyer can follow it.
  const successPath = isBulk
    ? '/billing?bulk=sent'
    : isGift
      ? '/billing?gift=sent'
      : `/packages/${selectedPackage.id}?purchased=1`
  // The final price is authoritative from the server when a promo is applied
  // (validated by /api/checkout/validate-promo, the same helper create-session
  // charges from), so the preview total always matches the actual charge.
  const finalPrice =
    promoApplied && appliedFinalPrice != null ? appliedFinalPrice : basePrice

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError(lang === 'ar' ? 'أدخل رمز الخصم' : 'Enter a promo code')
      return
    }

    setPromoLoading(true)
    setPromoError(null)

    try {
      const response = await fetch('/api/checkout/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCode: promoCode.trim(),
          packageId: selectedPackage.id,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.valid) {
        const err: string = typeof data.error === 'string' ? data.error : ''
        let msg: string
        if (response.status === 429) {
          msg = lang === 'ar' ? 'محاولات كثيرة جدًا. حاول لاحقًا.' : 'Too many attempts. Please try again later.'
        } else if (data.reason === 'already_used') {
          msg = lang === 'ar' ? 'لقد استخدمت هذا الرمز من قبل' : 'You have already used this promo code'
        } else if (data.reason === 'not_yet_active') {
          msg = lang === 'ar' ? 'رمز الخصم غير مفعّل بعد' : 'Promo code is not yet active'
        } else if (/limit/i.test(err)) {
          msg = lang === 'ar' ? 'انتهت الحد الأقصى للاستخدام' : 'Promo code usage limit reached'
        } else if (/expired/i.test(err)) {
          msg = lang === 'ar' ? 'انتهت صلاحية رمز الخصم' : 'Promo code has expired'
        } else {
          msg = lang === 'ar' ? 'رمز الخصم غير صحيح أو منتهي الصلاحية' : 'Invalid or expired promo code'
        }
        setPromoError(msg)
        return
      }

      setDiscount(data.discount)
      setDiscountType(data.discountType)
      setAppliedFinalPrice(data.finalPrice)
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
    trackEvent('checkout_started', { mode: isBulk ? 'bulk' : isGift ? 'gift' : 'self', quantity: isBulk ? bulkQtyNum : 1 })

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          promoCode: promoApplied && !isBulk ? promoCode.trim() : null,
          giftEmail: isGift && !isBulk ? giftEmail.trim() : null,
          quantity: isBulk ? bulkQtyNum : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const data = await response.json()

      // A promo code made the order free: it's already activated server-side.
      if (data.free) {
        router.push(successPath)
        return
      }

      const { clientSecret } = data

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
    router.push(successPath)
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
                {isBulk
                  ? `${bulkQtyValid ? bulkQtyNum : '?'} × $${unitPrice.toFixed(2)}`
                  : (lang === 'ar' ? 'السعر الأساسي' : 'Base Price')}
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
          {isBulk
            ? (lang === 'ar'
                ? 'دفعة واحدة. نرسل إليك الرموز بالبريد الإلكتروني؛ أعطِ كل شخص رمزاً يفتح الباقة في حسابه. ترى في صفحة الفواتير أي الرموز استُخدمت.'
                : 'One-time payment. We email you the codes; give one to each person and it opens the package on their account. Billing shows which codes have been used.')
            : isGift
            ? (lang === 'ar'
                ? 'دفعة واحدة. نرسل إلى المستلم رمزاً يُستخدم مرة واحدة لفتح الباقة في حسابه.'
                : 'One-time payment. We email the recipient a one-time code that opens the package on their account.')
            : (lang === 'ar'
                ? 'دفعة واحدة، بلا اشتراك. يبقى التقرير المجمّع لهذه الباقة متاحاً لك.'
                : 'One-time payment, no subscription. The combined report for this package stays unlocked for you.')}
        </div>

        {/* Buy for someone else */}
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
          {alreadyOwned ? (
            <p className="text-[13.5px] mb-3" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'ar'
                ? 'لديك هذه الباقة بالفعل. يمكنك شراؤها هدية لشخص آخر.'
                : 'You already have this package. You can buy it as a gift for someone else.'}{' '}
              <Link href={`/packages/${selectedPackage.id}`} className="font-semibold underline" style={{ color: '#1D6296' }}>
                {lang === 'ar' ? 'افتح باقتك' : 'Open yours'}
              </Link>
            </p>
          ) : (
            <label className="flex items-center gap-2 text-[14px] font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isGift && !isBulk}
                onChange={e => setIsGift(e.target.checked)}
                disabled={showStripeForm || isBulk}
                className="w-4 h-4"
              />
              {lang === 'ar' ? 'شراء لشخص آخر (هدية)' : 'Buy for someone else (gift)'}
            </label>
          )}
          {isGift && !isBulk && (
            <div className={alreadyOwned ? '' : 'mt-3'}>
              <label htmlFor="gift-email" className="block text-[13px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                {lang === 'ar' ? 'البريد الإلكتروني للمستلم' : "Recipient's email"}
              </label>
              <input
                id="gift-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={giftEmail}
                onChange={e => setGiftEmail(e.target.value)}
                disabled={showStripeForm}
                maxLength={254}
                className="w-full px-3 py-2 rounded-lg border text-[14px]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}
                aria-invalid={giftEmail !== '' && !giftEmailValid ? true : undefined}
              />
              <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {lang === 'ar'
                  ? 'سيصله رمز يُستخدم مرة واحدة. لن تُفتح الباقة في حسابك.'
                  : 'They get a one-time code. The package is not unlocked on your account.'}
              </p>
            </div>
          )}
        </div>

        {/* Several codes for clients or staff */}
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
          <label className="flex items-center gap-2 text-[14px] font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={isBulk}
              onChange={e => {
                setIsBulk(e.target.checked)
                if (e.target.checked && !alreadyOwned) setIsGift(false)
              }}
              disabled={showStripeForm || promoApplied}
              className="w-4 h-4"
            />
            {lang === 'ar' ? 'شراء عدة رموز (لعملائك أو موظفيك)' : 'Buy several codes (for your clients or staff)'}
          </label>
          {isBulk && (
            <div className="mt-3">
              <label htmlFor="bulk-qty" className="block text-[13px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                {lang === 'ar' ? `عدد الرموز (${BULK_MIN}–${BULK_MAX})` : `Number of codes (${BULK_MIN}–${BULK_MAX})`}
              </label>
              <input
                id="bulk-qty"
                type="number"
                inputMode="numeric"
                min={BULK_MIN}
                max={BULK_MAX}
                step={1}
                value={bulkQty}
                onChange={e => setBulkQty(e.target.value)}
                disabled={showStripeForm}
                className="w-32 px-3 py-2 rounded-lg border text-[14px]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}
                aria-invalid={!bulkQtyValid ? true : undefined}
              />
              <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {lang === 'ar'
                  ? 'لا تُفتح الباقة في حسابك، ولا يمكن استخدام رمز خصم مع هذا الطلب. لا ترى نتائج أي شخص؛ يظهر تقرير جماعي مجهول الهوية عندما يُكمل 10 أشخاص على الأقل.'
                  : "The package is not unlocked on your account, and promo codes don't apply to this order. You never see anyone's results; an anonymised group report appears once 10 or more people finish."}
              </p>
            </div>
          )}
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
              disabled={promoApplied || promoLoading || !promoCode || isBulk}
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
              disabled={paymentLoading || (isGift && !isBulk && !giftEmailValid) || (isBulk && !bulkQtyValid)}
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
                  {finalPrice === 0
                    ? (lang === 'ar' ? 'تفعيل مجانًا' : 'Activate for free')
                    : (lang === 'ar' ? 'متابعة الدفع' : 'Proceed to Payment')}
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
        className="sticky top-0 z-40 border-b safe-top safe-x"
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
              ? 'أدخل تفاصيل الدفع لإتمام عملية الشراء'
              : 'Enter your payment details to complete your purchase'}
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
