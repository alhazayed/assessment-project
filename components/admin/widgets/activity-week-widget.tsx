'use client'

import { useActivityWeek } from '@/lib/hooks/use-widget-activity-week'
import { WidgetErrorBoundary } from '../widget-error-boundary'
import { WidgetSkeleton } from '../widget-skeleton'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function ActivityWeekWidget() {
  const { data, isLoading, error, refetch } = useActivityWeek()

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <WidgetSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <WidgetErrorBoundary error={error} onRetry={() => refetch()} widgetName="Week Activity" />
      </div>
    )
  }

  const isUp = (data?.change ?? 0) > 0
  const TrendIcon = isUp ? TrendingUp : TrendingDown
  const trendColor = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="section-label mb-1">This Week</p>
          <p className="stat-value">{data?.current.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.change !== null && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <TrendIcon className="w-3 h-3" />{isUp ? '+' : ''}{data?.change}%
            </span>
          )}
        </div>
      </div>
      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        vs {data?.previous} last week
      </p>
    </div>
  )
}
