'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, ArrowRight, History } from 'lucide-react'
import { compareAttempts, type Attempt, type CompareItem, type AttemptComparison } from '@/lib/assessment-compare'

/**
 * Shown on the result page after a submission. Fetches the patient's own history
 * for this assessment and, if there is a previous attempt, renders a comparison
 * of the two most recent attempts (score change + which questions changed).
 * Renders nothing on a first-ever attempt.
 */
export default function AttemptCompareCard({ definitionId, lang }: { definitionId: string; lang: string }) {
  const isAr = lang === 'ar'
  const [data, setData] = useState<{ attempts: Attempt[]; items: CompareItem[] } | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/assessment-history?definition_id=${encodeURIComponent(definitionId)}`, { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch { /* silent — comparison is an enhancement, not core */ }
    })()
    return () => { cancelled = true }
  }, [definitionId])

  if (!data || data.attempts.length < 2) return null

  const [current, previous] = data.attempts // newest-first
  const cmp: AttemptComparison = compareAttempts(previous, current, data.items)
  const prevDate = new Date(previous.submitted_at).toLocaleDateString(isAr ? 'ar' : 'en', { year: 'numeric', month: 'short', day: 'numeric' })

  const Icon = cmp.scoreDelta > 0 ? TrendingUp : cmp.scoreDelta < 0 ? TrendingDown : Minus
  const deltaText = cmp.scoreDelta === 0
    ? (isAr ? 'لا تغيّر في الدرجة' : 'No change in score')
    : (isAr
        ? `${Math.abs(cmp.scoreDelta)} نقطة ${cmp.scoreDelta > 0 ? 'أعلى' : 'أقل'} من محاولتك السابقة`
        : `${Math.abs(cmp.scoreDelta)} points ${cmp.scoreDelta > 0 ? 'higher' : 'lower'} than your previous attempt`)

  const shown = expanded ? cmp.changed : cmp.changed.slice(0, 3)

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <History className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
        <h3 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'مقارنة بمحاولتك السابقة' : 'Compared to your previous attempt'}
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
        {isAr ? `آخر محاولة: ${prevDate}` : `Last taken ${prevDate}`}
      </p>

      {/* Score change */}
      <div className="flex items-center gap-3 mb-4 rounded-xl p-4" style={{ backgroundColor: 'var(--surface-alt)' }}>
        <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
          <span>{previous.total_score}</span>
          <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span>{current.total_score}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          <Icon className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
          {deltaText}
        </div>
      </div>

      {/* Severity band change */}
      {cmp.bandChanged && (
        <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          {isAr ? 'التصنيف: ' : 'Severity: '}
          <span className="font-medium">{cmp.fromBand || (isAr ? 'غير محدد' : 'N/A')}</span>
          {' → '}
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cmp.toBand || (isAr ? 'غير محدد' : 'N/A')}</span>
        </p>
      )}

      {/* Changed answers */}
      {cmp.changed.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          {isAr ? 'أجبت على كل الأسئلة بنفس الطريقة كالسابق.' : 'You answered every question the same as last time.'}
        </p>
      ) : (
        <>
          <p className="text-[12.5px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            {isAr
              ? `${cmp.changed.length} إجابة تغيّرت (${cmp.unchangedCount} دون تغيير)`
              : `${cmp.changed.length} answer${cmp.changed.length === 1 ? '' : 's'} changed (${cmp.unchangedCount} unchanged)`}
          </p>
          <ul className="space-y-2.5">
            {shown.map(c => (
              <li key={c.item.id} className="text-[12.5px] leading-snug">
                <p className="mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{isAr ? `س${c.item.item_number}. ` : `Q${c.item.item_number}. `}</span>
                  {isAr ? c.item.question_ar : c.item.question_en}
                </p>
                <p className="flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{(isAr ? c.from?.label_ar : c.from?.label_en) || (isAr ? '—' : '—')}</span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span className="font-semibold">{(isAr ? c.to?.label_ar : c.to?.label_en) || (isAr ? '—' : '—')}</span>
                </p>
              </li>
            ))}
          </ul>
          {cmp.changed.length > 3 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-3 text-[12px] font-medium"
              style={{ color: 'var(--vw-blue)' }}
            >
              {expanded ? (isAr ? 'عرض أقل' : 'Show less') : (isAr ? `عرض كل التغييرات (${cmp.changed.length})` : `Show all ${cmp.changed.length} changes`)}
            </button>
          )}
        </>
      )}

      <Link
        href={`/assessments/${definitionId}/history`}
        className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
        style={{ color: 'var(--vw-blue)' }}
      >
        <History className="w-3.5 h-3.5" />
        {isAr ? 'عرض كل المحاولات ومقارنتها' : 'View & compare all attempts'}
      </Link>
    </div>
  )
}
