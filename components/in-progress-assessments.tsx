'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlayCircle } from 'lucide-react'
import type { AssessmentDefinition } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface Props {
  definitions: AssessmentDefinition[]
  lang: Lang
}

interface SavedProgress {
  answers: Record<number, number>
  currentIndex: number
}

export default function InProgressAssessments({ definitions, lang }: Props) {
  const [inProgress, setInProgress] = useState<{ def: AssessmentDefinition; progress: SavedProgress }[]>([])

  useEffect(() => {
    const found: { def: AssessmentDefinition; progress: SavedProgress }[] = []
    for (const def of definitions) {
      try {
        const raw = localStorage.getItem(`vw_assessment_${def.id}`)
        if (!raw) continue
        const progress = JSON.parse(raw) as SavedProgress
        if (Object.keys(progress.answers).length > 0) {
          found.push({ def, progress })
        }
      } catch {
        // ignore corrupt entries
      }
    }
    setInProgress(found)
  }, [definitions])

  if (inProgress.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <PlayCircle className="w-4 h-4 text-accent-500" />
        {t('assessments.in_progress', lang)}
      </h2>
      <div className="grid gap-3">
        {inProgress.map(({ def, progress }) => {
          const name = lang === 'ar' && def.name_ar ? def.name_ar : def.name_en
          const answered = Object.keys(progress.answers).length
          const pct = Math.round((answered / def.total_questions) * 100)
          return (
            <div
              key={def.id}
              className="card p-4 border-l-4 border-accent-400 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{name}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {answered}/{def.total_questions}
                  </span>
                </div>
              </div>
              <Link href={`/assessments/${def.id}`} className="btn-primary flex-shrink-0 text-sm gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" />
                {t('assessments.in_progress.resume', lang)}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
