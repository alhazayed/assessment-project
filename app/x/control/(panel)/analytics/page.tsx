'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Download, TrendingUp, TrendingDown, AlertTriangle, Users, Brain,
  ChevronUp, ChevronDown, Minus, BarChart3, Globe, Lightbulb,
  FileText, Database, Filter, RefreshCw,
} from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

const chartLoading = (h: number) => () => <div className="rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface-alt)', height: h }} />
const DailySubmissionsChart = dynamic(() => import('./analytics-charts').then(m => m.DailySubmissionsChart), { ssr: false, loading: chartLoading(200) })
const UserGrowthChart = dynamic(() => import('./analytics-charts').then(m => m.UserGrowthChart), { ssr: false, loading: chartLoading(180) })
const TrendVolumeChart = dynamic(() => import('./analytics-charts').then(m => m.TrendVolumeChart), { ssr: false, loading: chartLoading(200) })
const TrendMeanScoreChart = dynamic(() => import('./analytics-charts').then(m => m.TrendMeanScoreChart), { ssr: false, loading: chartLoading(180) })

// ─── Types ────────────────────────────────────────────────────────────────────

type DailyPoint = { date: string; label: string; submissions: number; highRisk: number }
type SeverityPoint = { band: string; count: number; percent: number }
type AssessmentStat = {
  id: string; code: string; name_en: string; is_active: boolean
  count: number; highRiskCount: number; highRiskPct: number
  avg: number; median: number; stddev: number; min: number; max: number
  severityBands: Record<string, number>
}
type UserGrowthPoint = { date: string; label: string; count: number }
type OverallStats = {
  total: number; avg: number; median: number; stddev: number; min: number; max: number
  highRisk: number; highRiskPct: number
  totalUsers: number; newUsersThisMonth: number
  last30DaySubmissions: number; periodChange: number | null
  roleDistribution: Record<string, number>
}
type Analytics = {
  dailySubmissions: DailyPoint[]
  severityDistribution: SeverityPoint[]
  assessmentStats: AssessmentStat[]
  userGrowth: UserGrowthPoint[]
  overallStats: OverallStats
}
type DemoBreakdown = { label: string; meanScore: number; median: number; sampleSize: number }
type CrossTabRow = { group: string; total: number; severities: { severity: string; count: number; pct: number }[] }
type TrendPoint = { label: string; count: number; mean: number; highRisk: number }
type Insight = { type: 'info' | 'warning' | 'success'; text: string }
type Research = {
  demographicAnalysis: Record<string, {
    name: string; total: number
    gender: DemoBreakdown[]; ageGroup: DemoBreakdown[]; education: DemoBreakdown[]
    employment: DemoBreakdown[]; country: DemoBreakdown[]; medication: DemoBreakdown[]
  }>
  crossTabAnalysis: {
    genderBySeverity: CrossTabRow[]; ageGroupBySeverity: CrossTabRow[]
    countryBySeverity: CrossTabRow[]; medicationBySeverity: CrossTabRow[]
    employmentBySeverity: CrossTabRow[]
  }
  trends: { weekly: TrendPoint[]; monthly: TrendPoint[]; quarterly: TrendPoint[] }
  insights: Insight[]
  assessmentDistribution: { code: string; name: string; count: number; pct: number; highRiskCount: number; highRiskPct: number }[]
  riskDistribution: { level: string; count: number; pct: number }[]
  execStats: { totalUsers: number; totalAssessments: number; highRiskCount: number; highRiskPct: number; mostCommon: string }
  totalRecords: number
}
type ResultRow = {
  id: string; code: string; assessment_name: string
  total_score: number; severity_band: string; high_risk_flag: boolean; submitted_at: string
  gender: string; age_group: string; country: string; education: string; employment: string; medication: string
}

