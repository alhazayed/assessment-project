import Link from 'next/link'
import { publicPageMetadata } from '@/lib/public-metadata'
import { absoluteUrl } from '@/lib/site-url'
import PublicMarketingShell from '@/components/public-marketing-shell'
import { getLanguage } from '@/lib/get-language'
import { LEARN_PAGES } from '@/lib/public-learn'
import { itemListSchema, breadcrumbSchema } from '@/lib/geo-schema'
import { BookOpen, ChevronRight } from 'lucide-react'

export const metadata = publicPageMetadata({
  title: 'Mental Health Screening Library',
  description:
    'Evidence-based guides to PHQ-9, GAD-7, WHO-5, DASS-21, PCL-5, ADHD, insomnia, and more. Bilingual screening education from V Welfare.',
  path: '/learn',
})

export default async function LearnIndexPage() {
  const lang = await getLanguage()
  const isRtl = lang === 'ar'

  const uniquePages = LEARN_PAGES.filter(
    (page, index, arr) => arr.findIndex(p => p.slug === page.slug) === index,
  )

  const schemas = [
    itemListSchema(
      uniquePages.map(p => ({
        name: isRtl ? p.nameAr : p.nameEn,
        url: absoluteUrl(`/learn/${p.slug}`),
        description: isRtl ? p.shortAr : p.shortEn,
      })),
    ),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Learn', path: '/learn' },
    ]),
  ]

  return (
    <PublicMarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-6 h-6" style={{ color: '#1D6296' }} />
          <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: '#1D6296' }}>
            {isRtl ? 'مكتبة التعلم' : 'Learn Library'}
          </span>
        </div>
        <h1
          className="text-[36px] font-extrabold tracking-tight mb-3"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
        >
          {isRtl ? 'دليل أدوات الفحص النفسي' : 'Mental Health Screening Guides'}
        </h1>
        <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
          {isRtl
            ? 'معلومات معتمدة عن أدوات الفحص النفسي — للتثقيف فقط وليست تشخيصاً.'
            : 'Evidence-based overviews of validated screening tools — for education only, not diagnosis.'}
        </p>
        <p className="text-[13px] mb-10" style={{ color: 'var(--text-muted)' }}>
          {isRtl ? 'آخر مراجعة للمحتوى: يوليو 2026' : 'Content last reviewed: July 2026'}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {uniquePages.map(page => (
            <Link
              key={page.slug}
              href={`/learn/${page.slug}`}
              className="card-hover p-5 flex flex-col gap-2"
            >
              <h2 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {isRtl ? page.nameAr : page.nameEn}
              </h2>
              <p className="text-[13px] flex-1" style={{ color: 'var(--text-secondary)' }}>
                {isRtl ? page.shortAr : page.shortEn}
              </p>
              <span className="text-[12px] font-semibold flex items-center gap-1" style={{ color: '#1D6296' }}>
                {isRtl ? 'اقرأ الدليل' : 'Read guide'}
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/faq" className="text-[13px] font-semibold" style={{ color: '#1D6296' }}>
            {isRtl ? 'لديك سؤال؟ راجع الأسئلة الشائعة ←' : 'Have a question? See FAQ →'}
          </Link>
        </div>
      </div>
    </PublicMarketingShell>
  )
}
