'use client'

import { useState } from 'react'
import { Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/use-lang'

interface Recommendation {
  id: string
  code: string
  name_en: string
  name_ar: string
  reason_en: string
  reason_ar: string
  relevance: 'high' | 'medium'
}

const STRINGS = {
  en: {
    heading: 'Not sure which assessment to take?',
    subheading: 'Describe how you\'ve been feeling, and AI will recommend the most relevant assessments for you.',
    placeholder: 'E.g. "I\'ve been feeling really anxious lately, struggling to sleep and my mind won\'t stop racing..."',
    button: 'Find My Assessments',
    loading: 'Analyzing...',
    results: 'Recommended for you',
    start: 'Start Assessment',
    high: 'Highly relevant',
    medium: 'Relevant',
    error: 'Something went wrong. Please try again.',
    empty: 'No specific matches found. Browse all assessments below.',
    disclaimer: 'These recommendations are for informational purposes only and do not constitute medical advice.',
  },
  ar: {
    heading: 'لست متأكداً من أي تقييم تأخذ؟',
    subheading: 'صف كيف تشعر، وسيوصي الذكاء الاصطناعي بالتقييمات الأكثر صلة لك.',
    placeholder: 'مثال: "أشعر بقلق شديد مؤخراً، وأجد صعوبة في النوم وتتسارع أفكاري..."',
    button: 'اعثر على تقييماتي',
    loading: 'جارٍ التحليل...',
    results: 'موصى به لك',
    start: 'ابدأ التقييم',
    high: 'مرتبط بشكل كبير',
    medium: 'مرتبط',
    error: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    empty: 'لم يتم العثور على تطابقات محددة. تصفح جميع التقييمات أدناه.',
    disclaimer: 'هذه التوصيات لأغراض إعلامية فقط ولا تشكل نصيحة طبية.',
  },
}

export default function AIAssessmentFinder({ lang: propLang }: { lang?: 'en' | 'ar' }) {
  const hookLang = useLang()
  const lang = propLang ?? hookLang
  const s = STRINGS[lang]
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || loading) return

    setLoading(true)
    setError(null)
    setRecommendations(null)

    try {
      const res = await fetch('/api/recommend-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setRecommendations(data.recommendations || [])
    } catch {
      setError(s.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-2xl p-6 mb-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{s.heading}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{s.subheading}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="input resize-none w-full"
          rows={3}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={s.placeholder}
          disabled={loading}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="btn-primary gap-2 disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {s.loading}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {s.button}
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {recommendations !== null && (
        <div className="mt-5">
          {recommendations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">{s.empty}</p>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{s.results}</h3>
              <div className="space-y-2">
                {recommendations.map(rec => (
                  <div
                    key={rec.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {lang === 'ar' ? rec.name_ar : rec.name_en}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            rec.relevance === 'high'
                              ? 'bg-brand-50 text-brand-700 border border-brand-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {rec.relevance === 'high' ? s.high : s.medium}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        {lang === 'ar' ? rec.reason_ar : rec.reason_en}
                      </p>
                    </div>
                    <Link
                      href={`/assessments/${rec.id}`}
                      className="flex-shrink-0 btn-primary text-xs px-3 py-1.5 gap-1.5"
                    >
                      {s.start}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">{s.disclaimer}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
