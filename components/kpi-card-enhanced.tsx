'use client'

import { EnhancedKPICardProps, KPIStatus } from '@/lib/types/kpi'
import { TrendingDown, TrendingUp, AlertCircle, Settings, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const statusColors: Record<KPIStatus, { bg: string; border: string; text: string }> = {
  good: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
  },
}

export function EnhancedKPICard({
  kpi,
  value,
  previousValue,
  trend,
  trendDirection,
  target,
  status = 'good',
  lastUpdated,
  isLoading,
  available = true,
  onDrilldown,
  onAlertConfig,
}: EnhancedKPICardProps) {
  const router = useRouter()
  const colors = statusColors[status]

  // No backing data source yet — show an honest placeholder rather than a
  // zero that reads as a real (critical) value.
  if (!isLoading && available === false) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 flex flex-col h-full">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {kpi.category}
        </p>
        <h3 className="text-sm font-semibold text-gray-500 mt-1 leading-tight">
          {kpi.title}
        </h3>
        <div className="flex-1 flex items-center justify-center py-4">
          <span className="text-2xl font-bold text-gray-300">—</span>
        </div>
        <span className="text-[11px] font-medium text-gray-400 text-center">
          No data source yet
        </span>
      </div>
    )
  }
  const progress = target ? (Number(value) / target) * 100 : 0
  const progressCapped = Math.min(100, progress)

  const handleDrilldown = () => {
    if (kpi.drilldown) {
      router.push(kpi.drilldown)
    } else if (onDrilldown) {
      onDrilldown()
    }
  }

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val

    switch (kpi.format) {
      case 'percent':
        return `${val.toFixed(1)}%`
      case 'decimal:1':
        return val.toFixed(1)
      case 'decimal:2':
        return val.toFixed(2)
      case 'number':
      default:
        return val.toLocaleString()
    }
  }

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 flex flex-col h-full transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {kpi.category}
          </p>
          <h3 className="text-sm font-semibold text-gray-900 mt-1 leading-tight">
            {kpi.title}
          </h3>
        </div>

        {/* Alert Config Button */}
        {onAlertConfig && (
          <button
            onClick={onAlertConfig}
            className="flex-shrink-0 ml-2 p-1.5 rounded hover:bg-white/50 transition-colors"
            title="Configure alert"
            aria-label={`Configure alert for ${kpi.title}`}
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-2">
        {isLoading ? (
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatValue(value)}
            </span>
            {kpi.unit && (
              <span className="text-xs font-medium text-gray-500">
                {kpi.unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Trend */}
      {trend !== undefined && trendDirection && (
        <div className="mb-3 flex items-center gap-1">
          {trendDirection === 'up' && (
            <TrendingUp className="w-4 h-4 text-green-600" />
          )}
          {trendDirection === 'down' && (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          {trendDirection === 'neutral' && (
            <span className="text-gray-400">→</span>
          )}
          <span
            className={`text-xs font-semibold ${
              trendDirection === 'up'
                ? 'text-green-600'
                : trendDirection === 'down'
                  ? 'text-red-600'
                  : 'text-gray-500'
            }`}
          >
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">vs last period</span>
        </div>
      )}

      {/* Target Progress Bar */}
      {target && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">
              Target Progress
            </span>
            <span className="text-xs font-semibold text-gray-900">
              {progressCapped.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progressCapped >= 90
                  ? 'bg-green-500'
                  : progressCapped >= 70
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${progressCapped}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-3 flex items-center gap-1">
        {status === 'critical' && (
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        )}
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${
            status === 'good'
              ? 'bg-green-100 text-green-700'
              : status === 'warning'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-gray-500 mb-3">
          Updated: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* Drill-down Link / Button */}
      {kpi.drilldown && (
        <button
          onClick={handleDrilldown}
          className="mt-auto inline-flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <span>View Details</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
