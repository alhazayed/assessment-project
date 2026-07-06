'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import KPICard from './kpi-card'
import { BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  stats: Array<{
    stat_date: string
    submissions: number
    high_risk_count: number
    unique_patients: number
    avg_score: number
  }>
  period_days: number
}

interface TopAssessment {
  definition_id: string
  code: string
  name_en: string
  total_submissions: number
  avg_score: number
  pct_high_risk: number
}

export default function DashboardOverview() {
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [assessments, setAssessments] = useState<TopAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch dashboard stats
        const statsRes = await fetch('/api/admin/dashboard/stats?days=7')
        if (!statsRes.ok) throw new Error('Failed to fetch stats')
        const statsData = await statsRes.json()

        // Fetch top assessments
        const assessmentsRes = await fetch('/api/admin/dashboard/assessments?limit=5')
        if (!assessmentsRes.ok) throw new Error('Failed to fetch assessments')
        const assessmentsData = await assessmentsRes.json()

        if (mounted) {
          setStats(statsData)
          setAssessments(assessmentsData.assessments || [])
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [supabase])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed to load statistics</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const totalSubmissions = stats?.stats.reduce((sum, s) => sum + s.submissions, 0) || 0
  const totalHighRisk = stats?.stats.reduce((sum, s) => sum + s.high_risk_count, 0) || 0
  const avgScore = stats?.stats.length
    ? (stats.stats.reduce((sum, s) => sum + s.avg_score, 0) / stats.stats.length).toFixed(1)
    : 0
  const uniquePatients = stats?.stats.length
    ? Math.max(...stats.stats.map(s => s.unique_patients))
    : 0

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Submissions"
          value={totalSubmissions}
          unit="assessments"
          icon={<BarChart3 className="w-5 h-5" />}
          status="good"
          isLoading={loading}
        />
        <KPICard
          title="High-Risk Submissions"
          value={totalHighRisk}
          unit="flags"
          icon={<AlertTriangle className="w-5 h-5" />}
          status={totalHighRisk > 5 ? 'warning' : 'good'}
          isLoading={loading}
        />
        <KPICard
          title="Average Score"
          value={avgScore}
          icon={<TrendingUp className="w-5 h-5" />}
          status="good"
          isLoading={loading}
        />
        <KPICard
          title="Unique Patients"
          value={uniquePatients}
          unit="users"
          icon={<Users className="w-5 h-5" />}
          status="good"
          isLoading={loading}
        />
      </div>

      {/* Top Assessments */}
      {!loading && assessments.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Assessments by Volume
          </h3>
          <div className="space-y-3">
            {assessments.map(assessment => (
              <div
                key={assessment.definition_id}
                className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {assessment.name_en}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{assessment.code}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {assessment.total_submissions}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Avg: {assessment.avg_score.toFixed(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
