'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

export const KpiTrendCharts = dynamic(
  () => import('@/components/kpi-trend-charts').then(m => ({ default: m.KpiTrendCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="card p-6 h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
    ),
  }
)

export const PdfDownloadButton = dynamic(
  () => import('@/app/(app)/packages/[id]/pdf-download-button').then(m => ({ default: m.PdfDownloadButton })),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px]" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </span>
    ),
  }
)
