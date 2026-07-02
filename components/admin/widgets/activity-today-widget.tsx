'use client'

import { useActivityToday } from '@/lib/hooks/use-widget-activity-today'
import { WidgetErrorBoundary } from '../widget-error-boundary'
import { WidgetSkeleton } from '../widget-skeleton'
import { Activity } from 'lucide-react'

export function ActivityTodayWidget() {
  const { data, isLoading, error, refetch } = useActivityToday()

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <WidgetSkeleton />
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <WidgetErrorBoundary error={error} onRetry={() => refetch()} widgetName="Today Activity" />
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="section-label mb-1">Today&apos;s Assessments</p>
          <p className="stat-value">{data?.count.toLocaleString()}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        Submissions since midnight
      </p>
    </div>
  )
}
