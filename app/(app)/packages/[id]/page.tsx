import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { localizeSeverity } from '@/lib/severity-labels'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lock, Layers, ShoppingBag } from 'lucide-react'
import { hasPackageAccess } from '@/lib/billing/package-access'
import { packageSaleState } from '@/lib/billing/product'
import { isPackagesEnabled } from '@/lib/feature-flags'
import ComputeButton from './compute-button'
import type { InterpretationBand, OutputDimension } from '@/lib/types'

interface PkgAssessment {
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  is_available: boolean
  sort_order: number
}

interface PkgRow {
  id: string
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  category: string
  status: string
  color: string
  index_name_en: string | null
  index_name_ar: string | null
  is_prototype: boolean
  scoring_method: string
  interpretation_bands: InterpretationBand[]
  output_dimensions: OutputDimension[]
  disclaimer_en: string
  disclaimer_ar: string
  price_cents: number | null
  currency: string | null
  package_assessments: PkgAssessment[]
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  marriage:   { en: 'Marriage & Relationships', ar: 'الزواج والعلاقات' },
  employment: { en: 'Employment & Career',       ar: 'التوظيف والمسار المهني' },
  leadership: { en: 'Leadership',                ar: 'القيادة' },
  academic:   { en: 'Academic & Learning',       ar: 'التحصيل الأكاديمي' },
  general:    { en: 'General',                   ar: 'عام' },
}

