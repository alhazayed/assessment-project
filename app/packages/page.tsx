import Link from 'next/link'
import { ArrowRight, Check, FileText, Layers, Target } from 'lucide-react'
import PublicMarketingShell from '@/components/public-marketing-shell'
import { getLanguage } from '@/lib/get-language'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPackagesEnabled } from '@/lib/feature-flags'
import { packageReportContents, packageScaleNames } from '@/lib/package-profiles/catalog'

/**
 * Public package catalog. The platform is free; packages are the only paid
 * product. Each card says what the package is for, what its combined report
 * contains, and its one-time price.
 */

interface CatalogRow {
  id: string
  profile_key: string | null
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  purpose_en: string | null
  purpose_ar: string | null
  color: string | null
  price_cents: number | null
  currency: string | null
}

function formatPrice(cents: number, currency: string | null, lang: 'en' | 'ar'): string {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

export default async function PackagesCatalogPage() {
  const lang = await getLanguage()
  const isAr = lang === 'ar'
  const onSale = await isPackagesEnabled()

  // Public catalog data only (names, descriptions, prices); read server-side.
  const { data } = await createAdminClient()
    .from('packages')
    .select('id, profile_key, name_en, name_ar, description_en, description_ar, purpose_en, purpose_ar, color, price_cents, currency')
    .eq('status', 'active')
    .not('profile_key', 'is', null)
    .order('sort_order', { ascending: true })
  const packages = (data ?? []) as CatalogRow[]

  return (
    <PublicMarketingShell>
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1
            className="text-3xl sm:text-5xl font-extrabold mb-4"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            {isAr ? 'باقات التقييم' : 'Assessment packages'}
          </h1>
          <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {isAr
              ? 'كل التقييمات على المنصة مجانية. الباقة تجمع عدة تقييمات معتمدة وتقرأ نتائجها معاً في تقرير واحد. تدفع مرة واحدة، بلا اشتراك.'
              : 'Every assessment on the platform is free. A package brings several validated assessments together and reads their results as one report. You pay once; there is no subscription.'}
          </p>
        </div>

        {packages.length === 0 ? (
          <p className="text-center" style={{ color: 'var(--text-muted)' }}>
            {isAr ? 'لا توجد باقات متاحة حالياً.' : 'No packages are available right now.'}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {packages.map(pkg => {
              const name = isAr ? pkg.name_ar : pkg.name_en
              const desc = isAr ? pkg.description_ar : pkg.description_en
              const purpose = isAr ? pkg.purpose_ar : pkg.purpose_en
              const contents = packageReportContents(pkg.profile_key)
              const scales = packageScaleNames(pkg.profile_key)
              const color = pkg.color || '#1D6296'
              const price = pkg.price_cents ? formatPrice(pkg.price_cents, pkg.currency, lang) : null

              return (
                <article
                  key={pkg.id}
                  className="card p-6 flex flex-col"
                  style={{ borderTop: `4px solid ${color}` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {name}
                    </h2>
                    {price && onSale && (
                      <span className="text-xl font-extrabold whitespace-nowrap" style={{ color }}>
                        {price}
                      </span>
                    )}
                  </div>
                  {desc && (
                    <p className="text-[14px] mb-5" style={{ color: 'var(--text-secondary)' }}>
                      {desc}
                    </p>
                  )}

                  {purpose && (
                    <section className="mb-5">
                      <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                        <Target className="w-4 h-4" aria-hidden="true" />
                        {isAr ? 'لمن هذه الباقة وبماذا تساعد' : 'Who it is for and how it helps'}
                      </h3>
                      <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{purpose}</p>
                    </section>
                  )}

                  {contents.length > 0 && (
                    <section className="mb-5">
                      <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                        <FileText className="w-4 h-4" aria-hidden="true" />
                        {isAr ? 'ما يتضمنه التقرير' : 'What the report gives you'}
                      </h3>
                      <ul className="space-y-1.5">
                        {contents.map((c, i) => (
                          <li key={i} className="flex gap-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#1B8A5A' }} aria-hidden="true" />
                            <span>{isAr ? c.ar : c.en}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {scales.length > 0 && (
                    <section className="mb-6">
                      <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                        <Layers className="w-4 h-4" aria-hidden="true" />
                        {isAr ? `التقييمات المشمولة (${scales.length})` : `Assessments included (${scales.length})`}
                      </h3>
                      <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {scales.map(s => (isAr ? s.ar : s.en)).join(isAr ? '، ' : ', ')}
                      </p>
                    </section>
                  )}

                  <div className="mt-auto">
                    {onSale && price ? (
                      <Link
                        href={`/packages/${pkg.id}`}
                        className="btn-accent w-full inline-flex items-center justify-center gap-2"
                      >
                        {isAr ? `احصل على الباقة · ${price}` : `Get this package · ${price}`}
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                      </Link>
                    ) : (
                      <p
                        className="text-center text-[13px] font-semibold py-2.5 rounded-lg"
                        style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)' }}
                      >
                        {isAr ? 'متاحة قريباً' : 'Available soon'}
                      </p>
                    )}
                    <p className="text-center text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      {isAr
                        ? 'التقييمات داخل الباقة مجانية دائماً؛ الدفع للتقرير المجمّع فقط.'
                        : 'The assessments inside are always free; you pay only for the combined report.'}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <p className="text-center text-[12.5px] mt-10 max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
          {isAr
            ? 'التقارير للفحص والتأمل الذاتي وليست تشخيصاً. للتشخيص والعلاج راجع مختصاً مرخصاً.'
            : 'Reports are for screening and self-reflection, not a diagnosis. For diagnosis and treatment, see a licensed professional.'}
        </p>
      </main>
    </PublicMarketingShell>
  )
}
