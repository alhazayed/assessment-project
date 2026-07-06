'use client'

import { useUserStats } from '@/lib/hooks/use-widget-user-stats'
import { WidgetErrorBoundary } from '../widget-error-boundary'
import { WidgetSkeleton } from '../widget-skeleton'
import { Users } from 'lucide-react'

export function UserStatsWidget() {
  const { data, isLoading, error, refetch } = useUserStats()

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <WidgetSkeleton />
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5">
        <WidgetErrorBoundary error={error} onRetry={() => refetch()} widgetName="User Stats" />
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="section-label mb-1">Total Users</p>
          <p className="stat-value">{data?.total.toLocaleString()}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        Across {Object.keys(data?.roles || {}).length} role types
      </p>
    </div>
  )
}