export default async function PackageDetailPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ purchased?: string }>
}) {
  const params = await props.params;
  const justPurchased = (await props.searchParams).purchased === '1'
  const supabase = await createClient()
  const lang = await getLanguage()
  const isAr = lang === 'ar'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/packages/${params.id}`)

  const db = createAdminClient()

  const { data: pkg } = await db
    .from('packages')
    .select('*, package_assessments(assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)')
    .eq('id', params.id)
    .single()

  if (!pkg) notFound()

  const row = pkg as PkgRow
  const name = isAr ? row.name_ar : row.name_en
  const description = isAr ? row.description_ar : row.description_en
  const catLabel = CATEGORY_LABELS[row.category]
  // Profile packages report each scale on its own bands; there is no 0–100 index or weights.
  const isProfile = row.scoring_method === 'profile_rules'

  const sortedAssessments = [...row.package_assessments].sort((a, b) => a.sort_order - b.sort_order)
  const availableAssessments = sortedAssessments.filter(a => a.is_available)

  // Resolve assessment codes → definition IDs for linking to assessment pages
  const codes = availableAssessments.map(a => a.assessment_code)
  const { data: definitions } = await db
    .from('assessment_definitions')
    .select('id, code')
    .in('code', codes)

  const defIdByCode = new Map((definitions ?? []).map(d => [d.code, d.id]))

  // Check which available assessments this user has completed
  const defIds = (definitions ?? []).map(d => d.id)
  const { data: submissions } = defIds.length > 0
    ? await db
        .from('assessment_submissions')
        .select('definition_id, total_score, submitted_at, severity_band')
        .eq('patient_id', user.id)
        .in('definition_id', defIds)
        .order('submitted_at', { ascending: false })
    : { data: [] }

  const latestByDef = new Map<string, { total_score: number; severity_band: string }>()
  for (const s of (submissions ?? [])) {
    if (!latestByDef.has(s.definition_id)) {
      latestByDef.set(s.definition_id, { total_score: s.total_score, severity_band: s.severity_band })
    }
  }

  const completedCodes = new Set(
    availableAssessments
      .filter(a => {
        const defId = defIdByCode.get(a.assessment_code)
        return defId ? latestByDef.has(defId) : false
      })
      .map(a => a.assessment_code)
  )

  const allAvailableCompleted = availableAssessments.length > 0 &&
    availableAssessments.every(a => completedCodes.has(a.assessment_code))

  // Check if result already exists
  const { data: existingResult } = await db
    .from('package_results')
    .select('id, composite_score, band_en, band_ar, completed_at')
    .eq('package_id', params.id)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .maybeSingle()

  // The individual assessments are free; the combined report is paid.
  const [hasAccess, salesOpen] = await Promise.all([
    hasPackageAccess(db, user.id, params.id),
    isPackagesEnabled(),
  ])
  const forSale = salesOpen && packageSaleState(row) === 'for_sale'
  const priceLabel = row.price_cents != null
    ? new Intl.NumberFormat(isAr ? 'ar-SA' : 'en-US', { style: 'currency', currency: (row.currency || 'usd').toUpperCase() }).format(row.price_cents / 100)
    : null

  const resultPath = `/packages/${params.id}/result`
  const backLabel = t('packages.detail.back', lang)

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Back link */}
      <Link
        href="/my-packages"
        className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors hover:underline"
        style={{ color: 'var(--text-muted)' }}
      >
        {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${row.color}18` }}
        >
          <Layers className="w-6 h-6" style={{ color: row.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${row.color}18`, color: row.color }}
            >
              {catLabel ? (isAr ? catLabel.ar : catLabel.en) : row.category}
            </span>
            {row.is_prototype && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--divider)' }}>
                {t('packages.prototype_badge', lang)}
              </span>
            )}
            {row.status === 'draft' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ backgroundColor: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                {t('packages.coming_soon', lang)}
              </span>
            )}
          </div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            {name}
          </h1>
          {description && (
            <p className="text-[13.5px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Progress card */}
      <div
        className="card p-5 mb-6"
        style={{ borderTop: `3px solid ${row.color}` }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          {t('packages.detail.progress', lang)}
        </p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {completedCodes.size} / {availableAssessments.length} {t('packages.detail.completed_of', lang)}
          </span>
          <span className="text-[12px] font-mono" style={{ color: row.color }}>
            {availableAssessments.length > 0
              ? Math.round((completedCodes.size / availableAssessments.length) * 100)
              : 0}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-alt)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: availableAssessments.length > 0
                ? `${(completedCodes.size / availableAssessments.length) * 100}%`
                : '0%',
              backgroundColor: row.color,
            }}
          />
        </div>

        {/* Existing result summary */}
        {hasAccess && existingResult && (
          <div
            className="mt-4 p-3 rounded-lg flex items-center justify-between gap-3"
            style={{ backgroundColor: `${row.color}10`, border: `1px solid ${row.color}30` }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                {isProfile ? t('packages.result.title', lang) : t('packages.result.composite', lang)}
              </p>
              {isProfile ? (
                <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {isAr ? existingResult.band_ar : existingResult.band_en}
                </p>
              ) : (<>
              <p className="text-[22px] font-extrabold" style={{ color: row.color }}>
                {existingResult.composite_score}
                <span className="text-[13px] font-normal ms-1" style={{ color: 'var(--text-muted)' }}>/100</span>
              </p>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {isAr ? existingResult.band_ar : existingResult.band_en}
              </p>
              </>)}
            </div>
          </div>
        )}

        {justPurchased && (
          <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#E6F4EC', color: '#1B8A5A' }} role="status">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            <p className="text-[13px] font-medium">
              {hasAccess
                ? (isAr ? 'تم الشراء. التقرير المجمّع لهذه الباقة متاح لك الآن.' : 'Purchase complete. The combined report for this package is now unlocked.')
                : (isAr ? 'نؤكد عملية الدفع. حدّث الصفحة بعد لحظات.' : 'We are confirming your payment. Refresh this page in a moment.')}
            </p>
          </div>
        )}

        {/* Action */}
        {hasAccess ? (
        <div className="mt-4">
          <ComputeButton
            packageId={params.id}
            labelCompute={t('packages.detail.compute', lang)}
            labelComputing={t('packages.detail.computing', lang)}
            hasResult={!!existingResult}
            labelViewResults={t('packages.detail.view_results', lang)}
            resultPath={resultPath}
            allCompleted={allAvailableCompleted}
            labelCompleteAll={t('packages.detail.complete_all', lang)}
          />
          {forSale && (
            <Link href={`/checkout?package=${params.id}`} className="mt-3 inline-block text-[12.5px] font-semibold underline" style={{ color: '#1D6296' }}>
              {isAr ? 'اشترِ هذه الباقة هدية لشخص آخر' : 'Buy this package as a gift for someone'}
            </Link>
          )}
        </div>
        ) : (
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--divider)' }}>
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: row.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isAr ? 'التقرير المجمّع مدفوع' : 'The combined report is a paid extra'}
              </p>
              <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {isAr
                  ? 'يمكنك إجراء كل مقياس مجاناً. شراء الباقة يفتح تقريراً واحداً يقرأ نتائجك معاً، مع ملف PDF. دفعة واحدة، بلا اشتراك.'
                  : 'You can take each assessment for free. Buying the package unlocks one report that reads your results together, with a PDF. One-time payment, no subscription.'}
              </p>
              {forSale ? (
                <Link
                  href={`/checkout?package=${params.id}`}
                  className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg"
                  style={{ backgroundColor: row.color, color: '#fff' }}
                >
                  <ShoppingBag className="w-4 h-4" aria-hidden />
                  {isAr ? `اشترِ الباقة · ${priceLabel}` : `Buy package · ${priceLabel}`}
                </Link>
              ) : (
                <p className="text-[12px] mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                  {isAr ? 'غير متاحة للشراء بعد.' : 'Not on sale yet.'}
                </p>
              )}
              <p className="text-[12px] mt-3" style={{ color: 'var(--text-secondary)' }}>
                <Link href="/redeem" className="font-semibold underline" style={{ color: '#1D6296' }}>
                  {isAr ? 'لديك رمز هدية؟ استخدمه هنا' : 'Have a gift code? Redeem it'}
                </Link>
              </p>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Component assessments */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('packages.detail.components', lang)}
          </p>
        </div>
        <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {sortedAssessments.map(a => {
            const aName = isAr ? a.name_ar : a.name_en
            const defId = defIdByCode.get(a.assessment_code)
            const submission = defId ? latestByDef.get(defId) : undefined
            const isDone = completedCodes.has(a.assessment_code)

            return (
              <div
                key={a.assessment_code}
                className="flex items-center gap-4 px-5 py-4"
                style={{ borderColor: 'var(--divider)' }}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {!a.is_available ? (
                    <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  ) : isDone ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
                  ) : (
                    <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                {/* Name + score */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13.5px] font-medium truncate"
                    style={{ color: a.is_available ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {aName}
                  </p>
                  {submission && (
                    <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                      {t('packages.detail.score_label', lang)}: {submission.total_score} · {localizeSeverity(submission.severity_band, lang)}
                    </p>
                  )}
                  {!a.is_available && (
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {t('packages.detail.unavailable', lang)}
                    </p>
                  )}
                </div>

                {/* Weight */}
                {!isProfile && <span className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {a.weight_pct}%
                </span>}

                {/* Action button */}
                {a.is_available && defId && (
                  <Link
                    href={`/assessments/${defId}`}
                    className="flex-shrink-0 text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: isDone ? 'var(--surface-alt)' : `${row.color}18`,
                      color: isDone ? 'var(--text-muted)' : row.color,
                      border: `1px solid ${isDone ? 'var(--divider)' : `${row.color}40`}`,
                    }}
                  >
                    {isDone ? t('packages.detail.retake', lang) : t('packages.detail.take', lang)}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Output dimensions */}
      {row.output_dimensions?.length > 0 && (
        <div className="card p-5 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('packages.dimensions', lang)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {row.output_dimensions.map(dim => (
              <span
                key={dim.key}
                className="text-[12px] px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
              >
                {isAr ? dim.label_ar : dim.label_en}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interpretation bands */}
      {!isProfile && row.interpretation_bands?.length > 0 && (
        <div className="card p-5 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('packages.output_index', lang)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {row.interpretation_bands.map((band, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: `${band.color}18`, color: band.color, border: `1px solid ${band.color}30` }}
              >
                {band.min}–{band.max} · {isAr ? band.band_ar : band.band_en}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div
        className="p-4 rounded-xl flex gap-3"
        style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--divider)' }}
      >
        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {isAr ? row.disclaimer_ar : row.disclaimer_en}
        </p>
      </div>
    </div>
  )
}
