'use client'

import { useAssessmentsCount } from '@/lib/hooks/use-widget-assessments'
import { WidgetErrorBoundary } from '../widget-error-boundary'
import { WidgetSkeleton } from '../widget-skeleton'
import { ClipboardList } from 'lucide-react'

export function AssessmentsWidget() {
  const { data, isLoading, error, refetch } = useAssessmentsCount()

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <WidgetSkeleton />
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <WidgetErrorBoundary error={error} onRetry={() => refetch()} widgetName="Assessments" />
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="section-label mb-1">Active Assessments</p>
          <p className="stat-value">{data?.count.toLocaleString()}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        Available for patients
      </p>
    </div>
  )
}
