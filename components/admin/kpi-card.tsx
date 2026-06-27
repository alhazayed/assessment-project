'use client'

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  trend?: number
  trendDirection?: 'up' | 'down' | 'neutral'
  target?: number
  status?: 'good' | 'warning' | 'critical'
  icon?: ReactNode
  onClick?: () => void
  isLoading?: boolean
}

export default function KPICard({
  title,
  value,
  unit,
  trend,
  trendDirection = 'neutral',
  target,
  status = 'good',
  icon,
  onClick,
  isLoading,
}: KPICardProps) {
  const statusColors = {
    good: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20',
    critical: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20',
  }

  const statusIndicators = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  }

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />,
    down: <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />,
    neutral: null,
  }

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  }

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-5 ${statusColors[status]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className="text-brand-600 dark:text-brand-400">{icon}</div>}
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h3>
        </div>
        <div className={`w-2 h-2 rounded-full ${statusIndicators[status]}`} />
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </div>
      ) : (
        <>
          <div className="mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
              {unit && <span className="text-sm text-gray-600 dark:text-gray-400">{unit}</span>}
            </div>
          </div>

          {trend !== undefined && (
            <div className="flex items-center gap-1 mb-3">
              {trendIcons[trendDirection]}
              <span className={`text-xs font-medium ${trendColors[trendDirection]}`}>
                {trendDirection === 'neutral' ? 'No change' : `${trend > 0 ? '+' : ''}${trend}%`}
              </span>
            </div>
          )}

          {target !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Target</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{target}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    status === 'critical'
                      ? 'bg-red-500'
                      : status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (Number(value) / target) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
