import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Lightbulb, ShieldAlert, FileDown } from 'lucide-react'
import type { InterpretationBand, OutputDimension, PackageResult } from '@/lib/types'

interface PkgAssessment {
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  is_available: boolean
  sort_order: number
}

interface ScoreGaugeProps {
  score: number
  color: string
  maxScore?: number
}

function ScoreGauge({ score, color, maxScore = 100 }: ScoreGaugeProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const r = 52
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference
  const gap = circumference - dash

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="136" height="136" viewBox="0 0 136 136" className="-rotate-90">
        <circle cx="68" cy="68" r={r} fill="none" stroke="var(--surface-alt)" strokeWidth="10" />
        <circle
          cx="68" cy="68" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[32px] font-extrabold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          /100
        </span>
      </div>
    </div>
  )
}

export default async function PackageResultPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = getLanguage()
  const isAr = lang === 'ar'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/packages/${params.id}/result`)

  const db = createAdminClient()

  // Fetch package
  const { data: pkg } = await db
    .from('packages')
    .select('*, package_assessments(assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)')
    .eq('id', params.id)
    .single()

  if (!pkg) notFound()

  // Fetch result
  const { data: result } = await db
    .from('package_results')
    .select('*')
    .eq('package_id', params.id)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!result) {
    redirect(`/packages/${params.id}`)
  }

  const r = result as PackageResult
  const pkgName = isAr ? pkg.name_ar : pkg.name_en
  const pkgBands = pkg.interpretation_bands as InterpretationBand[]
  const pkgDimensions = pkg.output_dimensions as OutputDimension[]
  const availableAssessments = (pkg.package_assessments as PkgAssessment[])
    .filter(a => a.is_available)
    .sort((a, b) => a.sort_order - b.sort_order)

  const currentBand = pkgBands.find(b =>
    (r.composite_score ?? 0) >= b.min && (r.composite_score ?? 0) <= b.max
  ) ?? pkgBands[pkgBands.length - 1]

  const completedOn = r.completed_at
    ? new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(r.completed_at))
    : null

  const strengths    = isAr ? r.strengths_ar    : r.strengths_en
  const risks        = isAr ? r.risk_indicators_ar : r.risk_indicators_en
  const recommendations = isAr ? r.recommendations_ar : r.recommendations_en

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Back */}
      <Link
        href={`/packages/${params.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors hover:underline"
        style={{ color: 'var(--text-muted)' }}
      >
        {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
        {t('packages.result.back', lang)}
      </Link>

      {/* Title */}
      <div className="mb-6">
        <h1
          className="text-2xl font-extrabold tracking-tight mb-1"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
        >
          {t('packages.result.title', lang)}
        </h1>
        <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{pkgName}</p>
        {completedOn && (
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t('packages.result.completed_on', lang)} {completedOn}
          </p>
        )}
      </div>

      {/* Composite score hero */}
      <div
        className="card p-6 mb-6 flex flex-col sm:flex-row items-center gap-6"
        style={{ borderTop: `4px solid ${pkg.color}` }}
      >
        <ScoreGauge score={r.composite_score ?? 0} color={pkg.color} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            {t('packages.result.composite', lang)}
          </p>
          {currentBand && (
            <>
              <p
                className="text-[20px] font-extrabold leading-snug"
                style={{ color: currentBand.color }}
              >
                {isAr ? currentBand.band_ar : currentBand.band_en}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pkgBands.map((b, i) => (
                  <span
                    key={i}
                    className="text-[10.5px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: b === currentBand ? `${b.color}20` : 'var(--surface-alt)',
                      color: b === currentBand ? b.color : 'var(--text-muted)',
                      border: b === currentBand ? `1px solid ${b.color}40` : '1px solid var(--divider)',
                      fontWeight: b === currentBand ? 700 : 400,
                    }}
                  >
                    {b.min}–{b.max} {isAr ? b.band_ar : b.band_en}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Individual assessment scores */}
      {availableAssessments.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('packages.result.scores', lang)}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t('packages.result.normalized', lang)}
            </p>
          </div>
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {availableAssessments.map(a => {
              const normalized = r.individual_scores[a.assessment_code]
              if (normalized === undefined) return null
              const barColor = normalized >= 70 ? '#22c55e' : normalized >= 45 ? '#f59e0b' : '#ef4444'

              return (
                <div key={a.assessment_code} className="px-5 py-3.5" style={{ borderColor: 'var(--divider)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {isAr ? a.name_ar : a.name_en}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {t('packages.result.weight', lang)}: {a.weight_pct}%
                      </span>
                      <span className="text-[13px] font-bold" style={{ color: barColor }}>
                        {normalized}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-alt)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${normalized}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Output dimensions */}
      {pkgDimensions.length > 0 && Object.keys(r.dimension_scores).length > 0 && (
        <div className="card p-5 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('packages.result.dimensions', lang)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pkgDimensions.map(dim => {
              const score = r.dimension_scores[dim.key] ?? r.dimension_scores[Object.keys(r.dimension_scores)[0]]
              const barColor = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444'
              return (
                <div
                  key={dim.key}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium"
                  style={{ backgroundColor: `${barColor}15`, color: barColor, border: `1px solid ${barColor}30` }}
                >
                  <span>{isAr ? dim.label_ar : dim.label_en}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Insights: strengths, risks, recommendations */}
      {strengths.length > 0 && (
        <div className="card p-5 mb-4" style={{ borderLeft: '3px solid #22c55e' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('packages.result.strengths', lang)}
            </p>
          </div>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-green-500 flex-shrink-0 mt-0.5">·</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {risks.length > 0 && (
        <div className="card p-5 mb-4" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('packages.result.risks', lang)}
            </p>
          </div>
          <ul className="space-y-1.5">
            {risks.map((r, i) => (
              <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-red-500 flex-shrink-0 mt-0.5">·</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="card p-5 mb-6" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('packages.result.recommendations', lang)}
            </p>
          </div>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-[13px] flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="text-amber-500 flex-shrink-0 mt-0.5">·</span>{rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <Link
          href={`/packages/${params.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
          style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t('packages.result.back', lang)}
        </Link>
        <button
          disabled
          title="Coming in Phase 3"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium opacity-40 cursor-not-allowed"
          style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
        >
          <FileDown className="w-4 h-4" />
          {t('packages.result.download_pdf', lang)}
        </button>
      </div>

      {/* Disclaimer */}
      <div
        className="p-4 rounded-xl flex gap-3"
        style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--divider)' }}
      >
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {t('packages.result.disclaimer', lang)}
        </p>
      </div>
    </div>
  )
}
