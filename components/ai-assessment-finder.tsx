'use client'

import { useState, useEffect, useRef } from 'react'
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

const CHIPS = {
  en: [
    { label: 'Feeling depressed', text: 'I have been feeling very low, sad, and hopeless. I have lost interest in things I used to enjoy and feel exhausted all the time.' },
    { label: 'Anxious / worried', text: 'I feel anxious and worried most of the time. My mind races with worries I cannot control and I struggle to relax.' },
    { label: 'Can\'t sleep', text: 'I have serious problems with sleep — I either can\'t fall asleep, wake up repeatedly, or feel exhausted even after sleeping.' },
    { label: 'Work burnout', text: 'I feel completely drained and detached from my work. I have lost motivation, feel cynical about my job, and have no energy left.' },
    { label: 'Feeling lonely', text: 'I feel very lonely and disconnected from people around me. I feel like no one really understands me or that I lack meaningful relationships.' },
    { label: 'Panic / heart racing', text: 'I get sudden episodes where my heart races, I struggle to breathe, feel dizzy or shaky, and fear something terrible is about to happen.' },
    { label: 'Social anxiety', text: 'I am very anxious and avoidant in social situations. I fear being judged or embarrassed and often avoid social events entirely.' },
    { label: 'Trauma / PTSD', text: 'I experienced a traumatic event and am struggling with flashbacks, nightmares, hypervigilance, and emotional numbness.' },
    { label: 'Low self-esteem', text: 'I have very low self-esteem and feel worthless. I am highly self-critical and feel inferior to others.' },
    { label: 'Life quality check', text: 'I want to understand my overall quality of life — how I am doing physically, mentally, socially, and in my environment.' },
  ],
  ar: [
    { label: 'اكتئاب', text: 'أشعر بحزن شديد ويأس وفقدان الاهتمام بالأشياء التي كنت أستمتع بها. أشعر بإرهاق مستمر.' },
    { label: 'قلق مفرط', text: 'أشعر بقلق شديد معظم الوقت. أفكاري تتسارع ولا أستطيع السيطرة على قلقي ولا الاسترخاء.' },
    { label: 'مشاكل نوم', text: 'أعاني من مشاكل حادة في النوم — لا أستطيع النوم أو أستيقظ كثيراً أو أشعر بالإرهاق رغم النوم.' },
    { label: 'إرهاق وظيفي', text: 'أشعر بالإرهاق الشديد والانفصال عن عملي. فقدت دافعيتي وأصبحت ساخراً من وظيفتي.' },
    { label: 'وحدة وعزلة', text: 'أشعر بوحدة شديدة وانفصال عن الناس. أشعر أن لا أحد يفهمني وأفتقر لعلاقات حقيقية.' },
    { label: 'نوبات هلع', text: 'أعاني من نوبات مفاجئة فيها تسارع في نبضات القلب وصعوبة في التنفس ودوار وخوف من حدوث شيء سيء.' },
    { label: 'قلق اجتماعي', text: 'أشعر بقلق شديد في المواقف الاجتماعية. أخاف من الحكم عليّ والإحراج وأتجنب الفعاليات الاجتماعية.' },
    { label: 'صدمة نفسية', text: 'مررت بحدث صادم وأعاني من ذكريات مؤلمة وكوابيس وتيقظ مفرط وخدر عاطفي.' },
    { label: 'تقدير ذات منخفض', text: 'أعاني من تقدير ذات منخفض جداً وأشعر بعدم القيمة وأنتقد نفسي بشدة وأشعر بالنقص أمام الآخرين.' },
    { label: 'جودة الحياة', text: 'أريد تقييم جودة حياتي بشكل عام — كيف حالي جسدياً ونفسياً واجتماعياً وبيئياً.' },
  ],
}

