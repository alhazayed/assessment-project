'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, CheckCircle2, ChevronRight } from 'lucide-react'
import { ASSESSMENT_CATEGORIES } from '@/lib/assessment-categories'
import { localizeSeverity } from '@/lib/severity-labels'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { AssessmentDefinition, AssessmentSubmission } from '@/lib/types'

function severityBadge(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  return 'badge-severe'
}

interface Props {
  lang: Lang
  definitions: AssessmentDefinition[]
  submissions: (AssessmentSubmission & { assessment_definitions?: { name_en: string; name_ar: string; code: string } | null })[]
  isProfileComplete: boolean
}

/** Authenticated assessments catalog with categories + search. */
export default function AssessmentsCatalog({ lang, definitions, submissions, isProfileComplete }: Props) {
  const isAr = lang === 'ar'
  const [categoryId, setCategoryId] = useState<string>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return definitions.filter(d => {
      if (categoryId !== 'all') {
        const cat = ASSESSMENT_CATEGORIES.find(c => c.id === categoryId)
        if (cat && !cat.codes.includes(d.code)) return false
      }
      if (!q) return true
      const hay = `${d.code} ${d.name_en} ${d.name_ar ?? ''} ${d.description_en ?? ''} ${d.description_ar ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [definitions, categoryId, query])

  return (
    <div className="mb-7">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن تقييم…' : 'Search assessments…'}
            className="input ps-9"
            aria-label={isAr ? 'بحث' : 'Search'}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label={isAr ? 'التصنيفات' : 'Categories'}>
        <button
          type="button"
          role="tab"
          aria-selected={categoryId === 'all'}
          onClick={() => setCategoryId('all')}
          className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors"
          style={categoryId === 'all'
            ? { backgroundColor: 'var(--vw-blue)', color: 'white' }
            : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
        >
          {isAr ? 'الكل' : 'All'}
        </button>
        {ASSESSMENT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            onClick={() => setCategoryId(cat.id)}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors"
            style={categoryId === cat.id
              ? { backgroundColor: 'var(--vw-blue)', color: 'white' }
              : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
          >
            {isAr ? cat.labelAr : cat.labelEn}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-[13.5px] py-8 text-center" style={{ color: 'var(--text-muted)' }}>
          {isAr ? 'لا توجد تقييمات مطابقة.' : 'No matching assessments.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => {
            const lastSubmission = submissions.find(s => s.definition_id === d.id)
            const dName = isAr && d.name_ar ? d.name_ar : d.name_en
            const dDesc = isAr && d.description_ar ? d.description_ar : d.description_en
            const assessmentHref = `/assessments/${d.id}`
            const profileHref = `/profile?complete=true&next=${encodeURIComponent(assessmentHref)}`
            return (
              <div key={d.id} className="card-hover p-5">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{dName}</h3>
                    <p className="section-label mt-0.5">{d.code}</p>
                  </div>
                  <span className="badge-neutral flex-shrink-0">
                    {d.total_questions}{t('assessments.questions', lang)}
                  </span>
                </div>
                {dDesc && (
                  <p className="text-[13px] mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{dDesc}</p>
                )}
                {lastSubmission && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#1B8A5A' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {t('assessments.last', lang)} {new Date(lastSubmission.submitted_at).toLocaleDateString()}
                    </span>
                    <span className={severityBadge(lastSubmission.severity_band)}>
                      {localizeSeverity(lastSubmission.severity_band, lang)}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={isProfileComplete ? assessmentHref : profileHref} className="btn-accent">
                    {lastSubmission ? t('assessments.btn.retake', lang) : t('assessments.start', lang)}
                  </Link>
                  {lastSubmission && (
                    <>
                      <Link href={`/assessments/${d.id}/results/${lastSubmission.id}`} className="btn-ghost flex items-center">
                        {t('assessments.score', lang)} {lastSubmission.total_score}
                      </Link>
                      <Link href={`/assessments/${d.id}/history`} className="btn-ghost flex items-center gap-1">
                        {isAr ? 'السجل' : 'History'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
