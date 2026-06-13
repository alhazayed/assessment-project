'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Lightbulb, TrendingUp, RefreshCw } from 'lucide-react'

type Synthesis = {
  summary: string
  patterns: string[]
  strengths: string[]
  areas_of_concern: string[]
  recommendations: string[]
  overall_tone: 'positive' | 'cautionary' | 'urgent'
  high_priority_scale: string | null
}

export default function SynthesisCard({ isAr }: { isAr: boolean }) {
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null)
  const [scaleCount, setScaleCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/synthesis')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate synthesis')
        return
      }
      setSynthesis(data.synthesis)
      setScaleCount(data.scaleCount)
      setExpanded(true)
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

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EEF5FB' }}>
            <Sparkles className="w-5 h-5" style={{ color: '#1D6296' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isAr ? 'الصورة الكاملة' : 'The Full Picture'}
            </h2>
            <p className="text-xs text-gray-400">
              {isAr ? 'تحليل ذكاء اصطناعي لجميع نتائجك' : 'AI synthesis across all your results'}
            </p>
          </div>
        </div>
        {synthesis && (
          <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!synthesis && !loading && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-4">
            {isAr
              ? 'أكمل 3 تقييمات على الأقل ليقوم الذكاء الاصطناعي بتجميع صورة شاملة عن صحتك النفسية عبر جميع المجالات.'
              : 'Complete at least 3 assessments and our AI will synthesize a comprehensive picture of your mental health across all domains.'}
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
            {isAr ? 'توليد الصورة الكاملة' : 'Generate My Full Picture'}
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

          {/* Summary */}
          <div className="p-4 rounded-xl text-sm leading-relaxed text-gray-700" style={{ backgroundColor: toneColor.bg, border: `1px solid ${toneColor.border}` }}>
            {synthesis.summary}
          </div>

          {/* Patterns */}
          {synthesis.patterns.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {isAr ? 'الأنماط الملاحظة' : 'Observed Patterns'}
                </span>
              </div>
              <ul className="space-y-1.5">
                {synthesis.patterns.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Two-column: strengths + areas of concern */}
          <div className="grid grid-cols-2 gap-4">
            {synthesis.strengths.length > 0 && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    {isAr ? 'نقاط القوة' : 'Strengths'}
                  </span>
                </div>
                <ul className="space-y-1">
                  {synthesis.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-green-700">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.areas_of_concern.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    {isAr ? 'مجالات الاهتمام' : 'Areas to Watch'}
                  </span>
                </div>
                <ul className="space-y-1">
                  {synthesis.areas_of_concern.map((a, i) => (
                    <li key={i} className="text-xs text-amber-700">{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {synthesis.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {isAr ? 'التوصيات' : 'Recommendations'}
                </span>
              </div>
              <ol className="space-y-2">
                {synthesis.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: '#1D6296' }}>
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Non-diagnostic disclaimer */}
          <div className="pt-1 pb-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {isAr
                ? 'هذا التحليل أداة دعم للتوعية الذاتية فقط، وليس تشخيصاً طبياً أو نفسياً. إذا كنت تعاني من ضائقة، يرجى التواصل مع متخصص مؤهل.'
                : 'This analysis is a self-awareness support tool only — not a clinical diagnosis. If you are in distress, please consult a qualified mental health professional.'}
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
              {isAr ? 'إعادة التحليل' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
