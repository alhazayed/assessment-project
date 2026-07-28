'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PlayCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssessmentDefinition } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface Props {
  definitions: AssessmentDefinition[]
  lang: Lang
  /** Auth user id — required: saved-progress keys are namespaced per user. */
  userId: string
}

interface SavedProgress {
  answers: Record<number, number>
  currentIndex: number
  updatedAt?: string
  source: 'local' | 'server'
}

export default function InProgressAssessments({ definitions, lang, userId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [inProgress, setInProgress] = useState<{ def: AssessmentDefinition; progress: SavedProgress }[]>([])

  useEffect(() => {
    async function load() {
      const found = new Map<string, { def: AssessmentDefinition; progress: SavedProgress }>()

      // Server drafts (cross-device)
      const { data: drafts } = await supabase
        .from('assessment_drafts')
        .select('definition_id, answers, current_index, updated_at')
        .eq('patient_id', userId)

      if (drafts) {
        for (const draft of drafts) {
          const answers = draft.answers as Record<string, number> | undefined
          if (!answers || Object.keys(answers).length === 0) continue
          const def = definitions.find(d => d.id === draft.definition_id)
          if (!def) continue
          found.set(def.id, {
            def,
            progress: {
              answers,
              currentIndex: draft.current_index ?? 0,
              updatedAt: draft.updated_at,
              source: 'server',
            },
          })
        }
      }

      // Local drafts (may be newer than server while offline)
      for (const def of definitions) {
        try {
          const raw = localStorage.getItem(`vw_assessment_${def.id}_${userId}`)
          if (!raw) continue
          const progress = JSON.parse(raw) as { answers: Record<string, number>; currentIndex: number }
          if (Object.keys(progress.answers).length === 0) continue
          const existing = found.get(def.id)
          const localCount = Object.keys(progress.answers).length
          const serverCount = existing ? Object.keys(existing.progress.answers).length : 0
          if (!existing || localCount >= serverCount) {
            found.set(def.id, {
              def,
              progress: {
                answers: progress.answers,
                currentIndex: progress.currentIndex ?? 0,
                source: 'local',
              },
            })
          }
        } catch {
          // ignore corrupt entries
        }
      }

      setInProgress(Array.from(found.values()))
    }
    load()
  }, [definitions, userId, supabase])

  if (inProgress.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-[14.5px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <PlayCircle className="w-4 h-4" style={{ color: '#F3650A' }} />
        {t('assessments.in_progress', lang)}
      </h2>
      <div className="grid gap-3">
        {inProgress.map(({ def, progress }) => {
          const name = lang === 'ar' && def.name_ar ? def.name_ar : def.name_en
          const answered = Object.keys(progress.answers).length
          const pct = Math.round((answered / def.total_questions) * 100)
          const savedLabel = progress.updatedAt
            ? new Date(progress.updatedAt).toLocaleDateString(lang === 'ar' ? 'ar' : undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : null
          return (
            <div
              key={def.id}
              className="card p-4 flex items-center justify-between gap-4"
              style={{ borderInlineStart: '4px solid #F3650A' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 progress-track h-1.5">
                    <div
                      className="progress-fill h-1.5 transition-all"
                      style={{ width: `${pct}%`, backgroundColor: '#F3650A' }}
                    />
                  </div>
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {answered}/{def.total_questions}
                  </span>
                </div>
                {savedLabel && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {lang === 'ar' ? `آخر حفظ: ${savedLabel}` : `Last saved: ${savedLabel}`}
                  </p>
                )}
              </div>
              <Link href={`/assessments/${def.id}`} className="btn-accent flex-shrink-0 text-sm gap-1.5">
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
