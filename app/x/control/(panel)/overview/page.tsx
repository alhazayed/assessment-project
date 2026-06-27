import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import { Users, ClipboardCheck, AlertTriangle, Activity, TrendingUp, TrendingDown, ShieldAlert, Brain } from 'lucide-react'
import Link from 'next/link'
import DashboardOverview from '@/components/admin/dashboard-overview'

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

  function severityBadge(band: string) {
    const b = (band || '').toLowerCase()
    if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('negative') || b.includes('low')) return 'badge-minimal'
    if (b.includes('mild')) return 'badge-mild'
    if (b.includes('moderate')) return 'badge-moderate'
    return 'badge-severe'
  }

  const ChangeBadge = ({ change }: { change: number | null }) => {
    if (change === null) return null
    const up = change > 0
    const Icon = up ? TrendingUp : TrendingDown
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.overview.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('admin.overview.subtitle', lang)}</p>
        </div>
        <Link href="/x/control/analytics"
          className="flex items-center gap-2 btn-ghost text-sm">
          <Brain className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
          {t('admin.overview.deep_analytics', lang)}
        </Link>
      </div>

      {/* Phase 1: Performance-Optimized Dashboard */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Analytics</h2>
        <DashboardOverview />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statsCards.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="section-label mb-1">{s.label}</p>
                <p className="stat-value">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
              {s.change !== null && <ChangeBadge change={s.change} />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Users by role */}
        <div className="card p-5">
          <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('admin.overview.roles', lang)}</h2>
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
                    <span className="text-[12.5px] capitalize" style={{ color: 'var(--text-secondary)' }}>{role}</span>
                    <span className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {totalSubs > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
              <h3 className="section-label mb-3">{t('admin.overview.severity', lang)}</h3>
              <div className="space-y-2">
                {severityDist.map(([band, cnt]) => (
                  <div key={band} className="flex items-center justify-between">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${severityBadge(band)}`}>{band}</span>
                    <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{cnt} ({totalSubs ? ((cnt / totalSubs) * 100).toFixed(0) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top assessments */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.overview.top_assessments', lang)}</h2>
            <Link href="/x/control/analytics" className="text-xs font-medium hover:underline" style={{ color: 'var(--vw-blue)' }}>{t('admin.overview.view_analytics', lang)}</Link>
          </div>
          <div className="space-y-4">
            {top5.length === 0 && <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.overview.no_submissions', lang)}</p>}
            {top5.map((a, i) => (
              <div key={a.code} className="flex items-center gap-3">
                <span className="text-[11.5px] font-bold w-4 text-right" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                      <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>({a.code})</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{a.count.toLocaleString()}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(100, (a.count / (top5[0]?.count || 1)) * 100)}%`, backgroundColor: 'var(--vw-blue)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.overview.recent', lang)}</h2>
          <Link href="/x/control/results" className="text-xs font-medium hover:underline" style={{ color: 'var(--vw-blue)' }}>{t('admin.overview.view_all', lang)}</Link>
        </div>
        <div style={{ borderTop: '1px solid var(--divider)' }}>
          {(recentSubmissions || []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
              <div>
                <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{s.profiles?.full_name_en || t('admin.anonymous', lang)}</p>
                <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.assessment_definitions?.name_en} · {new Date(s.submitted_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.high_risk_flag && <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${severityBadge(s.severity_band)}`}>{s.severity_band}</span>
                <span className="text-[13px] font-semibold w-8 text-right" style={{ color: 'var(--text-primary)' }}>{s.total_score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent audit */}
      {(recentAudit || []).length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('admin.overview.audit', lang)}</h2>
            <Link href="/x/control/audit" className="text-xs font-medium hover:underline" style={{ color: 'var(--vw-blue)' }}>{t('admin.overview.view_all', lang)}</Link>
          </div>
          <div style={{ borderTop: '1px solid var(--divider)' }}>
            {(recentAudit || []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--divider)' }}>
                <div>
                  <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                    <span className="font-semibold">{e.profiles?.full_name_en || t('admin.anonymous', lang)}</span>
                    <span className="mx-1.5" style={{ color: 'var(--text-muted)' }}>·</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px]" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{e.action}</span>
                  </p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{e.target_type} · {new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
