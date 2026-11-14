'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, RefreshCw, Layers, AlertTriangle } from 'lucide-react'
import type { ScaleSummary } from '@/lib/synthesis'
import type { SuggestedPackage } from '@/lib/billing/suggest-package'
import { trackEvent } from '@/lib/analytics'

/**
 * Free AI summary: each result explained on its own. The combined reading of
 * several scales is the paid package report, which this card points to.
 */
export default function SynthesisCard({ isAr }: { isAr: boolean }) {
  const [synthesis, setSynthesis] = useState<ScaleSummary | null>(null)
  const [suggested, setSuggested] = useState<SuggestedPackage | null>(null)
  const [scaleCount, setScaleCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/synthesis', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate summary')
        return
      }
      setSynthesis(data.synthesis)
      setSuggested(data.suggestedPackage ?? null)
      setScaleCount(data.scaleCount)
      setExpanded(true)
      trackEvent('synthesis_viewed', { scales: data.scaleCount ?? 0, package_offered: !!data.suggestedPackage })
    } catch {
      setError(isAr ? 'حدث خطأ. حاول مجدداً.' : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toneColor = synthesis?.overall_tone === 'urgent'
    ? { bg: '#FEF2F2', border: '#FECACA', icon: '#DC2626', label: isAr ? 'عاجل' : 'Urgent' }
    : synthesis?.overall_tone === 'cautionary'
    ? { bg: '#FFFBEB', border: '#FDE68A', icon: '#D97706', label: isAr ? 'تنبيه' : 'Cautionary' }
    : { bg: '#F0FDF4', border: '#BBF7D0', icon: '#16A34A', label: isAr ? 'إيجابي' : 'Positive' }

  const priceLabel = suggested
    ? new Intl.NumberFormat(isAr ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'USD' }).format(suggested.priceUSD)
    : ''

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EEF5FB' }}>
            <Sparkles className="w-5 h-5" style={{ color: '#1D6296' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isAr ? 'ملخص نتائجك' : 'Your Results, Explained'}
            </h2>
            <p className="text-xs text-gray-400">
              {isAr ? 'شرح بالذكاء الاصطناعي لكل نتيجة على حدة' : 'AI explanation of each result on its own'}
            </p>
          </div>
        </div>
        {synthesis && (
          <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 transition-colors p-1" aria-label={expanded ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'توسيع' : 'Expand')}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!synthesis && !loading && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-4">
            {isAr
              ? 'أكمل 3 تقييمات على الأقل وسيشرح لك الذكاء الاصطناعي ما تعنيه كل نتيجة وما الخطوة التالية.'
              : 'Complete at least 3 assessments and our AI will explain what each result means and a next step for each.'}
          </p>
          {error ? (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          ) : null}
          <button
            onClick={generate}
            className="btn-primary inline-flex items-center gap-2"
            disabled={loading}
          >
            <Sparkles className="w-4 h-4" />
            {isAr ? 'اشرح نتائجي' : 'Explain My Results'}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1D6296', borderTopColor: 'transparent' }} />
          <p className="text-sm text-gray-400">
            {isAr ? 'جاري تحليل نتائجك...' : 'Analyzing your results…'}
          </p>
        </div>
      )}

      {synthesis && expanded && (
        <div className="space-y-4">
          {/* Tone badge + scale count */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: toneColor.bg, color: toneColor.icon, border: `1px solid ${toneColor.border}` }}>
              {toneColor.label}
            </span>
            <span className="text-xs text-gray-400">
              {isAr ? `يشمل ${scaleCount} تقييماً` : `Based on ${scaleCount} assessments`}
            </span>
          </div>

          {synthesis.overall_tone === 'urgent' && (
            <div role="alert" className="p-3 rounded-xl flex items-start gap-2 text-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                {isAr ? 'إحدى نتائجك تحتاج إلى متابعة الآن. ' : 'One of your results needs attention now. '}
                <Link href="/emergency" className="font-semibold underline">
                  {isAr ? 'اعرف أين تجد مساعدة فورية' : 'See where to get help right away'}
                </Link>
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 rounded-xl text-sm leading-relaxed text-gray-700" style={{ backgroundColor: toneColor.bg, border: `1px solid ${toneColor.border}` }}>
            {synthesis.summary}
          </div>

          {/* One result at a time */}
          <ul className="space-y-3">
            {synthesis.scales.map(s => (
              <li key={s.code} className="p-3 rounded-xl border border-gray-100">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  {s.name}
                  {synthesis.high_priority_scale === s.code && (
                    <span className="ms-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      {isAr ? 'الأولوية' : 'Follow up first'}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">{s.meaning}</p>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold">{isAr ? 'الخطوة التالية: ' : 'Next step: '}</span>
                  {s.next_step}
                </p>
              </li>
            ))}
          </ul>

          {/* The combined reading is the paid package report */}
          {suggested && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#EEF5FB', border: '1px solid #D4E6F4' }}>
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#1D6296' }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {isAr ? 'هل تريد معرفة ما تعنيه نتائجك معاً؟' : 'Want to know what your results mean together?'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {isAr
                      ? `تقرير باقة «${suggested.nameAr}» يقرأ مقاييسها معاً بقواعد مبنية على الأبحاث. أكملت ${suggested.matched} من ${suggested.total} منها. ${priceLabel}، دفعة واحدة.`
                      : `The ${suggested.nameEn} report reads its scales together using research-based rules. You have done ${suggested.matched} of its ${suggested.total}. ${priceLabel}, one-time.`}
                  </p>
                  <Link
                    href={`/packages/${suggested.id}`}
                    onClick={() => trackEvent('synthesis_package_click', { package: suggested.id, matched: suggested.matched, total: suggested.total })}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: '#1D6296' }}
                  >
                    {isAr ? 'اطّلع على الباقة' : 'See the package'}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Non-diagnostic disclaimer */}
          <div className="pt-1 pb-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {isAr
                ? 'هذا الشرح أداة دعم للتوعية الذاتية فقط، وليس تشخيصاً طبياً أو نفسياً. إذا كنت تعاني من ضائقة، يرجى التواصل مع متخصص مؤهل.'
                : 'This explanation is a self-awareness support tool only — not a clinical diagnosis. If you are in distress, please consult a qualified mental health professional.'}
            </p>
          </div>

          {/* Regenerate */}
          <div className="pt-1 flex justify-end">
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              {isAr ? 'إعادة الشرح' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
