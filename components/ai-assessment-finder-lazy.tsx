'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const AIAssessmentFinderInner = dynamic(() => import('@/components/ai-assessment-finder'), {
  ssr: false,
  loading: () => (
    <div className="card p-8 animate-pulse min-h-[200px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
})

export default function AIAssessmentFinderLazy({ lang }: { lang: 'en' | 'ar' }) {
  return <AIAssessmentFinderInner lang={lang} />
}
