'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Download, ArrowRight } from 'lucide-react'
import { useLang } from '@/lib/use-lang'

interface PaymentDetails {
  id: string
  package_id: string
  amount_cents: number
  status: string
  created_at: string
  promo_code_id?: string
}

const PACKAGES: Record<string, { nameEn: string; nameAr: string }> = {
  basic: { nameEn: 'Basic', nameAr: 'الأساسي' },
  standard: { nameEn: 'Standard', nameAr: 'القياسي' },
  professional: { nameEn: 'Professional', nameAr: 'احترافي' },
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const lang = useLang()
  const isRtl = lang === 'ar'

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real implementation, fetch payment details from API
    // For now, we'll show a generic success message
    setLoading(false)
  }, [])

  const packageId = searchParams.get('package') || 'standard'
  const packageName = PACKAGES[packageId]

  return (
    <div style={{ backgroundColor: 'var(--page-bg)' }} className="min-h-screen flex flex-col">
      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 flex items-center justify-center">
        <div className="text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#E6F4EC' }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: '#1B8A5A' }} />
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
            {lang === 'ar'
              ? '🎉 شكراً لك!'
              : '🎉 Thank You!'}
          </h1>

          {/* Subheading */}
          <p
            className="text-lg mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            {lang === 'ar'
              ? 'تم تفعيل اشتراكك بنجاح'
              : 'Your subscription has been activated successfully'}
          </p>

          {/* Package Details */}
          <div
            className="p-8 rounded-lg mb-8"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <p
              className="text-sm mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {lang === 'ar' ? 'الحزمة المفعلة' : 'Active Package'}
            </p>
            <h2
              className="text-2xl font-bold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              {lang === 'ar'
                ? packageName.nameAr
                : packageName.nameEn}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 text-left">
              {/* Activation Date */}
              <div>
                <p
                  className="text-sm mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {lang === 'ar' ? '📅 تاريخ التفعيل' : '📅 Activation Date'}
                </p>
                <p
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {new Date().toLocaleDateString(
                    lang === 'ar' ? 'ar-SA' : 'en-US',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }
                  )}
                </p>
              </div>

              {/* Renewal Date */}
              <div>
                <p
                  className="text-sm mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {lang === 'ar'
                    ? '🔄 تاريخ التجديد'
                    : '🔄 Renewal Date'}
                </p>
                <p
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString(
                    lang === 'ar' ? 'ar-SA' : 'en-US',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div
            className="p-6 rounded-lg mb-8"
            style={{
              backgroundColor: 'rgba(29, 98, 150, 0.05)',
              border: '1px solid rgba(29, 98, 150, 0.1)',
            }}
          >
            <h3
              className="font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {lang === 'ar'
                ? '✨ الخطوات التالية'
                : '✨ What\'s Next'}
            </h3>
            <ul
              className="space-y-2 text-left"
              style={{ color: 'var(--text-secondary)' }}
            >
              <li className="flex gap-2">
                <span style={{ color: '#1D6296' }}>✓</span>
                <span>
                  {lang === 'ar'
                    ? 'وصول غير محدود للتقييمات'
                    : 'Unlimited access to assessments'}
                </span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: '#1D6296' }}>✓</span>
                <span>
                  {lang === 'ar'
                    ? 'تتبع التقدم والإحصائيات'
                    : 'Track progress and analytics'}
                </span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: '#1D6296' }}>✓</span>
                <span>
                  {lang === 'ar'
                    ? 'تحميل التقارير كـ PDF'
                    : 'Download reports as PDF'}
                </span>
              </li>
            </ul>
          </div>

          {/* Confirmation Email */}
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--text-muted)' }}
          >
            {lang === 'ar'
              ? '📧 تم إرسال تأكيد الاشتراك إلى بريدك الإلكتروني'
              : '📧 A confirmation email has been sent to your inbox'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: '#1D6296',
                color: 'white',
              }}
            >
              {lang === 'ar' ? 'الذهاب إلى لوحة التحكم' : 'Go to Dashboard'}
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
              {lang === 'ar' ? 'عرض جميع الحزم' : 'View All Packages'}
            </Link>
          </div>

          {/* FAQ Link */}
          <p
            className="mt-8 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {lang === 'ar'
              ? 'هل لديك أسئلة؟ '
              : 'Have questions? '}
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
          ? '🔒 معاملتك آمنة ومشفرة. سيتم شحن بطاقتك في كل فترة تجديد.'
          : '🔒 Your transaction is secure. Your card will be charged on each renewal date.'}
      </div>
    </div>
  )
}
