'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface StripePaymentFormProps {
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
  lang: 'en' | 'ar'
}

// Mock Stripe for build time - will be replaced at runtime
let StripeLoaded = false
let StripeInstance: any = null

async function loadStripeRuntime() {
  if (StripeLoaded) return StripeInstance

  try {
    // Only attempt to load Stripe packages in browser environment
    if (typeof window === 'undefined') {
      return null
    }

    // Use Function constructor to avoid webpack analysis
    // eslint-disable-next-line no-new-func
    const importFunc = new Function(
      'module',
      `return import('@stripe/js').then(m => m.loadStripe)`
    )
    const loadStripeFn = await importFunc({})
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      console.warn('Stripe publishable key not configured')
      return null
    }

    StripeInstance = await loadStripeFn(publishableKey)
    StripeLoaded = true
    return StripeInstance
  } catch (error) {
    console.error('Failed to load Stripe:', error)
    return null
  }
}

function PaymentFormContent({
  clientSecret,
  onSuccess,
  onError,
  isLoading,
  lang,
}: StripePaymentFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stripe, setStripe] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initStripe = async () => {
      try {
        setIsInitializing(true)
        const stripeInstance = await loadStripeRuntime()

        if (!stripeInstance) {
          setSubmitError(
            lang === 'ar'
              ? 'فشل تحميل معالج الدفع Stripe'
              : 'Failed to load Stripe payment processor'
          )
          onError('Stripe initialization failed')
          return
        }

        setStripe(stripeInstance)
      } catch (err) {
        setSubmitError(
          lang === 'ar'
            ? 'خطأ في تحميل نظام الدفع'
            : 'Error loading payment system'
        )
        onError('Payment system error')
      } finally {
        setIsInitializing(false)
      }
    }

    initStripe()
  }, [lang, onError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe) {
      setSubmitError(
        lang === 'ar' ? 'Stripe لم يتم تحميله بعد' : 'Stripe is not loaded yet'
      )
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setSubmitError(error.message || 'Payment failed')
        onError(error.message || 'Payment processing error')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess()
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      setSubmitError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1D6296' }} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment form will be injected here by Stripe Elements */}
      <div className="p-6 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <div id="payment-element" />
      </div>

      {/* Error Message */}
      {submitError && (
        <div
          className="p-4 rounded-lg text-sm flex gap-3"
          style={{
            backgroundColor: 'rgba(192, 42, 42, 0.1)',
            borderLeft: '4px solid #C02A2A',
            color: '#C02A2A',
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{submitError}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isSubmitting || isLoading}
        className="w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#1D6296' }}
      >
        {isSubmitting || isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
          </>
        ) : (
          lang === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'
        )}
      </button>

      {/* Security Note */}
      <p
        className="text-center text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        {lang === 'ar'
          ? '🔒 الدفع آمن ومشفر عبر Stripe. لن نخزن معلومات بطاقتك.'
          : '🔒 Your payment is secure and encrypted via Stripe. We never store your card details.'}
      </p>
    </form>
  )
}

interface StripePaymentFormWrapperProps {
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
  lang: 'en' | 'ar'
}

export function StripePaymentFormWrapper({
  clientSecret,
  onSuccess,
  onError,
  isLoading,
  lang,
}: StripePaymentFormWrapperProps) {
  return (
    <PaymentFormContent
      clientSecret={clientSecret}
      onSuccess={onSuccess}
      onError={onError}
      isLoading={isLoading}
      lang={lang}
    />
  )
}
