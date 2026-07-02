import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers, Construction, ShieldAlert, CheckCircle2, Circle } from 'lucide-react'

interface PackageAssessment {
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  is_available: boolean
  sort_order: number
}

interface Package {
  id: string
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  purpose_en: string | null
  purpose_ar: string | null
  category: string
  status: string
  color: string
  index_name_en: string | null
  index_name_ar: string | null
  is_prototype: boolean | null
  interpretation_bands: Array<{ min: number; max: number; band_en: string; band_ar: string; color: string }>
  output_dimensions: Array<{ key: string; label_en: string; label_ar: string }>
  package_assessments: PackageAssessment[]
  sort_order: number
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  marriage:   { en: 'Marriage & Relationships', ar: 'الزواج والعلاقات' },
  employment: { en: 'Employment & Career',       ar: 'التوظيف والمسار المهني' },
  leadership: { en: 'Leadership',                ar: 'القيادة' },
  academic:   { en: 'Academic & Learning',       ar: 'التحصيل الأكاديمي' },
  general:    { en: 'General',                   ar: 'عام' },
}

export default async function PackagesPage() {
  const supabase = createClient()
  const lang = getLanguage()
  const isAr = lang === 'ar'
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/packages')

  let packages: Package[] = []
  try {
    const { data } = await supabase
      .from('packages')
      .select('*, package_assessments(assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)')
      .order('sort_order')
    packages = (data || []) as Package[]
  } catch {
    // table may not exist yet — show empty state gracefully
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
            >
              {t('packages.title', lang)}
            </h1>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
              style={{ backgroundColor: 'var(--accent-50)', color: 'var(--accent-600)', border: '1px solid var(--accent-200)' }}
            >
              {t('packages.coming_soon', lang)}
            </span>
          </div>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {t('packages.subtitle', lang)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-50)' }}>
          <Layers className="w-5 h-5 text-brand-600" />
        </div>
      </div>

      {/* Under-Development Banner */}
      <div
        className="rounded-xl p-4 sm:p-5 mb-8 flex gap-4"
        style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}
      >
        <Construction className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EA580C' }} />
        <div>
          <p className="text-[14px] font-semibold mb-1" style={{ color: '#9A3412' }}>
            {t('packages.under_dev', lang)}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: '#C2410C' }}>
            {t('packages.under_dev_sub', lang)}
          </p>
        </div>
      </div>

      {/* Package Cards */}
      {packages.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {t('packages.empty', lang)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {packages.map(pkg => {
            const name = isAr ? pkg.name_ar : pkg.name_en
            const description = isAr ? pkg.description_ar : pkg.description_en
            const indexName = isAr ? pkg.index_name_ar : pkg.index_name_en
            const catLabel = CATEGORY_LABELS[pkg.category]
            const sortedAssessments = [...(pkg.package_assessments || [])].sort((a, b) => a.sort_order - b.sort_order)
            const totalWeight = sortedAssessments.reduce((s, a) => s + a.weight_pct, 0)
            const availableCount = sortedAssessments.filter(a => a.is_available).length

            return (
              <div
                key={pkg.id}
                className="card overflow-hidden flex flex-col"
                style={{ borderTop: `3px solid ${pkg.color}` }}
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${pkg.color}18`, color: pkg.color }}>
                          {catLabel ? (isAr ? catLabel.ar : catLabel.en) : pkg.category}
                        </span>
                        {pkg.is_prototype && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--divider)' }}>
                            {t('packages.prototype_badge', lang)}
                          </span>
                        )}
                      </div>
                      <h2 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {name}
                      </h2>
                    </div>
                  </div>
                  {description && (
                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {description}
                    </p>
                  )}
                </div>

                {/* Assessments List */}
                <div className="px-5 pb-4 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    {t('packages.components', lang)}
                  </p>
                  <div className="space-y-1.5">
                    {sortedAssessments.map(a => (
                      <div key={a.assessment_code} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {a.is_available
                            ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                            : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          }
                          <span className="text-[12.5px]" style={{ color: a.is_available ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {isAr ? a.name_ar : a.name_en}
                            {!a.is_available && <span className="ms-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>*</span>}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {a.weight_pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                  {totalWeight > 0 && (
                    // Flex segments, not absolute positioning: absolute children here had
                    // no `relative` ancestor on the track, so they anchored to the page and
                    // painted across neighbouring cards (and `left` doesn't mirror in RTL).
                    <div className="mt-2.5 h-1.5 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--surface-alt)' }}>
                      {sortedAssessments.map(a => (
                        <div
                          key={a.assessment_code}
                          className="h-full"
                          style={{ width: `${a.weight_pct}%`, backgroundColor: a.is_available ? pkg.color : `${pkg.color}55` }}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    {availableCount}/{sortedAssessments.length}{' '}
                    {isAr ? 'مقاييس متاحة حالياً' : 'scales currently available'}
                  </p>
                </div>

                {/* Output Index */}
                {indexName && (
                  <div className="px-5 pb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                      {t('packages.output_index', lang)}
                    </p>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: `${pkg.color}0D`, border: `1px solid ${pkg.color}30` }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pkg.color }} />
                      <span className="text-[12.5px] font-semibold" style={{ color: pkg.color }}>{indexName}</span>
                      <span className="text-[11px] ms-auto" style={{ color: 'var(--text-muted)' }}>{t('packages.score_scale', lang)}</span>
                    </div>
                    {/* Interpretation bands */}
                    {pkg.interpretation_bands?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {pkg.interpretation_bands.map((band, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${band.color}18`, color: band.color, border: `1px solid ${band.color}30` }}>
                            {band.min}–{band.max} {isAr ? band.band_ar : band.band_en}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Output Dimensions */}
                {pkg.output_dimensions?.length > 0 && (
                  <div className="px-5 pb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                      {t('packages.dimensions', lang)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.output_dimensions.map(dim => (
                        <span key={dim.key} className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}>
                          {isAr ? dim.label_ar : dim.label_en}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Footer */}
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--divider)', backgroundColor: 'var(--surface-alt)' }}>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {availableCount > 0
                      ? (isAr ? `${availableCount} مقاييس متاحة` : `${availableCount} available`)
                      : (isAr ? 'قيد التطوير' : 'Under development')}
                  </span>
                  {availableCount > 0 ? (
                    <Link
                      href={`/packages/${pkg.id}`}
                      className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                      style={{ backgroundColor: pkg.color, color: '#fff' }}
                    >
                      {isAr ? 'عرض الباقة' : 'View Package'}
                    </Link>
                  ) : (
                    <span
                      className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg cursor-not-allowed opacity-50"
                      style={{ backgroundColor: pkg.color, color: '#fff' }}
                    >
                      {t('packages.coming_soon', lang)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div
        className="mt-8 p-4 rounded-xl flex gap-3"
        style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--divider)' }}
      >
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {isAr
            ? 'هذه الباقات أدوات فحص وتطوير ذاتي ولا تشكّل تشخيصاً سريرياً أو قراراً وظيفياً أو رأياً قانونياً أو توصية زواجية.'
            : 'These packages are screening and self-development tools and do not constitute a clinical diagnosis, employment decision, legal opinion, or marital recommendation.'}
        </p>
      </div>
    </div>
  )
}
