import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users, ClipboardCheck, AlertTriangle, Activity, TrendingUp, ShieldAlert } from 'lucide-react'

export default async function AdminOverviewPage() {
  await requireAdmin()
  const db = createAdminClient()

  const [
    { data: roleCounts },
    { data: totalSubmissions },
    { data: weekSubmissions },
    { data: todaySubmissions },
    { data: highRisk },
    { data: activeAssessments },
    { data: topAssessments },
    { data: recentSubmissions },
    { data: recentAudit },
  ] = await Promise.all([
    Promise.resolve({ data: null }),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true }),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true })
      .gte('submitted_at', new Date(Date.now() - 7 * 864e5).toISOString()),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true })
      .gte('submitted_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true })
      .eq('high_risk_flag', true).gte('submitted_at', new Date(Date.now() - 7 * 864e5).toISOString()),
    db.from('assessment_definitions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('assessment_submissions').select('definition_id, assessment_definitions(name_en, code)')
      .limit(500),
    db.from('assessment_submissions')
      .select('id, total_score, severity_band, high_risk_flag, submitted_at, assessment_definitions(name_en, code), profiles(full_name_en)')
      .order('submitted_at', { ascending: false }).limit(8),
    db.from('audit_log').select('id, action, target_type, created_at, profiles(full_name_en)')
      .order('created_at', { ascending: false }).limit(6),
  ])

  // Compute top assessments from submissions
  const countMap: Record<string, { name: string; code: string; count: number }> = {}
  ;(topAssessments || []).forEach((s: any) => {
    const id = s.definition_id
    if (!countMap[id]) countMap[id] = { name: s.assessment_definitions?.name_en || '', code: s.assessment_definitions?.code || '', count: 0 }
    countMap[id].count++
  })
  const top5 = Object.values(countMap).sort((a, b) => b.count - a.count).slice(0, 5)

  // Role counts from profiles
  const { data: profiles } = await db.from('profiles').select('role')
  const roles: Record<string, number> = {}
  ;(profiles || []).forEach((p: any) => { roles[p.role] = (roles[p.role] || 0) + 1 })

  const stats = [
    { label: 'Total Users', value: (profiles || []).length, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'All-time Submissions', value: (totalSubmissions as any)?.count ?? '–', icon: ClipboardCheck, color: 'bg-green-50 text-green-600' },
    { label: 'This Week', value: (weekSubmissions as any)?.count ?? '–', icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'High-Risk (7d)', value: (highRisk as any)?.count ?? '–', icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
    { label: 'Today', value: (todaySubmissions as any)?.count ?? '–', icon: Activity, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Active Assessments', value: (activeAssessments as any)?.count ?? '–', icon: ShieldAlert, color: 'bg-indigo-50 text-indigo-600' },
  ]

  function severityColor(band: string) {
    const b = (band || '').toLowerCase()
    if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return 'bg-green-100 text-green-700'
    if (b.includes('mild')) return 'bg-yellow-100 text-yellow-700'
    if (b.includes('moderate')) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 mt-1">Real-time statistics and activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Users by role */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Users by Role</h2>
          <div className="space-y-2">
            {['patient','clinician','admin','superadmin'].map(role => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{role}</span>
                <span className="text-sm font-semibold text-gray-900">{roles[role] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top assessments */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Most Used Assessments</h2>
          <div className="space-y-2">
            {top5.length === 0 && <p className="text-sm text-gray-400">No submissions yet</p>}
            {top5.map((a, i) => (
              <div key={a.code} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{a.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{a.count}</span>
                  </div>
                  <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (a.count / (top5[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Submissions</h2>
        <div className="divide-y divide-gray-50">
          {(recentSubmissions || []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.profiles?.full_name_en || 'Guest'}</p>
                <p className="text-xs text-gray-400">{s.assessment_definitions?.name_en} · {new Date(s.submitted_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.high_risk_flag && <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(s.severity_band)}`}>{s.severity_band}</span>
                <span className="text-sm font-semibold text-gray-700">{s.total_score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent audit */}
      {(recentAudit || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Admin Actions</h2>
          <div className="divide-y divide-gray-50">
            {(recentAudit || []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-700"><span className="font-medium">{e.profiles?.full_name_en || 'System'}</span> · {e.action}</p>
                  <p className="text-xs text-gray-400">{e.target_type} · {new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