const STRINGS = {
  en: {
    heading: 'Not sure which assessment to take?',
    subheading: 'Describe how you\'ve been feeling, or pick a topic below — AI will recommend the most relevant assessments.',
    placeholder: 'Describe your symptoms in your own words… e.g. "I feel overwhelmed with worry all the time and can\'t stop thinking about everything that could go wrong. I\'ve also been sleeping badly and feel exhausted."',
    button: 'Find My Assessments',
    loading: 'Analyzing...',
    results: 'Recommended for you',
    start: 'Start',
    high: 'Highly relevant',
    medium: 'Relevant',
    error: 'Something went wrong. Please try again.',
    empty: 'No specific matches found. Browse all assessments below.',
    disclaimer: 'Recommendations are for informational purposes only and do not constitute medical advice.',
    orChoose: 'Or select a topic:',
  },
  ar: {
    heading: 'لست متأكداً من أي تقييم تأخذ؟',
    subheading: 'صف كيف تشعر أو اختر موضوعاً أدناه — وسيوصي الذكاء الاصطناعي بالتقييمات الأكثر صلة لك.',
    placeholder: 'صف أعراضك بكلماتك الخاصة… مثلاً: "أشعر بقلق مستمر لا أستطيع إيقافه، ونومي مضطرب وأشعر بالإرهاق طوال الوقت."',
    button: 'اعثر على تقييماتي',
    loading: 'جارٍ التحليل...',
    results: 'موصى به لك',
    start: 'ابدأ',
    high: 'مرتبط بشكل كبير',
    medium: 'مرتبط',
    error: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    empty: 'لم يتم العثور على تطابقات محددة. تصفح جميع التقييمات أدناه.',
    disclaimer: 'هذه التوصيات لأغراض إعلامية فقط ولا تشكل نصيحة طبية.',
    orChoose: 'أو اختر موضوعاً:',
  },
}

export default function AIAssessmentFinder({ lang: propLang }: { lang?: 'en' | 'ar' }) {
  const hookLang = useLang()
  const lang = propLang ?? hookLang
  const s = STRINGS[lang]
  const chips = CHIPS[lang]
  const isAr = lang === 'ar'

  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSearchedRef = useRef('')

  async function search(query: string) {
    if (!query.trim() || query === lastSearchedRef.current) return
    lastSearchedRef.current = query
    setLoading(true)
    setError(null)
    setRecommendations(null)
    try {
      const res = await fetch('/api/recommend-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, lang }),
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

  function handleTextChange(val: string) {
    setText(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length >= 40) {
      debounceRef.current = setTimeout(() => search(val), 1800)
    }
  }

  function handleChip(chipText: string) {
    setText(chipText)
    lastSearchedRef.current = ''
    if (debounceRef.current) clearTimeout(debounceRef.current)
    search(chipText)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    search(text)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  return (
    <div className="bg-gradient-to-br from-brand-50 to-purple-50 dark:from-[#0D1E30] dark:to-[#0F1A2E] border border-brand-100 dark:border-[#1E3A52] rounded-2xl p-6 mb-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{s.heading}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{s.subheading}</p>
        </div>
      </div>

      <p className="text-xs font-medium text-gray-500 mb-2">{s.orChoose}</p>
      <div className={`flex flex-wrap gap-2 mb-3 ${isAr ? 'flex-row-reverse' : ''}`}>
        {chips.map(chip => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handleChip(chip.text)}
            className="text-xs px-3 py-1.5 rounded-full bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 hover:border-brand-400 transition-colors font-medium"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="input resize-none w-full"
          rows={3}
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={s.placeholder}
          disabled={loading}
          dir={isAr ? 'rtl' : 'ltr'}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{text.trim().length >= 40 && !loading ? (isAr ? 'جارٍ البحث تلقائياً...' : 'Auto-searching as you type…') : ''}</p>
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
                          {isAr ? rec.name_ar : rec.name_en}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.relevance === 'high' ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-gray-100 text-gray-600'}`}>
                          {rec.relevance === 'high' ? s.high : s.medium}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed" dir={isAr ? 'rtl' : 'ltr'}>
                        {isAr ? rec.reason_ar : rec.reason_en}
                      </p>
                    </div>
                    <Link href={`/assessments/${rec.id}`} className="flex-shrink-0 btn-primary text-xs px-3 py-1.5 gap-1.5">
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
