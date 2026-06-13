import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { Users, ClipboardCheck, AlertTriangle, Activity, TrendingUp, TrendingDown, ShieldAlert, Brain } from 'lucide-react'
import Link from 'next/link'

export default async function AdminOverviewPage() {
  await requireAdmin()
  const db = createAdminClient()
  const lang = getLanguage()

  const now = new Date()
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString()
  const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()

  const [
    { data: profiles },
    { count: totalCount },
    { count: weekCount },
    { count: prevWeekCount },
    { count: todayCount },
    { count: highRiskCount },
    { count: prevHighRiskCount },
    { count: activeAssessmentCount },
    { data: topAssessmentsRaw },
    { data: recentSubmissions },
    { data: recentAudit },
    { data: allSubsStats },
  ] = await Promise.all([
    db.from('profiles').select('role'),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true }),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true }).gte('submitted_at', weekAgo),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true }).gte('submitted_at', twoWeeksAgo).lt('submitted_at', weekAgo),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true }).gte('submitted_at', todayStart),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true }).eq('high_risk_flag', true).gte('submitted_at', weekAgo),
    db.from('assessment_submissions').select('id', { count: 'exact', head: true }).eq('high_risk_flag', true).gte('submitted_at', twoWeeksAgo).lt('submitted_at', weekAgo),
    db.from('assessment_definitions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('assessment_submissions').select('definition_id, assessment_definitions(name_en, code)').limit(500),
    db.from('assessment_submissions')
      .select('id, total_score, severity_band, high_risk_flag, submitted_at, assessment_definitions(name_en, code), profiles(full_name_en)')
      .order('submitted_at', { ascending: false }).limit(10),
    db.from('audit_log').select('id, action, target_type, created_at, profiles(full_name_en)')
      .order('created_at', { ascending: false }).limit(8),
    db.from('assessment_submissions').select('total_score, severity_band, high_risk_flag').limit(5000),
  ])

  // Top assessments
  const countMap: Record<string, { name: string; code: string; count: number }> = {}
  ;(topAssessmentsRaw || []).forEach((s: any) => {
    const id = s.definition_id
    if (!countMap[id]) countMap[id] = { name: s.assessment_definitions?.name_en || '', code: s.assessment_definitions?.code || '', count: 0 }
    countMap[id].count++
  })
  const top5 = Object.values(countMap).sort((a, b) => b.count - a.count).slice(0, 5)

  // Role counts
  const roles: Record<string, number> = {}
  ;(profiles || []).forEach((p: any) => { roles[p.role] = (roles[p.role] || 0) + 1 })

  function pctChange(current: number | null, previous: number | null) {
    const cur = current ?? 0
    const prev = previous ?? 0
    if (prev === 0) return null
    return +((cur - prev) / prev * 100).toFixed(1)
  }

  const weekChange = pctChange(weekCount, prevWeekCount)
  const riskChange = pctChange(highRiskCount, prevHighRiskCount)

  const severityMap: Record<string, number> = {}
  ;(allSubsStats || []).forEach((s: any) => {
    const b = s.severity_band || 'Unknown'
    severityMap[b] = (severityMap[b] || 0) + 1
  })
  const totalSubs = allSubsStats?.length || 0
  const severityDist = Object.entries(severityMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const highRiskAll = (allSubsStats || []).filter((s: any) => s.high_risk_flag).length

  function severityColor(band: string) {
    const b = (band || '').toLowerCase()
    if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return 'bg-green-100 text-green-700'
    if (b.includes('mild')) return 'bg-yellow-100 text-yellow-700'
    if (b.includes('moderate')) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const ChangeBadge = ({ change }: { change: number | null }) => {
    if (change === null) return null
    const up = change > 0
    const Icon = up ? TrendingUp : TrendingDown
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        <Icon className="w-3 h-3" />{up ? '+' : ''}{change}%
      </span>
    )
  }

  const statsCards = [
    {
      label: t('admin.overview.total_users', lang),
      value: (profiles || []).length,
      icon: Users,
      color: 'bg-brand-50 text-brand-600',
      sub: `${roles.patient || 0} ${t('admin.overview.patients', lang)} · ${roles.clinician || 0} ${t('admin.overview.clinicians', lang)}`,
      change: null,
    },
    {
      label: t('admin.overview.all_time', lang),
      value: totalCount ?? '–',
      icon: ClipboardCheck,
      color: 'bg-green-50 text-green-600',
      sub: `${totalSubs > 0 ? ((highRiskAll / totalSubs) * 100).toFixed(1) : 0}% ${t('admin.overview.high_risk_overall', lang)}`,
      change: null,
    },
    {
      label: t('admin.overview.this_week', lang),
      value: weekCount ?? '–',
      icon: TrendingUp,
      color: 'bg-accent-50 text-accent-600',
      sub: t('admin.overview.vs_prior', lang),
      change: weekChange,
    },
    {
      label: t('admin.overview.high_risk_7d', lang),
      value: highRiskCount ?? '–',
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      sub: t('admin.overview.high_risk_note', lang),
      change: riskChange,
    },
    {
      label: t('admin.overview.today', lang),
      value: todayCount ?? '–',
      icon: Activity,
      color: 'bg-yellow-50 text-yellow-600',
      sub: t('admin.overview.today_note', lang),
      change: null,
    },
    {
      label: t('admin.overview.active_assessments', lang),
      value: activeAssessmentCount ?? '–',
      icon: ShieldAlert,
      color: 'bg-brand-50 text-brand-600',
      sub: t('admin.overview.active_note', lang),
      change: null,
    },
  ]

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.overview.title', lang)}</h1>
          <p className="text-gray-500 mt-1">{t('admin.overview.subtitle', lang)}</p>
        </div>
        <Link href="/x/control/analytics"
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Brain className="w-4 h-4 text-brand-500" />
          {t('admin.overview.deep_analytics', lang)}
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statsCards.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">{s.sub}</p>
              {s.change !== null && <ChangeBadge change={s.change} />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Users by role */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.overview.roles', lang)}</h2>
          <div className="space-y-3">
            {[
              { role: 'patient', color: '#6366f1' },
              { role: 'clinician', color: '#22c55e' },
              { role: 'admin', color: '#a855f7' },
              { role: 'superadmin', color: '#ef4444' },
            ].map(({ role, color }) => {
              const count = roles[role] || 0
              const pct = (profiles || []).length > 0 ? (count / (profiles || []).length) * 100 : 0
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize text-gray-600">{role}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {totalSubs > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 mb-3">{t('admin.overview.severity', lang)}</h3>
              <div className="space-y-2">
                {severityDist.map(([band, cnt]) => (
                  <div key={band} className="flex items-center justify-between">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${severityColor(band)}`}>{band}</span>
                    <span className="text-xs text-gray-500">{cnt} ({totalSubs ? ((cnt / totalSubs) * 100).toFixed(0) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top assessments */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('admin.overview.top_assessments', lang)}</h2>
            <Link href="/x/control/analytics" className="text-xs text-brand-500 hover:underline">{t('admin.overview.view_analytics', lang)}</Link>
          </div>
          <div className="space-y-3">
            {top5.length === 0 && <p className="text-sm text-gray-400">{t('admin.overview.no_submissions', lang)}</p>}
            {top5.map((a, i) => (
              <div key={a.code} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm text-gray-700 font-medium">{a.name}</span>
                      <span className="ml-1.5 text-xs text-gray-400">({a.code})</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{a.count.toLocaleString()}</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className="bg-brand-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (a.count / (top5[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">{t('admin.overview.recent', lang)}</h2>
          <Link href="/x/control/results" className="text-xs text-brand-500 hover:underline">{t('admin.overview.view_all', lang)}</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {(recentSubmissions || []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.profiles?.full_name_en || t('admin.anonymous', lang)}</p>
                <p className="text-xs text-gray-400">{s.assessment_definitions?.name_en} · {new Date(s.submitted_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.high_risk_flag && <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(s.severity_band)}`}>{s.severity_band}</span>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{s.total_score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent audit */}
      {(recentAudit || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('admin.overview.audit', lang)}</h2>
            <Link href="/x/control/audit" className="text-xs text-brand-500 hover:underline">{t('admin.overview.view_all', lang)}</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentAudit || []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{e.profiles?.full_name_en || t('admin.anonymous', lang)}</span>
                    <span className="mx-1 text-gray-400">·</span>
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{e.action}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{e.target_type} · {new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
