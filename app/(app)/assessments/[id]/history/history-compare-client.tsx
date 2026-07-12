'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, History, Loader2 } from 'lucide-react'
import { compareAttempts, type Attempt, type CompareItem } from '@/lib/assessment-compare'

interface HistoryData { attempts: Attempt[]; items: CompareItem[] }

function TrendChart({ attempts, isAr }: { attempts: Attempt[]; isAr: boolean }) {
  // attempts come newest-first; plot chronologically.
  const points = [...attempts].reverse()
  if (points.length < 2) return null
  const scores = points.map(p => p.total_score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const W = 100, H = 40, pad = 4
  const xy = points.map((p, i) => {
    const x = pad + (i * (W - 2 * pad)) / (points.length - 1)
    const y = H - pad - ((p.total_score - min) / range) * (H - 2 * pad)
    return { x, y, p }
  })
  const path = xy.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')

  return (
    <div className="card p-6">
      <h3 className="text-[14.5px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {isAr ? 'الدرجة عبر الزمن' : 'Score over time'}
      </h3>
      <p className="text-[11.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
        {isAr ? `${points.length} محاولات · من ${min} إلى ${max}` : `${points.length} attempts · ${min}–${max}`}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 120 }} role="img"
        aria-label={isAr ? 'رسم بياني للدرجة عبر الزمن' : 'Score over time chart'}>
        <path d={path} fill="none" stroke="var(--vw-blue)" strokeWidth={0.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {xy.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={1.4} fill="var(--vw-blue)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
        <span>{new Date(points[0].submitted_at).toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(points[points.length - 1].submitted_at).toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}

export default function HistoryCompareClient({ definitionId, name, lang }: { definitionId: string; name: string; lang: string }) {
  const isAr = lang === 'ar'
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aId, setAId] = useState<string>('')
  const [bId, setBId] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/assessment-history?definition_id=${encodeURIComponent(definitionId)}`, { credentials: 'include' })
        const json: HistoryData = res.ok ? await res.json() : { attempts: [], items: [] }
        if (cancelled) return
        setData(json)
        // Default: compare the two most recent (older as A, newer as B).
        if (json.attempts.length >= 2) {
          setBId(json.attempts[0].id)
          setAId(json.attempts[1].id)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [definitionId])

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(isAr ? 'ar' : 'en', { year: 'numeric', month: 'short', day: 'numeric' })

  const cmp = useMemo(() => {
    if (!data) return null
    const a = data.attempts.find(x => x.id === aId)
    const b = data.attempts.find(x => x.id === bId)
    if (!a || !b) return null
    // Order chronologically so the diff reads older → newer regardless of picks.
    const [older, newer] = new Date(a.submitted_at) <= new Date(b.submitted_at) ? [a, b] : [b, a]
    return { older, newer, result: compareAttempts(older, newer, data.items) }
  }, [data, aId, bId])

  return (
    <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/assessments" className="inline-flex items-center gap-1 text-[12.5px] mb-3" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft className="w-3.5 h-3.5" /> {isAr ? 'التقييمات' : 'Assessments'}
        </Link>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" style={{ color: 'var(--vw-blue)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{name}</h1>
        </div>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>{isAr ? 'سجلّك ومقارنة المحاولات' : 'Your history & attempt comparison'}</p>
      </div>

      {loading ? (
        <div className="card p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--vw-blue)' }} /></div>
      ) : !data || data.attempts.length === 0 ? (
        <div className="card p-8 text-center text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          {isAr ? 'لا توجد محاولات بعد.' : 'No attempts yet.'}
        </div>
      ) : data.attempts.length === 1 ? (
        <div className="card p-8 text-center text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          {isAr ? 'محاولة واحدة فقط حتى الآن — أعِد التقييم لاحقًا لرؤية المقارنة.' : 'Only one attempt so far — retake this assessment later to see a comparison.'}
        </div>
      ) : (
        <>
          <TrendChart attempts={data.attempts} isAr={isAr} />

          {/* Attempt pickers */}
          <div className="card p-6">
            <h3 className="text-[14.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'قارن محاولتين' : 'Compare two attempts'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([['A', aId, setAId], ['B', bId, setBId]] as const).map(([label, val, setter]) => (
                <label key={label} className="block">
                  <span className="text-[11.5px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{isAr ? (label === 'A' ? 'المحاولة الأولى' : 'المحاولة الثانية') : (label === 'A' ? 'First attempt' : 'Second attempt')}</span>
                  <select
                    className="input w-full"
                    value={val}
                    onChange={e => setter(e.target.value)}
                  >
                    {data.attempts.map(at => (
                      <option key={at.id} value={at.id}>{fmtDate(at.submitted_at)} · {at.total_score}{at.severity_band ? ` · ${at.severity_band}` : ''}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {/* Comparison result */}
          {cmp && cmp.older.id !== cmp.newer.id ? (
            <div className="card p-6">
              <p className="text-[12.5px] mb-3" style={{ color: 'var(--text-muted)' }}>
                {fmtDate(cmp.older.submitted_at)} → {fmtDate(cmp.newer.submitted_at)}
              </p>
              <div className="flex items-center gap-3 mb-4 rounded-xl p-4" style={{ backgroundColor: 'var(--surface-alt)' }}>
                <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  <span>{cmp.older.total_score}</span>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span>{cmp.newer.total_score}</span>
                </div>
                <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {cmp.result.scoreDelta === 0 ? (isAr ? 'لا تغيّر' : 'no change') : `${cmp.result.scoreDelta > 0 ? '+' : ''}${cmp.result.scoreDelta}`}
                </span>
              </div>
              {cmp.result.bandChanged && (
                <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {isAr ? 'التصنيف: ' : 'Severity: '}<span className="font-medium">{cmp.result.fromBand || '—'}</span>{' → '}<span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{cmp.result.toBand || '—'}</span>
                </p>
              )}
              {cmp.result.changed.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'كل الإجابات متطابقة.' : 'All answers identical.'}</p>
              ) : (
                <>
                  <p className="text-[12.5px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {isAr ? `${cmp.result.changed.length} إجابة تغيّرت (${cmp.result.unchangedCount} دون تغيير)` : `${cmp.result.changed.length} answer${cmp.result.changed.length === 1 ? '' : 's'} changed (${cmp.result.unchangedCount} unchanged)`}
                  </p>
                  <ul className="space-y-2.5">
                    {cmp.result.changed.map(c => (
                      <li key={c.item.id} className="text-[12.5px] leading-snug">
                        <p className="mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{isAr ? `س${c.item.item_number}. ` : `Q${c.item.item_number}. `}</span>
                          {isAr ? c.item.question_ar : c.item.question_en}
                        </p>
                        <p className="flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{(isAr ? c.from?.label_ar : c.from?.label_en) || '—'}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span className="font-semibold">{(isAr ? c.to?.label_ar : c.to?.label_en) || '—'}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <div className="card p-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {isAr ? 'اختر محاولتين مختلفتين للمقارنة.' : 'Pick two different attempts to compare.'}
            </div>
          )}
        </>
      )}
    </div>
  )
}
