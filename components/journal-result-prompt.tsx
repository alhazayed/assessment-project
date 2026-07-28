'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/use-lang'
import { BookOpen, Sparkles } from 'lucide-react'

/**
 * Prefills journal editor with a reflection prompt tied to the latest
 * (or linked) assessment result. Safe: only shows the user's own data.
 */
export default function JournalResultPrompt() {
  const supabase = useMemo(() => createClient(), [])
  const lang = useLang()
  const isAr = lang === 'ar'
  const searchParams = useSearchParams()
  const fromSubmission = searchParams.get('from')
  const [prompt, setPrompt] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('assessment_submissions')
        .select('id, severity_band, total_score, assessment_definitions(name_en, name_ar, code)')
        .eq('patient_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)

      if (fromSubmission) {
        query = supabase
          .from('assessment_submissions')
          .select('id, severity_band, total_score, assessment_definitions(name_en, name_ar, code)')
          .eq('patient_id', user.id)
          .eq('id', fromSubmission)
          .limit(1)
      }

      const { data } = await query
      const row = data?.[0] as {
        severity_band: string
        total_score: number
        assessment_definitions: { name_en: string; name_ar: string; code: string } | null
      } | undefined
      if (!row?.assessment_definitions) return

      const name = isAr && row.assessment_definitions.name_ar
        ? row.assessment_definitions.name_ar
        : row.assessment_definitions.name_en

      setPrompt(
        isAr
          ? `بعد نتيجة ${name} (الدرجة ${row.total_score} — ${row.severity_band}): ما الذي شعرت أنه الأقرب للحقيقة في حياتك هذا الأسبوع؟`
          : `After your ${name} result (score ${row.total_score} — ${row.severity_band}): what felt most true about your life this week?`
      )
    }
    load()
  }, [fromSubmission, isAr, supabase])

  if (!prompt) return null

  return (
    <div className="mb-5 p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: '#EAF2F9', border: '1px solid #C7DFF0' }}>
      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--vw-blue)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--vw-blue)' }}>
          {isAr ? 'تأمّل مرتبط بنتيجتك' : 'Reflection from your result'}
        </p>
        <p className="text-[13.5px] leading-relaxed" style={{ color: '#12273C' }}>{prompt}</p>
        <button
          type="button"
          className="mt-2 text-[12.5px] font-semibold inline-flex items-center gap-1"
          style={{ color: 'var(--vw-blue)' }}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('vw-journal-prefill', { detail: { prompt } }))
          }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          {isAr ? 'استخدم كبداية للدفتر' : 'Use as journal starter'}
        </button>
        {fromSubmission && (
          <Link href={`/assessments`} className="block mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {isAr ? 'العودة للتقييمات' : 'Back to assessments'}
          </Link>
        )}
      </div>
    </div>
  )
}
