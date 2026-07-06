'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Zap } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

interface Package {
  id: string
  nameEn: string
  nameAr: string
  descEn: string
  descAr: string
  priceUSD: number
  priceMTH: string
  popular: boolean
  features: {
    en: string[]
    ar: string[]
  }
}

const PACKAGES: Package[] = [
  {
    id: 'basic',
    nameEn: 'Basic',
    nameAr: 'الأساسي',
    descEn: 'Essential assessments for personal wellness',
    descAr: 'التقييمات الأساسية لصحتك العقلية',
    priceUSD: 9.99,
    priceMTH: 'month',
    popular: false,
    features: {
      en: [
        'Up to 4 assessments per month',
        'Basic mood tracking',
        'PDF export of results',
        'Mobile-friendly access',
        'Email support',
      ],
      ar: [
        'ما يصل إلى 4 تقييمات شهريًا',
        'تتبع المزاج الأساسي',
        'تصدير النتائج كـ PDF',
        'الوصول من الهاتف المحمول',
        'دعم البريد الإلكتروني',
      ],
    },
  },
  {
    id: 'standard',
    nameEn: 'Standard',
    nameAr: 'القياسي',
    descEn: 'Complete assessment suite with insights',
    descAr: 'مجموعة تقييمات شاملة مع رؤى',
    priceUSD: 24.99,
    priceMTH: 'month',
    popular: true,
    features: {
      en: [
        'Unlimited assessments',
        'Advanced mood tracking',
        'Weekly progress reports',
        'Symptom trends & insights',
        'PDF & CSV export',
        'Priority email support',
        'Custom notes & annotations',
      ],
      ar: [
        'تقييمات غير محدودة',
        'تتبع المزاج المتقدم',
        'تقارير الأسبوع',
        'اتجاهات الأعراض والرؤى',
        'تصدير PDF و CSV',
        'دعم البريد الإلكتروني الأولوي',
        'ملاحظات وتعليقات مخصصة',
      ],
    },
  },
  {
    id: 'professional',
    nameEn: 'Professional',
    nameAr: 'احترافي',
    descEn: 'Advanced features for healthcare providers',
    descAr: 'ميزات متقدمة لمقدمي الرعاية الصحية',
    priceUSD: 49.99,
    priceMTH: 'month',
    popular: false,
    features: {
      en: [
        'Everything in Standard',
        'Shareable reports with providers',
        'Monthly wellness summaries',
        'Risk assessment alerts',
        'Integration with EHR systems',
        '24/7 priority support',
        'Custom assessment creation',
        'HIPAA compliant storage',
      ],
      ar: [
        'جميع ميزات القياسي',
        'تقارير قابلة للمشاركة مع الأطباء',
        'ملخصات الصحة الشهرية',
        'تنبيهات تقييم المخاطر',
        'التكامل مع أنظمة الرعاية',
        'دعم أولوي على مدار الساعة',
        'إنشاء تقييمات مخصصة',
        'تخزين متوافق مع HIPAA',
      ],
    },
  },
]

