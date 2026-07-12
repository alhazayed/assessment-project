'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Download, Loader2, SlidersHorizontal } from 'lucide-react'
import { DEMOGRAPHIC_DIMENSIONS, DIMENSION_LABELS, type DemographicDimension } from '@/lib/assessment-demographics'

interface Def { id: string; code: string; name_en: string; name_ar: string }
interface Dist { value: number; label_en: string; label_ar: string; count: number }
interface Breakdown { group: string; n: number; mean: number }
interface ItemStat {
  item_id: string
  item_number: number
  question_en: string
  question_ar: string
  subscale: string | null
  n: number
  mean: number
  distribution: Dist[]
  breakdown: Breakdown[] | null
}
interface Analytics {
  assessment: { id: string; code: string; name_en: string; name_ar: string; total_questions: number }
  submissionCount: number
  totalSubmissions: number
  filterOptions: Record<DemographicDimension, string[]>
  groupBy: DemographicDimension | null
  items: ItemStat[]
}

export default function ItemAnalyticsClient({ definitions, lang }: { definitions: Def[]; lang: string }) {
  const isAr = lang === 'ar'
  const dimLabel = (d: DemographicDimension) => (isAr ? DIMENSION_LABELS[d].ar : DIMENSION_LABELS[d].en)

  const [defId, setDefId] = useState(definitions[0]?.id ?? '')
  const [filters, setFilters] = useState<Partial<Record<DemographicDimension, string>>>({})
  const [groupBy, setGroupBy] = useState<DemographicDimension | ''>('')
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const qs = () => {
    const p = new URLSearchParams()
    for (const dim of DEMOGRAPHIC_DIMENSIONS) if (filters[dim]) p.set(dim, filters[dim]!)
    if (groupBy) p.set('groupBy', groupBy)
    return p.toString()
  }

  useEffect(() => {
    if (!defId) return
    let cancelled = false
    setLoading(true); setError('')
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/assessments/${defId}/item-analytics?${qs()}`, { credentials: 'include' })
        if (!res.ok) { if (!cancelled) setError(isAr ? 'تعذّر تحميل البيانات' : 'Failed to load data'); return }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError(isAr ? 'تعذّر تحميل البيانات' : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defId, JSON.stringify(filters), groupBy])

  const setFilter = (dim: DemographicDimension, v: string) =>
    setFilters(f => { const n = { ...f }; if (v) n[dim] = v; else delete n[dim]; return n })

  const opts = (dim: DemographicDimension) => data?.filterOptions?.[dim] ?? []
  const exportQs = (() => { const p = new URLSearchParams(); for (const dim of DEMOGRAPHIC_DIMENSIONS) if (filters[dim]) p.set(dim, filters[dim]!); return p.toString() })()

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-5 h-5" style={{ color: 'var(--vw-blue)' }} />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{isAr ? 'تحليل الإجابات' : 'Answer analytics'}</h1>
      </div>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
        {isAr ? 'توزيع الإجابات لكل سؤال — قابل للتصفية والتقسيم حسب كل المتغيّرات الديموغرافية للبحث.' : 'Per-question answer distributions — filterable and breakable down by every demographic variant for research.'}
      </p>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[11.5px] font-medium block mb-1 text-gray-500">{isAr ? 'التقييم' : 'Assessment'}</span>
            <select className="input w-full" value={defId} onChange={e => setDefId(e.target.value)}>
              {definitions.map(d => <option key={d.id} value={d.id}>{isAr && d.name_ar ? d.name_ar : d.name_en} ({d.code})</option>)}
            </select>
          </label>
          {DEMOGRAPHIC_DIMENSIONS.map(dim => (
            <label key={dim} className="block">
              <span className="text-[11.5px] font-medium block mb-1 text-gray-500">{dimLabel(dim)}</span>
              <select className="input w-full" value={filters[dim] ?? ''} onChange={e => setFilter(dim, e.target.value)}>
                <option value="">{isAr ? 'الكل' : 'All'}</option>
                {opts(dim).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <span className="text-[12px] font-medium text-gray-600">{isAr ? 'التقسيم حسب' : 'Break down by'}</span>
            <select className="input" value={groupBy} onChange={e => setGroupBy(e.target.value as DemographicDimension | '')}>
              <option value="">{isAr ? 'بدون' : 'None'}</option>
              {DEMOGRAPHIC_DIMENSIONS.map(dim => <option key={dim} value={dim}>{dimLabel(dim)}</option>)}
            </select>
          </div>
          {(Object.keys(filters).length > 0 || groupBy) && (
            <button onClick={() => { setFilters({}); setGroupBy('') }} className="text-[12px] text-gray-500 underline">
              {isAr ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : error ? (
        <div className="text-center py-16 text-sm text-red-600">{error}</div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-[13px] text-gray-600">
              {isAr
                ? `${data.submissionCount} تقديم مطابق من أصل ${data.totalSubmissions}`
                : `${data.submissionCount} matching submission${data.submissionCount === 1 ? '' : 's'} of ${data.totalSubmissions}`}
            </p>
            <a
              href={`/api/admin/assessments/${defId}/answers-export?${exportQs}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              style={{ color: 'var(--vw-blue)' }}
            >
              <Download className="w-4 h-4" /> {isAr ? 'تنزيل الإجابات (CSV)' : 'Download answers (CSV)'}
            </a>
          </div>

          {data.submissionCount === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">{isAr ? 'لا توجد بيانات مطابقة للمرشّحات.' : 'No data matches these filters.'}</div>
          ) : (
            <div className="space-y-3">
              {data.items.map(it => {
                const maxCount = Math.max(1, ...it.distribution.map(d => d.count))
                return (
                  <div key={it.item_id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-[13px] font-medium text-gray-800">
                        <span className="text-gray-400">{isAr ? `س${it.item_number}. ` : `Q${it.item_number}. `}</span>
                        {isAr ? it.question_ar : it.question_en}
                        {it.subscale && <span className="ml-2 text-[11px] text-gray-400">[{it.subscale}]</span>}
                      </p>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[15px] font-bold text-gray-900">{it.mean}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{isAr ? `متوسط · ن=${it.n}` : `mean · n=${it.n}`}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {it.distribution.map(d => {
                        const pct = it.n ? Math.round((d.count / it.n) * 100) : 0
                        return (
                          <div key={d.value} className="flex items-center gap-2">
                            <span className="text-[11.5px] text-gray-500 w-40 flex-shrink-0 truncate">{isAr ? d.label_ar : d.label_en}</span>
                            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                              <div className="h-full rounded" style={{ width: `${(d.count / maxCount) * 100}%`, backgroundColor: 'var(--vw-blue)' }} />
                            </div>
                            <span className="text-[11px] text-gray-500 w-16 flex-shrink-0 text-right">{d.count} · {pct}%</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Per-group breakdown */}
                    {it.breakdown && it.breakdown.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10.5px] uppercase tracking-wide text-gray-400 mb-2">
                          {isAr ? `المتوسط حسب ${data.groupBy ? dimLabel(data.groupBy) : ''}` : `Mean by ${data.groupBy ? dimLabel(data.groupBy) : ''}`}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                          {it.breakdown.map(b => (
                            <div key={b.group} className="flex items-center justify-between text-[11.5px]">
                              <span className="text-gray-500 truncate mr-2">{b.group}</span>
                              <span className="text-gray-800 font-semibold flex-shrink-0">{b.mean} <span className="text-gray-400 font-normal">({b.n})</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
