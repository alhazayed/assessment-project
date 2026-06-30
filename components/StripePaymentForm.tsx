'use client'

import { useState, useEffect } from 'react'
import { loadStripe, Stripe } from '@stripe/js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, AlertCircle } from 'lucide-react'

interface StripePaymentFormProps {
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
  lang: 'en' | 'ar'
}

function PaymentFormContent({
  clientSecret,
  onSuccess,
  onError,
  isLoading,
  lang,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setSubmitError(
        lang === 'ar'
          ? 'Stripe لم يتم تحميله بعد'
          : 'Stripe is not loaded yet'
      )
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setSubmitError(error.message || 'Payment failed')
        onError(error.message || 'Payment processing error')
      } else if (paymentIntent.status === 'succeeded') {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultValues: {
            billingDetails: {
              name: '',
              email: '',
            },
          },
        }}
      />

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
          lang === 'ar'
            ? 'تأكيد الدفع'
            : 'Confirm Payment'
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
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      onError(
        lang === 'ar'
          ? 'مفتاح Stripe لم يتم تكوينه'
          : 'Stripe key not configured'
      )
      return
    }

    setStripePromise(loadStripe(publishableKey))
  }, [lang, onError])

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1D6296' }} />
      </div>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#1D6296',
            colorBackground: 'var(--surface)',
            colorText: 'var(--text-primary)',
            colorDanger: '#C02A2A',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            spacingUnit: '4px',
          },
        },
      }}
    >
      <PaymentFormContent
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
        isLoading={isLoading}
        lang={lang}
      />
    </Elements>
  )
}
