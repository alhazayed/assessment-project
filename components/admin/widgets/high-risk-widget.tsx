'use client'

import { useHighRisk } from '@/lib/hooks/use-widget-high-risk'
import { WidgetErrorBoundary } from '../widget-error-boundary'
import { WidgetSkeleton } from '../widget-skeleton'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

export function HighRiskWidget() {
  const { data, isLoading, error, refetch } = useHighRisk()

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <WidgetSkeleton />
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <WidgetErrorBoundary error={error} onRetry={() => refetch()} widgetName="High Risk" />
      </div>
    )
  }

  const isUp = (data?.change ?? 0) > 0
  const TrendIcon = isUp ? TrendingUp : TrendingDown

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="section-label mb-1">High Risk Submissions</p>
          <p className="stat-value">{data?.current.toLocaleString()}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          {data?.percentage}% of this week&apos;s submissions
        </p>
        {data?.change !== null && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${isUp ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            <TrendIcon className="w-3 h-3" />{isUp ? '+' : ''}{data?.change}%
          </span>
        )}
      </div>
    </div>
  )
}
