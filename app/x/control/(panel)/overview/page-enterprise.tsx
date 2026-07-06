'use client'

import { UserStatsWidget, ActivityTodayWidget, ActivityWeekWidget, HighRiskWidget, AssessmentsWidget } from '@/components/admin/widgets'
import DashboardOverview from '@/components/admin/dashboard-overview'
import { BarChart3, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function EnterpriseAdminOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Real-time system analytics and insights</p>
        </div>
        <Link
          href="/x/control/analytics"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: 'var(--vw-blue)', color: 'white' }}
        >
          <TrendingUp className="w-4 h-4" />
          Deep Analytics
        </Link>
      </div>

      {/* Key Metrics - Independent Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UserStatsWidget />
        <ActivityTodayWidget />
        <ActivityWeekWidget />
        <HighRiskWidget />
      </div>

      {/* Active Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AssessmentsWidget />

        {/* Placeholder for future widgets */}
        <div className="lg:col-span-2 card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-dashed">
          <BarChart3 className="w-6 h-6 mb-3" style={{ color: 'var(--vw-blue)' }} />
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Enterprise Widgets Coming Soon</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Additional analytics widgets including severity distribution, role distribution, and audit activity will be added in Phase 2.
          </p>
        </div>
      </div>

      {/* Performance Analytics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Analytics</h2>
        <DashboardOverview />
      </div>
    </div>
  )
}
