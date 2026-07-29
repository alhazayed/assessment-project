import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { publicPageMetadata } from '@/lib/public-metadata'
import PublicMarketingShell from '@/components/public-marketing-shell'
import { getLanguage } from '@/lib/get-language'
import {
  LEARN_PAGES,
  LEARN_LEGACY_REDIRECTS,
  getLearnPageBySlug,
  getLearnContent,
  getRelatedLearnPages,
} from '@/lib/public-learn'
import { medicalWebPageSchema, breadcrumbSchema } from '@/lib/geo-schema'
import { PUBLIC_MEDICAL_CONTENT_REVIEWED } from '@/lib/site-url'
import { AlertTriangle, ChevronRight } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  const slugs = [...new Set(LEARN_PAGES.map(p => p.slug))]
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  if (LEARN_LEGACY_REDIRECTS[slug]) {
    return {}
  }
  const page = getLearnPageBySlug(slug)
  if (!page) return {}
  return publicPageMetadata({
    title: page.nameEn,
    description: page.shortEn,
    path: `/learn/${slug}`,
  })
}

export default async function LearnDetailPage({ params }: Props) {
  const { slug } = await params

  const legacyTarget = LEARN_LEGACY_REDIRECTS[slug]
  if (legacyTarget) {
    redirect(`/learn/${legacyTarget}`)
  }

  const page = getLearnPageBySlug(slug)
  if (!page) notFound()

  const lang = await getLanguage()
  const isRtl = lang === 'ar'
  const clinical = getLearnContent(page.code)
  const relatedFinal = getRelatedLearnPages(clinical?.relatedCodes ?? [], slug)

  const schemas = [
    medicalWebPageSchema({
      name: isRtl ? page.nameAr : page.nameEn,
      description: isRtl ? page.shortAr : page.shortEn,
      path: `/learn/${slug}`,
      citation: page.citation,
    }),
    breadcrumbSchema([
      { name: isRtl ? 'الرئيسية' : 'Home', path: '/' },
      { name: isRtl ? 'التعلم' : 'Learn', path: '/learn' },
      { name: isRtl ? page.nameAr : page.nameEn, path: `/learn/${slug}` },
    ]),
  ]

  return (
    <PublicMarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <nav className="text-[12px] mb-6 flex flex-wrap items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:underline">{isRtl ? 'الرئيسية' : 'Home'}</Link>
          <span>/</span>
          <Link href="/learn" className="hover:underline">{isRtl ? 'التعلم' : 'Learn'}</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{isRtl ? page.nameAr : page.nameEn}</span>
        </nav>

        <h1
          className="text-[32px] sm:text-[36px] font-extrabold tracking-tight mb-4"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
        >
          {isRtl ? page.nameAr : page.nameEn}
        </h1>

        <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
          {isRtl ? `آخر مراجعة: ${PUBLIC_MEDICAL_CONTENT_REVIEWED}` : `Last reviewed: ${PUBLIC_MEDICAL_CONTENT_REVIEWED}`}
        </p>

        <section className="card p-6 mb-6">
          <h2 className="text-[15px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {isRtl ? 'نظرة عامة' : 'Overview'}
          </h2>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {isRtl ? page.overviewAr : page.overviewEn}
          </p>
          <p className="text-[13px] mt-4" style={{ color: 'var(--text-muted)' }}>
            <strong>{isRtl ? 'يقيس:' : 'Measures:'}</strong>{' '}
            {isRtl ? page.measuresDomainAr : page.measuresDomainEn}
          </p>
        </section>

        {page.bands.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {isRtl ? 'تفسير النطاقات (ملخص)' : 'Score ranges (summary)'}
            </h2>
            <div className="space-y-3">
              {page.bands.map(band => (
                <div key={band.labelEn} className="card p-4">
                  <h3 className="text-[14px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {isRtl ? band.labelAr : band.labelEn}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {isRtl ? band.textAr : band.textEn}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {page.citation && (
          <section className="mb-6">
            <h2 className="text-[14px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {isRtl ? 'مرجع' : 'Reference'}
            </h2>
            <p className="text-[12.5px] italic" style={{ color: 'var(--text-muted)' }}>{page.citation}</p>
          </section>
        )}

        <div
          className="rounded-xl p-4 flex items-start gap-3 mb-8"
          style={{ background: '#FEF2EC', border: '1px solid #F3C5A0' }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F3650A' }} />
          <div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: '#9B3D08' }}>
              {isRtl ? 'تنبيه طبي' : 'Medical disclaimer'}
            </p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: '#C2560A' }}>
              {isRtl
                ? 'هذا الدليل للتثقيف فقط. الفحص لا يُعد تشخيصاً. اطلب تقييماً من مختص مؤهل. في الأزمة، اتصل بخدمات الطوارئ.'
                : 'This guide is for education only. Screening is not a diagnosis. Seek evaluation from a qualified clinician. In crisis, contact emergency services.'}
            </p>
          </div>
        </div>

        {relatedFinal.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[15px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              {isRtl ? 'أدلة ذات صلة' : 'Related guides'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedFinal.map(r => (
                <Link
                  key={r.slug}
                  href={`/learn/${r.slug}`}
                  className="text-[12.5px] px-3 py-1.5 rounded-full font-medium"
                  style={{ background: '#EAF2F9', color: '#1D6296', border: '1px solid #C7DFF0' }}
                >
                  {isRtl ? r.nameAr : r.nameEn}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/register" className="btn-accent gap-2">
            {isRtl ? 'ابدأ التقييم مجاناً' : 'Start free screening'}
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/learn" className="btn-secondary">
            {isRtl ? 'كل الأدلة' : 'All guides'}
          </Link>
        </div>
      </article>
    </PublicMarketingShell>
  )
}