type Tab = 'overview' | 'results' | 'demographics' | 'crosstabs' | 'trends' | 'insights' | 'export'
type SortKey = 'count' | 'avg' | 'median' | 'stddev' | 'min' | 'max' | 'highRiskPct'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityFill(band: string): string {
  const b = (band || '').toLowerCase()
  if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('low') || b.includes('negative')) return '#22c55e'
  if (b.includes('mild')) return '#f59e0b'
  if (b.includes('moderate')) return '#f97316'
  if (b.includes('severe') || b.includes('high') || b.includes('crisis')) return '#ef4444'
  return '#9ca3af'
}
function severityBadge(band: string): string {
  const b = (band || '').toLowerCase()
  if (b.includes('none') || b.includes('minimal') || b.includes('normal') || b.includes('low') || b.includes('negative')) return 'badge-minimal'
  if (b.includes('mild')) return 'badge-mild'
  if (b.includes('moderate')) return 'badge-moderate'
  if (b.includes('severe') || b.includes('high') || b.includes('crisis')) return 'badge-severe'
  return 'badge-neutral'
}
function fmt(n: number | null | undefined) { return n == null ? '—' : n.toLocaleString() }

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card h-24 bg-gray-100 dark:bg-gray-800" />)}
      </div>
      <div className="card h-48 bg-gray-100 dark:bg-gray-800" />
      <div className="card h-48 bg-gray-100 dark:bg-gray-800" />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const lang = useLang()
  const isAr = lang === 'ar'

  const [tab, setTab] = useState<Tab>('overview')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [research, setResearch] = useState<Research | null>(null)
  const [loading, setLoading] = useState(true)
  const [researchLoading, setResearchLoading] = useState(true)

  // Results tab state
  const [results, setResults] = useState<ResultRow[]>([])
  const [resultsMeta, setResultsMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [assessmentList, setAssessmentList] = useState<{ code: string; name: string }[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsFilters, setResultsFilters] = useState({
    assessment: '', severity: '', from: '', to: '',
    gender: '', ageGroup: '', country: '', education: '', employment: '', medication: '',
    minScore: '', maxScore: '',
  })
  const [resultsPage, setResultsPage] = useState(1)

  // Overview sort
  const [sortKey, setSortKey] = useState<SortKey>('count')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Research sub-tabs
  const [demoAssessment, setDemoAssessment] = useState('')
  const [trendPeriod, setTrendPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly')
  const [crossTabField, setCrossTabField] = useState<keyof Research['crossTabAnalysis']>('genderBySeverity')

  // Export state
  const [exportFilters, setExportFilters] = useState({ assessment: '', from: '', to: '', severity: '' })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setAnalytics(d); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/admin/research')
      .then(r => r.json())
      .then(d => { setResearch(d); setResearchLoading(false) })
      .catch(() => setResearchLoading(false))
  }, [])

  const fetchResults = useCallback(async (page = 1) => {
    setResultsLoading(true)
    const params = new URLSearchParams({ page: String(page), ...resultsFilters })
    const data = await fetch(`/api/admin/results?${params}`).then(r => r.json())
    setResults(data.results || [])
    setResultsMeta({ page: data.pagination?.page || 1, totalPages: data.pagination?.totalPages || 1, total: data.pagination?.total || 0 })
    setAssessmentList(data.assessments || [])
    setResultsLoading(false)
  }, [resultsFilters])

  useEffect(() => {
    if (tab === 'results') fetchResults(resultsPage)
  }, [tab, resultsPage, fetchResults])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const doExport = async (format: string) => {
    setExporting(true)
    const params = new URLSearchParams({ format, ...exportFilters })
    const res = await fetch(`/api/admin/export?${params}`)
    if (!res.ok) { setExporting(false); return }
    if (format === 'pdf') {
      const html = await res.text()
      const w = window.open('', '_blank')
      w?.document.write(html)
    } else {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('content-disposition')?.split('filename="')[1]?.replace('"', '') || `export-${format}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  // ─── TAB CONFIG ────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',     label: isAr ? 'نظرة عامة'         : 'Overview',       icon: BarChart3 },
    { id: 'results',      label: isAr ? 'النتائج'           : 'Results',        icon: Database },
    { id: 'demographics', label: isAr ? 'التحليل الديموغرافي' : 'Demographics',  icon: Users },
    { id: 'crosstabs',    label: isAr ? 'التحليل المتقاطع'  : 'Cross-Analysis', icon: Filter },
    { id: 'trends',       label: isAr ? 'الاتجاهات'         : 'Trends',         icon: TrendingUp },
    { id: 'insights',     label: isAr ? 'الرؤى'             : 'Insights',       icon: Lightbulb },
    { id: 'export',       label: isAr ? 'التصدير'           : 'Export',         icon: Download },
  ]

  // ─── RENDER ────────────────────────────────────────────────────────────────

  const pageHeader = (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'لوحة التحليلات البحثية' : 'Statistical Analytics Dashboard'}
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {isAr ? 'تحليل نتائج التقييمات بشكل مجهول الهوية' : 'Anonymized assessment outcome analytics — no PII exposed'}
        </p>
      </div>
      {research && (
        <div className="text-right">
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'إجمالي السجلات' : 'Total records'}</p>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{research.totalRecords.toLocaleString()}</p>
        </div>
      )}
    </div>
  )

  const tabBar = (
    <div className="flex gap-1 mb-6 overflow-x-auto pb-1 flex-wrap">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
            tab === id
              ? 'text-white'
              : 'hover:opacity-80'
          }`}
          style={tab === id ? { backgroundColor: '#F3650A' } : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )

  // ─── OVERVIEW TAB ──────────────────────────────────────────────────────────

  const overviewTab = () => {
    if (loading) return <LoadingSkeleton />
    if (!analytics) return <p style={{ color: 'var(--text-muted)' }}>No data available.</p>
    const { overallStats: os, dailySubmissions, severityDistribution, assessmentStats, userGrowth } = analytics

    const sorted = [...assessmentStats].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    const SortIcon = ({ k }: { k: SortKey }) =>
      sortKey !== k ? <Minus className="w-3 h-3 opacity-30" /> :
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />

    const execCards = research ? [
      { label: isAr ? 'إجمالي المستخدمين' : 'Total Users', value: research.execStats.totalUsers.toLocaleString(), icon: Users, color: 'bg-blue-50 text-blue-600' },
      { label: isAr ? 'إجمالي التقييمات' : 'Total Assessments', value: research.execStats.totalAssessments.toLocaleString(), icon: BarChart3, color: 'bg-orange-50 text-orange-600' },
      { label: isAr ? 'حالات المخاطر العالية' : 'High-Risk Cases', value: `${research.execStats.highRiskCount} (${research.execStats.highRiskPct}%)`, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
      { label: isAr ? 'الأكثر شيوعاً' : 'Most Common', value: research.execStats.mostCommon, icon: Brain, color: 'bg-green-50 text-green-600' },
    ] : [
      { label: isAr ? 'إجمالي التقييمات' : 'Total Assessments', value: fmt(os.total), icon: BarChart3, color: 'bg-orange-50 text-orange-600' },
      { label: isAr ? 'حالات المخاطر' : 'High-Risk Flags', value: `${fmt(os.highRisk)} (${os.highRiskPct}%)`, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
      { label: isAr ? 'المستخدمون' : 'Registered Users', value: fmt(os.totalUsers), icon: Users, color: 'bg-blue-50 text-blue-600' },
      { label: isAr ? 'تقييمات هذا الشهر' : 'This Month', value: fmt(os.last30DaySubmissions), icon: Brain, color: 'bg-green-50 text-green-600' },
    ]

    return (
      <div className="space-y-6">
        {/* Executive summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {execCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[11.5px] mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Daily trends + severity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-6">
            <h2 className="text-[13.5px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{isAr ? 'الاتجاهات اليومية (30 يوماً)' : 'Daily Submission Trends (30 days)'}</h2>
            <DailySubmissionsChart dailySubmissions={dailySubmissions} isAr={isAr} />
          </div>

          <div className="card p-6">
            <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'توزيع الخطورة' : 'Severity Distribution'}</h2>
            <div className="space-y-3">
              {severityDistribution.map(s => (
                <div key={s.band}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded-full ${severityBadge(s.band)}`}>{s.band}</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.count.toLocaleString()} ({s.percent}%)</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${s.percent}%`, backgroundColor: severityFill(s.band) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-assessment table */}
        <div className="card p-6">
          <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'إحصائيات التقييمات' : 'Per-Assessment Statistics'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  {([
                    ['code', isAr ? 'الرمز' : 'Code', false],
                    ['count', isAr ? 'عدد' : 'Count', true],
                    ['avg', isAr ? 'المتوسط' : 'Mean', true],
                    ['median', isAr ? 'الوسيط' : 'Median', true],
                    ['stddev', isAr ? 'الانحراف' : 'Std Dev', true],
                    ['min', isAr ? 'أدنى' : 'Min', true],
                    ['max', isAr ? 'أعلى' : 'Max', true],
                    ['highRiskPct', isAr ? 'نسبة الخطر' : 'High Risk %', true],
                  ] as [string, string, boolean][]).map(([key, label, sortable]) => (
                    <th key={key}
                      className={`text-start py-2 px-2 font-semibold ${sortable ? 'cursor-pointer select-none' : ''}`}
                      style={{ color: 'var(--text-muted)' }}
                      onClick={sortable ? () => handleSort(key as SortKey) : undefined}>
                      <span className="flex items-center gap-1">{label}{sortable && <SortIcon k={key as SortKey} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--divider)' }} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-2 px-2">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{a.code}</p>
                      <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{a.name_en}</p>
                    </td>
                    <td className="py-2 px-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{a.count.toLocaleString()}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.avg}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.median}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.stddev}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.min}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.max}</td>
                    <td className="py-2 px-2">
                      <span className={a.highRiskPct > 20 ? 'text-red-600 font-semibold' : ''} style={a.highRiskPct <= 20 ? { color: 'var(--text-secondary)' } : {}}>
                        {a.highRiskPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assessment distribution + user growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {research && (
            <div className="card p-6">
              <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'توزيع التقييمات' : 'Assessment Distribution'}</h2>
              <div className="space-y-3">
                {research.assessmentDistribution.slice(0, 8).map(a => (
                  <div key={a.code}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{a.code}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.count.toLocaleString()} ({a.pct}%)</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${a.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-[13.5px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{isAr ? 'نمو المستخدمين (30 يوماً)' : 'User Growth (30 days)'}</h2>
            <UserGrowthChart userGrowth={userGrowth} isAr={isAr} />
          </div>
        </div>
      </div>
    )
  }

  // ─── RESULTS TAB ───────────────────────────────────────────────────────────

  const resultsTab = () => {
    const FilterInput = ({ name, placeholder, type = 'text' }: { name: keyof typeof resultsFilters; placeholder: string; type?: string }) => (
      <input
        type={type}
        className="input text-[12px] h-8 px-2"
        placeholder={placeholder}
        value={resultsFilters[name]}
        onChange={e => setResultsFilters(f => ({ ...f, [name]: e.target.value }))}
      />
    )
    const FilterSelect = ({ name, options, placeholder }: { name: keyof typeof resultsFilters; options: string[]; placeholder: string }) => (
      <select className="input text-[12px] h-8 px-2" value={resultsFilters[name]} onChange={e => setResultsFilters(f => ({ ...f, [name]: e.target.value }))}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )

    return (
      <div className="space-y-4">
        <div className="card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
            <select className="input text-[12px] h-8 px-2" value={resultsFilters.assessment} onChange={e => setResultsFilters(f => ({ ...f, assessment: e.target.value }))}>
              <option value="">{isAr ? 'كل التقييمات' : 'All Assessments'}</option>
              {assessmentList.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
            </select>
            <FilterSelect name="severity" options={['minimal', 'mild', 'moderate', 'severe', 'high_risk']} placeholder={isAr ? 'الخطورة' : 'Severity'} />
            <FilterInput name="from" placeholder={isAr ? 'من تاريخ' : 'Date from'} type="date" />
            <FilterInput name="to" placeholder={isAr ? 'إلى تاريخ' : 'Date to'} type="date" />
            <FilterSelect name="gender" options={['Male', 'Female', 'Other', 'Unknown']} placeholder={isAr ? 'الجنس' : 'Gender'} />
            <FilterSelect name="ageGroup" options={['Under 18', '18–24', '25–34', '35–44', '45–54', '55+']} placeholder={isAr ? 'الفئة العمرية' : 'Age Group'} />
            <FilterInput name="country" placeholder={isAr ? 'الدولة' : 'Country'} />
            <FilterSelect name="medication" options={['Yes', 'No', 'Unknown']} placeholder={isAr ? 'الدواء' : 'Medication'} />
            <FilterInput name="minScore" placeholder={isAr ? 'أدنى درجة' : 'Min score'} type="number" />
            <FilterInput name="maxScore" placeholder={isAr ? 'أعلى درجة' : 'Max score'} type="number" />
            <button
              onClick={() => { setResultsPage(1); fetchResults(1) }}
              className="btn-accent text-[12px] h-8 flex items-center justify-center gap-1"
              disabled={resultsLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resultsLoading ? 'animate-spin' : ''}`} />
              {isAr ? 'تطبيق' : 'Apply'}
            </button>
            <button
              onClick={() => {
                setResultsFilters({ assessment: '', severity: '', from: '', to: '', gender: '', ageGroup: '', country: '', education: '', employment: '', medication: '', minScore: '', maxScore: '' })
                setResultsPage(1)
              }}
              className="text-[12px] h-8 px-3 rounded-lg border"
              style={{ borderColor: 'var(--divider)', color: 'var(--text-muted)' }}
            >
              {isAr ? 'إعادة ضبط' : 'Reset'}
            </button>
          </div>
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {isAr ? `${resultsMeta.total.toLocaleString()} نتيجة` : `${resultsMeta.total.toLocaleString()} results`}
            {' · '}{isAr ? `صفحة ${resultsMeta.page} من ${resultsMeta.totalPages}` : `Page ${resultsMeta.page} of ${resultsMeta.totalPages}`}
          </p>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--divider)', backgroundColor: 'var(--surface-alt)' }}>
                  {([
                    isAr ? 'رقم السجل' : 'Record ID',
                    isAr ? 'نوع التقييم' : 'Assessment Type',
                    isAr ? 'التاريخ' : 'Date',
                    isAr ? 'الفئة العمرية' : 'Age Group',
                    isAr ? 'الجنس' : 'Gender',
                    isAr ? 'الدولة' : 'Country',
                    isAr ? 'التعليم' : 'Education',
                    isAr ? 'الدواء' : 'Medication',
                    isAr ? 'الخطورة' : 'Severity',
                    isAr ? 'الدرجة' : 'Score',
                    isAr ? 'خطر عالٍ' : 'Risk',
                  ]).map(h => (
                    <th key={h} className="text-start py-2 px-3 font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultsLoading ? (
                  <tr><td colSpan={11} className="text-center py-8 text-[12px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'جارٍ التحميل…' : 'Loading…'}</td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-8 text-[12px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'لا توجد نتائج' : 'No results'}</td></tr>
                ) : results.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)' }} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-2 px-3 font-mono text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{r.id.slice(0, 8)}…</td>
                    <td className="py-2 px-3">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.code}</p>
                      <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{r.assessment_name}</p>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{new Date(r.submitted_at).toLocaleDateString()}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{r.age_group}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{r.gender}</td>
                    <td className="py-2 px-3 max-w-[100px] truncate" style={{ color: 'var(--text-secondary)' }} title={r.country}>{r.country}</td>
                    <td className="py-2 px-3 max-w-[100px] truncate" style={{ color: 'var(--text-secondary)' }} title={r.education}>{r.education}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{r.medication}</td>
                    <td className="py-2 px-3"><span className={severityBadge(r.severity_band)}>{r.severity_band}</span></td>
                    <td className="py-2 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{r.total_score}</td>
                    <td className="py-2 px-3">{r.high_risk_flag ? <span className="text-red-600 font-semibold text-[10.5px]">⚠ High</span> : <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultsMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--divider)' }}>
              <button disabled={resultsPage === 1} onClick={() => setResultsPage(p => p - 1)} className="text-[12px] px-3 py-1.5 rounded-lg disabled:opacity-40" style={{ border: '1px solid var(--divider)', color: 'var(--text-secondary)' }}>
                {isAr ? 'السابق' : 'Previous'}
              </button>
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{resultsMeta.page} / {resultsMeta.totalPages}</span>
              <button disabled={resultsPage >= resultsMeta.totalPages} onClick={() => setResultsPage(p => p + 1)} className="text-[12px] px-3 py-1.5 rounded-lg disabled:opacity-40" style={{ border: '1px solid var(--divider)', color: 'var(--text-secondary)' }}>
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── DEMOGRAPHICS TAB ──────────────────────────────────────────────────────

  const demographicsTab = () => {
    if (researchLoading) return <LoadingSkeleton />
    if (!research) return null
    const codes = Object.keys(research.demographicAnalysis)
    const selected = demoAssessment || codes[0] || ''
    const demo = research.demographicAnalysis[selected]

    const DemoTable = ({ data, label }: { data: DemoBreakdown[]; label: string }) => (
      <div className="card p-5">
        <h3 className="text-[12.5px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{label}</h3>
        <table className="w-full text-[11.5px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--divider)' }}>
              <th className="text-start py-1.5 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{isAr ? 'الفئة' : 'Group'}</th>
              <th className="text-start py-1.5 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{isAr ? 'المتوسط' : 'Mean'}</th>
              <th className="text-start py-1.5 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{isAr ? 'الوسيط' : 'Median'}</th>
              <th className="text-start py-1.5 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{isAr ? 'العدد' : 'N'}</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.label} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td className="py-1.5 px-2 font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>{row.label}</td>
                <td className="py-1.5 px-2" style={{ color: 'var(--text-secondary)' }}>{row.meanScore}</td>
                <td className="py-1.5 px-2" style={{ color: 'var(--text-secondary)' }}>{row.median}</td>
                <td className="py-1.5 px-2" style={{ color: 'var(--text-muted)' }}>{row.sampleSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <label className="text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{isAr ? 'اختر التقييم:' : 'Select Assessment:'}</label>
          <select className="input text-[12px] h-8 w-48" value={selected} onChange={e => setDemoAssessment(e.target.value)}>
            {codes.map(c => <option key={c} value={c}>{c} (n={research.demographicAnalysis[c].total})</option>)}
          </select>
        </div>

        {demo && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DemoTable data={demo.gender} label={isAr ? 'تحليل الجنس' : 'Gender Analysis'} />
              <DemoTable data={demo.ageGroup} label={isAr ? 'تحليل الفئة العمرية' : 'Age Group Analysis'} />
              <DemoTable data={demo.medication} label={isAr ? 'استخدام الدواء' : 'Medication Use'} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DemoTable data={demo.education} label={isAr ? 'المستوى التعليمي' : 'Education Level'} />
              <DemoTable data={demo.employment} label={isAr ? 'الوضع الوظيفي' : 'Employment Status'} />
              <DemoTable data={demo.country.slice(0, 10)} label={isAr ? 'الدول (أعلى 10)' : 'Country (Top 10)'} />
            </div>
          </>
        )}

        {/* Assessment distribution table */}
        <div className="card p-6">
          <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'توزيع أنواع التقييمات' : 'Assessment Type Distribution'}</h2>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                {(['Code', 'Assessment', 'Count', '%', 'High Risk', 'High Risk %'] as const).map(h => (
                  <th key={h} className="text-start py-2 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {research.assessmentDistribution.map(a => (
                <tr key={a.code} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td className="py-2 px-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{a.code}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.name}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.count.toLocaleString()}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.pct}%</td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{a.highRiskCount}</td>
                  <td className="py-2 px-2">
                    <span className={a.highRiskPct > 20 ? 'text-red-600 font-semibold' : ''} style={a.highRiskPct <= 20 ? { color: 'var(--text-secondary)' } : {}}>{a.highRiskPct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── CROSS-TABS TAB ────────────────────────────────────────────────────────

  const crosstabsTab = () => {
    if (researchLoading) return <LoadingSkeleton />
    if (!research) return null

    const fieldOptions: { key: keyof Research['crossTabAnalysis']; label: string }[] = [
      { key: 'genderBySeverity', label: isAr ? 'الجنس × الخطورة' : 'Gender × Severity' },
      { key: 'ageGroupBySeverity', label: isAr ? 'الفئة العمرية × الخطورة' : 'Age Group × Severity' },
      { key: 'medicationBySeverity', label: isAr ? 'الدواء × الخطورة' : 'Medication × Severity' },
      { key: 'employmentBySeverity', label: isAr ? 'الوظيفة × الخطورة' : 'Employment × Severity' },
      { key: 'countryBySeverity', label: isAr ? 'الدولة × الخطورة (أعلى 10)' : 'Country × Severity (Top 10)' },
    ]

    const rows = research.crossTabAnalysis[crossTabField] || []
    const allSeverities = Array.from(new Set(rows.flatMap(r => r.severities.map(s => s.severity)))).sort()

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {fieldOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCrossTabField(key)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={crossTabField === key
                ? { backgroundColor: '#F3650A', color: 'white' }
                : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="card p-6">
          <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {fieldOptions.find(f => f.key === crossTabField)?.label}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  <th className="text-start py-2 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{isAr ? 'المجموعة' : 'Group'}</th>
                  <th className="text-start py-2 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>N</th>
                  {allSeverities.map(s => <th key={s} className="text-start py-2 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.group} style={{ borderBottom: '1px solid var(--divider)' }} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-2 px-2 font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{row.group}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-muted)' }}>{row.total}</td>
                    {allSeverities.map(sev => {
                      const match = row.severities.find(s => s.severity === sev)
                      return (
                        <td key={sev} className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                          {match ? <>{match.count} <span style={{ color: 'var(--text-muted)' }}>({match.pct}%)</span></> : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── TRENDS TAB ────────────────────────────────────────────────────────────

  const trendsTab = () => {
    if (researchLoading) return <LoadingSkeleton />
    if (!research) return null

    const data = research.trends[trendPeriod]

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          {(['weekly', 'monthly', 'quarterly'] as const).map(p => (
            <button key={p} onClick={() => setTrendPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-colors"
              style={trendPeriod === p ? { backgroundColor: '#F3650A', color: 'white' } : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>
              {isAr
                ? p === 'weekly' ? 'أسبوعي' : p === 'monthly' ? 'شهري' : 'ربع سنوي'
                : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div className="card p-6">
            <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'عدد التقييمات عبر الزمن' : 'Assessment Volume Over Time'}</h2>
            <TrendVolumeChart data={data} isAr={isAr} />
          </div>

          <div className="card p-6">
            <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'متوسط الدرجات عبر الزمن' : 'Mean Score Over Time'}</h2>
            <TrendMeanScoreChart data={data} isAr={isAr} />
          </div>
        </div>

        {/* Trends data table */}
        <div className="card p-6">
          <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'جدول البيانات' : 'Trend Data Table'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  {([isAr ? 'الفترة' : 'Period', isAr ? 'عدد التقييمات' : 'Count', isAr ? 'متوسط الدرجة' : 'Mean Score', isAr ? 'حالات الخطر' : 'High Risk']).map(h => (
                    <th key={h} className="text-start py-2 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.label} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{row.label}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{row.count}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{row.mean}</td>
                    <td className="py-2 px-2" style={{ color: row.highRisk > 0 ? '#ef4444' : 'var(--text-muted)' }}>{row.highRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── INSIGHTS TAB ──────────────────────────────────────────────────────────

  const insightsTab = () => {
    if (researchLoading) return <LoadingSkeleton />
    if (!research) return null

    const iconMap = { info: '🔵', warning: '🟠', success: '🟢' }
    const bgMap = {
      info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100',
      warning: 'bg-orange-50 dark:bg-orange-950/30 border-orange-100',
      success: 'bg-green-50 dark:bg-green-950/30 border-green-100',
    }

    return (
      <div className="space-y-4">
        <div className="card p-5" style={{ border: '1px solid var(--divider)' }}>
          <div className="flex items-start gap-3 mb-1">
            <Brain className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#1D6296' }} />
            <div>
              <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{isAr ? 'محرك الرؤى السريرية' : 'Clinical Insights Engine'}</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {isAr
                  ? `تم تحليل ${research.totalRecords.toLocaleString()} سجلاً تلقائياً للكشف عن الأنماط.`
                  : `Auto-generated from ${research.totalRecords.toLocaleString()} records. Updated on each page load.`}
              </p>
            </div>
          </div>
        </div>

        {research.insights.map((insight, i) => (
          <div key={i} className={`rounded-xl border px-5 py-4 ${bgMap[insight.type]}`}>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{iconMap[insight.type]}</span>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{insight.text}</p>
            </div>
          </div>
        ))}

        {/* Risk distribution summary */}
        {research.riskDistribution.length > 0 && (
          <div className="card p-5">
            <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isAr ? 'توزيع الخطر' : 'Risk Distribution'}</h3>
            <div className="space-y-2.5">
              {research.riskDistribution.map(r => (
                <div key={r.level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{r.level}</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{r.count} ({r.pct}%)</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${r.pct}%`, backgroundColor: r.level === 'High' || r.level === 'Crisis' ? '#ef4444' : '#22c55e' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── EXPORT TAB ────────────────────────────────────────────────────────────

  const exportTab = () => {
    const ExportCard = ({ format, title, desc, icon }: { format: string; title: string; desc: string; icon: React.ElementType }) => {
      const Icon = icon
      return (
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Icon className="w-4 h-4 text-blue-600" /></div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          </div>
          <button
            onClick={() => doExport(format)}
            disabled={exporting}
            className="btn-accent text-[12.5px] flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? (isAr ? 'جارٍ التصدير…' : 'Exporting…') : (isAr ? 'تصدير' : 'Export')}
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="card p-5">
          <h2 className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isAr ? 'مُنشئ مجموعة البيانات البحثية' : 'Research Dataset Builder'}</h2>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {isAr ? 'طبّق المرشحات ثم اختر تنسيق التصدير. جميع التصديرات مجهولة الهوية تماماً.' : 'Apply filters then choose an export format. All exports are fully anonymized — no PII included.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">{isAr ? 'نوع التقييم' : 'Assessment Type'}</label>
              <select className="input text-[12px]" value={exportFilters.assessment} onChange={e => setExportFilters(f => ({ ...f, assessment: e.target.value }))}>
                <option value="">{isAr ? 'الكل' : 'All'}</option>
                {analytics?.assessmentStats.map(a => <option key={a.code} value={a.code}>{a.code}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{isAr ? 'من تاريخ' : 'Date From'}</label>
              <input type="date" className="input text-[12px]" value={exportFilters.from} onChange={e => setExportFilters(f => ({ ...f, from: e.target.value }))} />
            </div>
            <div>
              <label className="label">{isAr ? 'إلى تاريخ' : 'Date To'}</label>
              <input type="date" className="input text-[12px]" value={exportFilters.to} onChange={e => setExportFilters(f => ({ ...f, to: e.target.value }))} />
            </div>
            <div>
              <label className="label">{isAr ? 'الخطورة' : 'Severity'}</label>
              <select className="input text-[12px]" value={exportFilters.severity} onChange={e => setExportFilters(f => ({ ...f, severity: e.target.value }))}>
                <option value="">{isAr ? 'الكل' : 'All'}</option>
                <option value="high_risk">{isAr ? 'مخاطر عالية فقط' : 'High Risk Only'}</option>
                <option value="severe">{isAr ? 'شديد' : 'Severe'}</option>
                <option value="moderate">{isAr ? 'متوسط' : 'Moderate'}</option>
                <option value="mild">{isAr ? 'خفيف' : 'Mild'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export options */}
        <div>
          <h3 className="text-[12.5px] font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>{isAr ? 'صيغ التصدير' : 'EXPORT FORMATS'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportCard format="csv" title={isAr ? 'بيانات خام (CSV)' : 'Raw Dataset (CSV)'} desc={isAr ? 'جميع السجلات المجهولة مع البيانات الديموغرافية' : 'All anonymized records with full demographics'} icon={Database} />
            <ExportCard format="stats" title={isAr ? 'إحصائيات التقييمات (CSV)' : 'Assessment Statistics (CSV)'} desc={isAr ? 'متوسطات ووسيط وانحراف معياري لكل تقييم' : 'Mean, median, stddev per assessment type'} icon={BarChart3} />
            <ExportCard format="risk" title={isAr ? 'تقرير المخاطر العالية (CSV)' : 'High-Risk Report (CSV)'} desc={isAr ? 'سجلات المخاطر العالية فقط' : 'High-risk flagged records only'} icon={AlertTriangle} />
            <ExportCard format="demographics" title={isAr ? 'تحليل ديموغرافي (CSV)' : 'Demographic Analysis (CSV)'} desc={isAr ? 'التوزيع الديموغرافي حسب التقييم' : 'Demographic breakdown per assessment'} icon={Globe} />
            <ExportCard format="pdf" title={isAr ? 'تقرير PDF' : 'PDF Report'} desc={isAr ? 'تقرير جاهز للطباعة (يفتح في نافذة جديدة)' : 'Print-ready report (opens in new tab)'} icon={FileText} />
          </div>
        </div>

        {/* Privacy notice */}
        <div className="rounded-xl p-4 text-[12px] space-y-1" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>🔒 {isAr ? 'إشعار الخصوصية' : 'Privacy Notice'}</p>
          <p>{isAr ? 'لا تحتوي جميع الصادرات على أي معرفات شخصية (الأسماء أو البريد الإلكتروني أو أرقام الهواتف أو عناوين IP).' : 'All exports contain no personally identifiable information (names, emails, phone numbers, or IP addresses).'}</p>
          <p>{isAr ? 'البيانات متوافقة مع مبادئ GDPR وممارسات الخصوصية المستوحاة من HIPAA.' : 'Data is compliant with GDPR principles and HIPAA-inspired privacy practices.'}</p>
          <p>{isAr ? 'الحد الأقصى للتصدير: 10 تصديرات في الساعة.' : 'Rate limit: 10 exports per hour per admin.'}</p>
        </div>
      </div>
    )
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-[1400px]">
      {pageHeader}
      {tabBar}
      {tab === 'overview'     && overviewTab()}
      {tab === 'results'      && resultsTab()}
      {tab === 'demographics' && demographicsTab()}
      {tab === 'crosstabs'    && crosstabsTab()}
      {tab === 'trends'       && trendsTab()}
      {tab === 'insights'     && insightsTab()}
      {tab === 'export'       && exportTab()}
    </div>
  )
}
