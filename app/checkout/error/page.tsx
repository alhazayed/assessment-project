'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowRight, HelpCircle } from 'lucide-react'
import { useLang } from '@/lib/use-lang'

export default function PaymentErrorPage() {
  const searchParams = useSearchParams()
  const lang = useLang()
  const isRtl = lang === 'ar'

  const [errorDetails, setErrorDetails] = useState<{
    code?: string
    message?: string
  } | null>(null)

  useEffect(() => {
    // Extract error details from URL params or session
    const errorCode = searchParams.get('error')
    const errorMessage = searchParams.get('message')

    setErrorDetails({
      code: errorCode || undefined,
      message: errorMessage || undefined,
    })
  }, [searchParams])

  const getErrorTitle = () => {
    if (lang === 'ar') {
      return 'فشل الدفع'
    }
    return 'Payment Failed'
  }

  const getErrorDescription = () => {
    if (errorDetails?.message) {
      return errorDetails.message
    }

    if (lang === 'ar') {
      return 'للأسف، لم نتمكن من معالجة عملية الدفع الخاصة بك. يرجى المحاولة مرة أخرى أو الاتصال بالدعم إذا استمرت المشكلة.'
    }
    return 'Unfortunately, we were unable to process your payment. Please try again or contact support if the issue persists.'
  }

  const getTroubleshootingTitle = () => {
    if (lang === 'ar') {
      return '🔧 استكشاف الأخطاء'
    }
    return '🔧 Troubleshooting'
  }

  const getTroubleshootingItems = () => {
    if (lang === 'ar') {
      return [
        'تحقق من صحة معلومات بطاقتك',
        'تأكد من توفر الرصيد الكافي',
        'تحقق من اتصالك بالإنترنت',
        'حاول استخدام متصفح مختلف',
        'إذا استمرت المشكلة، اتصل بدعمنا',
      ]
    }
    return [
      'Verify your card information is correct',
      'Ensure you have sufficient funds available',
      'Check your internet connection',
      'Try using a different browser',
      'If the issue persists, contact our support',
    ]
  }

  const getTroubleshootingItems_ar = () => {
    return [
      'تحقق من صحة معلومات بطاقتك',
      'تأكد من توفر الرصيد الكافي',
      'تحقق من اتصالك بالإنترنت',
      'حاول استخدام متصفح مختلف',
      'إذا استمرت المشكلة، اتصل بدعمنا',
    ]
  }

  const getTroubleshootingItems_en = () => {
    return [
      'Verify your card information is correct',
      'Ensure you have sufficient funds available',
      'Check your internet connection',
      'Try using a different browser',
      'If the issue persists, contact our support',
    ]
  }

  const troubleshootingItems = lang === 'ar' ? getTroubleshootingItems_ar() : getTroubleshootingItems_en()

  return (
    <div style={{ backgroundColor: 'var(--page-bg)' }} className="min-h-screen flex flex-col">
      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 flex items-center justify-center">
        <div className="text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(192, 42, 42, 0.1)' }}
            >
              <AlertCircle className="w-10 h-10" style={{ color: '#C02A2A' }} />
            </div>
          </div>

          {/* Heading */}
          <h1
            className="text-3xl font-extrabold mb-3"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
            }}
          >
            {getErrorTitle()}
          </h1>

          {/* Description */}
          <p
            className="text-lg mb-8 max-w-lg mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            {getErrorDescription()}
          </p>

          {/* Error Code (if available) */}
          {errorDetails?.code && (
            <p
              className="text-sm mb-6 font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {lang === 'ar' ? 'رمز الخطأ: ' : 'Error Code: '}
              <span style={{ color: '#C02A2A' }}>{errorDetails.code}</span>
            </p>
          )}

          {/* Troubleshooting Section */}
          <div
            className="p-6 rounded-lg mb-8"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <h3
              className="font-bold mb-4 flex items-center justify-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <HelpCircle className="w-5 h-5" />
              {getTroubleshootingTitle()}
            </h3>
            <ul
              className="space-y-2 text-left"
              style={{ color: 'var(--text-secondary)' }}
            >
              {troubleshootingItems.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Message */}
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--text-muted)' }}
          >
            {lang === 'ar'
              ? '📧 إذا كنت بحاجة إلى مساعدة، لا تتردد في الاتصال بنا'
              : '📧 If you need help, feel free to reach out to us'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/checkout"
              className="px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: '#1D6296',
                color: 'white',
              }}
            >
              {lang === 'ar' ? 'محاولة المدفوعات مجددا' : 'Try Again'}
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/packages"
              className="px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: 'var(--accent-50)',
                color: '#1D6296',
              }}
            >
              {lang === 'ar' ? 'العودة للحزم' : 'Back to Packages'}
            </Link>
          </div>

          {/* Support Link */}
          <p
            className="mt-8 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {lang === 'ar'
              ? 'هل تحتاج إلى مساعدة؟ '
              : 'Need help? '}
            <Link
              href="/support"
              className="font-semibold hover:underline"
              style={{ color: '#1D6296' }}
            >
              {lang === 'ar' ? 'اتصل بالدعم' : 'Contact support'}
            </Link>
          </p>
        </div>
      </main>

      {/* Footer Note */}
      <div
        className="border-t py-6 text-center text-xs"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        {lang === 'ar'
          ? '🔒 معاملتك آمنة ومشفرة. لم يتم خصم أي أموال من حسابك.'
          : '🔒 Your transaction is secure. No funds have been charged to your account.'}
      </div>
    </div>
  )
}
