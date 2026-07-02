'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import React from 'react'

interface WidgetErrorBoundaryProps {
  error: Error | null
  onRetry: () => void
  widgetName: string
  children?: React.ReactNode
}

export function WidgetErrorBoundary({
  error,
  onRetry,
  widgetName,
}: WidgetErrorBoundaryProps) {
  if (!error) return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-red-800 dark:text-red-200">{widgetName} Error</h3>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error.message}</p>
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}