function PackageCard({
  pkg,
  lang,
  isRtl,
}: {
  pkg: Package
  lang: 'en' | 'ar'
  isRtl: boolean
}) {
  const name = lang === 'ar' ? pkg.nameAr : pkg.nameEn
  const desc = lang === 'ar' ? pkg.descAr : pkg.descEn
  const features = pkg.features[lang]

  // Emphasise the popular card with ring + shadow (and a small upward lift on
  // wide screens) instead of `scale-105`. Scaling a grid item grows its rendered
  // box into its neighbours, which cropped adjacent card titles, prices, and
  // buttons.
  return (
    <div
      className={`relative flex flex-col h-full rounded-2xl border-2 transition-all ${
        pkg.popular
          ? 'border-[#1D6296] shadow-xl ring-2 ring-[#1D6296] lg:-translate-y-2'
          : 'border-[var(--border)]'
      }`}
      style={{
        backgroundColor: pkg.popular ? 'rgba(29, 98, 150, 0.05)' : 'var(--surface)',
      }}
    >
      {/* Popular Badge */}
      {pkg.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: '#1D6296' }}
          >
            <Zap className="w-4 h-4" />
            {lang === 'ar' ? 'الأكثر شيوعًا' : 'Most Popular'}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-8 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {name}
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          {desc}
        </p>

        {/* Pricing */}
        <div className="flex items-baseline gap-1 mb-2">
          <span
            className="text-4xl font-bold"
            style={{ color: '#1D6296' }}
          >
            ${pkg.priceUSD}
          </span>
          <span
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            /{pkg.priceMTH}
          </span>
        </div>
        <p
          className="text-xs mb-6"
          style={{ color: 'var(--text-muted)' }}
        >
          {lang === 'ar'
            ? 'بدون التزام - إلغاء في أي وقت'
            : 'No commitment — cancel anytime'}
        </p>

        {/* CTA Button */}
        <Link
          href={`/checkout?package=${pkg.id}`}
          className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all mb-2"
          style={{
            backgroundColor: pkg.popular ? '#1D6296' : 'var(--accent-50)',
            color: pkg.popular ? 'white' : '#1D6296',
          }}
        >
          {lang === 'ar' ? 'اختر هذه الخطة' : 'Choose Plan'}
          <ArrowRight className="w-4 h-4" />
        </Link>

        <p
          className="text-xs text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          {lang === 'ar'
            ? 'نسخة تجريبية مجانية لمدة 7 أيام'
            : 'Free 7-day trial'}
        </p>
      </div>

      {/* Features */}
      <div className="flex-1 p-8">
        <ul className="space-y-4">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className="flex gap-3 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Check
                className="w-5 h-5 flex-shrink-0"
                style={{ color: '#1B8A5A' }}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function PackagesPage() {
  const lang = useLang()
  const isRtl = lang === 'ar'

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link href="/dashboard" className="font-bold text-lg">
            {lang === 'ar' ? '← العودة' : '← Back'}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1
            className="text-4xl sm:text-5xl font-extrabold mb-4"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
            }}
          >
            {lang === 'ar'
              ? 'اختر خطتك المثالية'
              : 'Choose Your Perfect Plan'}
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            {lang === 'ar'
              ? 'احصل على الوصول إلى تقييمات شاملة وأدوات تتبع الأعراض المتقدمة'
              : 'Get access to comprehensive assessments and advanced symptom tracking'}
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          className="grid gap-8 mb-16 sm:grid-cols-2 lg:grid-cols-3 overflow-visible"
          style={{ gridAutoRows: 'max-content' }}
        >
          {PACKAGES.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              lang={lang as 'en' | 'ar'}
              isRtl={isRtl}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-bold mb-8 text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            {lang === 'ar'
              ? 'الأسئلة الشائعة'
              : 'Frequently Asked Questions'}
          </h2>

          <div className="space-y-6">
            {[
              {
                q: lang === 'ar'
                  ? 'هل يمكنني تغيير خطتي لاحقًا؟'
                  : 'Can I change my plan later?',
                a: lang === 'ar'
                  ? 'نعم، يمكنك الترقية أو الانخفاض في أي وقت. سيتم تطبيق التغييرات على الفور.'
                  : 'Yes, you can upgrade or downgrade anytime. Changes apply immediately.',
              },
              {
                q: lang === 'ar'
                  ? 'هل تقدمون نسخة تجريبية مجانية؟'
                  : 'Do you offer a free trial?',
                a: lang === 'ar'
                  ? 'نعم، 7 أيام مجانية لجميع الخطط. لا توجد بطاقة ائتمان مطلوبة.'
                  : 'Yes, 7 days free on all plans. No credit card required.',
              },
              {
                q: lang === 'ar'
                  ? 'ماذا يحدث عند إلغاء الاشتراك؟'
                  : 'What happens when I cancel?',
                a: lang === 'ar'
                  ? 'يمكنك الإلغاء في أي وقت. ستفقد الوصول عند نهاية الفترة المدفوعة.'
                  : "You can cancel anytime. You'll lose access at the end of your billing period.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <h3
                  className="font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {faq.q}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Section */}
        <div className="mt-16 pt-16 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p
                className="text-3xl font-bold mb-2"
                style={{ color: '#1D6296' }}
              >
                39+
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {lang === 'ar' ? 'تقييمات مثبتة' : 'Validated Assessments'}
              </p>
            </div>
            <div>
              <p
                className="text-3xl font-bold mb-2"
                style={{ color: '#1D6296' }}
              >
                100%
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {lang === 'ar' ? 'سري وآمن' : 'Confidential & Secure'}
              </p>
            </div>
            <div>
              <p
                className="text-3xl font-bold mb-2"
                style={{ color: '#1D6296' }}
              >
                24/7
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {lang === 'ar' ? 'دعم متاح' : 'Support Available'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
