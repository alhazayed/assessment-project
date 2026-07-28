import { publicPageMetadata } from '@/lib/public-metadata'
import PublicMarketingShell from '@/components/public-marketing-shell'
import { getLanguage } from '@/lib/get-language'
import { PLATFORM_FAQ } from '@/lib/faq-content'
import { faqPageSchema, breadcrumbSchema } from '@/lib/geo-schema'
import Link from 'next/link'

export const metadata = publicPageMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Answers about V Welfare mental health screening: Is it a diagnosis? Privacy, Arabic/English support, free assessments, crisis resources, and clinician access.',
  path: '/faq',
})

export default async function FaqPage() {
  const lang = await getLanguage()
  const isRtl = lang === 'ar'

  const schemas = [
    faqPageSchema(PLATFORM_FAQ),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'FAQ', path: '/faq' },
    ]),
  ]

  return (
    <PublicMarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1
          className="text-[36px] font-extrabold tracking-tight mb-3"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
        >
          {isRtl ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </h1>
        <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
          {isRtl
            ? 'إجابات عن منصة V Welfare، الخصوصية، والتقييمات النفسية المعتمدة.'
            : 'Common questions about V Welfare, privacy, and validated mental health screening.'}
        </p>

        <div className="space-y-4">
          {PLATFORM_FAQ.map(item => (
            <details key={item.id} className="card p-5 group" open={item.id === 'what-is-v-welfare'}>
              <summary
                className="text-[15px] font-semibold cursor-pointer list-none flex items-center justify-between gap-3"
                style={{ color: 'var(--text-primary)' }}
              >
                {isRtl ? item.questionAr : item.questionEn}
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {isRtl ? item.answerAr : item.answerEn}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl text-center" style={{ background: '#EAF2F9', border: '1px solid #C7DFF0' }}>
          <p className="text-[14px] mb-4" style={{ color: '#12273C' }}>
            {isRtl ? 'استكشف أدوات الفحص المعتمدة في مكتبة التعلم.' : 'Explore validated screening tools in our Learn library.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/learn" className="btn-primary">{isRtl ? 'مكتبة التعلم' : 'Browse Learn'}</Link>
            <Link href="/register" className="btn-accent">{isRtl ? 'إنشاء حساب مجاني' : 'Create free account'}</Link>
          </div>
        </div>
      </div>
    </PublicMarketingShell>
  )
}
