import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { redirect } from 'next/navigation'
import { KPI_DEFINITIONS } from '@/lib/types/kpi'
import { EnhancedKPICard } from '@/components/kpi-card-enhanced'
import { KpiTrendCharts } from '@/components/kpi-trend-charts'
import { RefreshCw, Download } from 'lucide-react'

export default async function KPIDashboardPage() {
  const supabase = createClient()
  const lang = getLanguage()
  const isAr = lang === 'ar'

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=/admin/kpi-dashboard`)
  }

  // Verify admin role
  const db = supabase
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  // Fetch KPI values
  let kpiValues: any[] = []
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/kpis`, {
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
    })
    if (response.ok) {
      kpiValues = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch KPI values:', error)
  }

  // Create map for easy lookup
  const kpiMap = new Map(kpiValues.map(k => [k.id, k]))

  // Group KPIs by row
  const rows = [
    KPI_DEFINITIONS.slice(0, 4),   // Row 1: User Metrics
    KPI_DEFINITIONS.slice(4, 8),   // Row 2: Registration
    KPI_DEFINITIONS.slice(8, 12),  // Row 3: Assessments
    KPI_DEFINITIONS.slice(12, 16), // Row 4: Clinical
    KPI_DEFINITIONS.slice(16, 20), // Row 5: System Health
  ]

  const rowTitles = [
    'User Metrics',
    'Registration & Verification',
    'Assessment Activity',
    'Clinical & Messaging',
    'System Health',
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Executive KPI Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time performance metrics and analytics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Refresh dashboard"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Export dashboard"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Dashboard Grid */}
      <div className="space-y-8">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex}>
            {/* Row Title */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {rowTitles[rowIndex]}
            </h2>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {row.map(kpi => {
                const kpiValue = kpiMap.get(kpi.id)
                return (
                  <EnhancedKPICard
                    key={kpi.id}
                    kpi={kpi}
                    value={kpiValue?.value ?? 0}
                    trend={kpiValue?.trend}
                    trendDirection={kpiValue?.trendDirection}
                    target={kpi.target}
                    status={kpiValue?.status}
                    lastUpdated={kpiValue?.lastUpdated ? new Date(kpiValue.lastUpdated) : undefined}
                    isLoading={!kpiValue}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Trend Charts */}
      <div className="mt-10">
        <KpiTrendCharts />
      </div>

      {/* Info Footer */}
      <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> Click on any KPI card to drill down into detailed analytics.
          Use the settings icon to configure alert thresholds for critical metrics.
        </p>
      </div>
    </div>
  )
}
