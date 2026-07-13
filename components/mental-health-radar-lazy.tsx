'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const MentalHealthRadarChart = dynamic(() => import('@/components/mental-health-radar'), {
  ssr: false,
  loading: () => (
    <div className="card p-6 animate-pulse h-64 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  ),
})

type ScoreEntry = {
  submitted_at: string
  total_score: number
  assessment_definitions: { name_en: string; name_ar: string; code: string } | null
}

export default function MentalHealthRadarLazy({
  scoreHistory,
  isAr,
}: {
  scoreHistory: ScoreEntry[]
  isAr: boolean
}) {
  return <MentalHealthRadarChart scoreHistory={scoreHistory} isAr={isAr} />
}
