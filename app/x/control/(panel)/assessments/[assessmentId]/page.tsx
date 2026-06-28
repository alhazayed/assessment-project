'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, ClipboardList, AlertTriangle, RefreshCw, CheckCircle, XCircle, ShieldAlert } from 'lucide-react'
import { useLang } from '@/lib/use-lang'

const BLUE = '#1D6296'
const ORANGE = '#F3650A'

type Breakdown = { group: string; count: number; avgScore: number }
type ItemRow = {
  itemId: string; itemNumber: number; questionEn: string; questionAr: string | null
  isSafetyItem: boolean; subscale: string | null; n: number; mean: number; stdev: number
  missingPercent: number; difficultyIndex: number | null; discriminationIndex: number | null
}
type Analytics = {
  definition: { id: string; code: string; name_en: string; name_ar: string | null; total_questions: number; high_risk_threshold: number | null; is_active: boolean }
  header: { completions: number; avgScore: number | null; lastSubmittedAt: string | null; highRiskCount: number; selfInitiatedCount: number }
  scoreHistogram: { score: number; count: number }[]
  severityBands: { band: string; count: number }[]
  trend: { date: string; completions: number; avgScore: number }[]
  demographics: { gender: Breakdown[]; ageGroup: Breakdown[]; country: Breakdown[]; education: Breakdown[] }
  itemAnalysis: { minN: number; psychometricsAvailable: boolean; items: ItemRow[] }
}

type Tab = 'overview' | 'distribution' | 'items' | 'demographics' | 'trends'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1 shadow-card-md min-w-[120px]">
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <b>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</b></p>
      ))}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[11.5px] mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

function BreakdownChart({ title, data, isAr }: { title: string; data: Breakdown[]; isAr: boolean }) {
  return (
    <div className="card p-4">
      <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {!data.length ? (
        <p className="text-[12.5px] py-8 text-center" style={{ color: 'var(--text-muted)' }}>{isAr ? 'لا توجد بيانات' : 'No data'}</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, data.length * 38)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--divider)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis type="category" dataKey="group" width={90} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name={isAr ? 'العدد' : 'Count'} fill={BLUE} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function AssessmentDetailPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const params = useParams()
  const id = params.assessmentId as string

  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      setData(await res.json())
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const def = data?.definition
  const h = data?.header
  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: isAr ? 'نظرة عامة' : 'Overview' },
    { key: 'distribution', label: isAr ? 'توزيع الدرجات' : 'Distribution' },
    { key: 'items', label: isAr ? 'تحليل البنود' : 'Item Analysis' },
    { key: 'demographics', label: isAr ? 'الخصائص الديموغرافية' : 'Demographics' },
    { key: 'trends', label: isAr ? 'الاتجاهات' : 'Trends' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-[1200px]" dir={isAr ? 'rtl' : 'ltr'}>
      <Link href="/x/control/assessments" className="inline-flex items-center gap-1.5 text-[12.5px] mb-4 transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
        {isAr ? 'كل التقييمات' : 'All assessments'}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-50">
            <ClipboardList className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {loading ? '…' : (isAr && def?.name_ar ? def.name_ar : def?.name_en) || (isAr ? 'تقييم' : 'Assessment')}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {def && <span className="text-[11.5px] font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{def.code}</span>}
              {def && (
                <span className={`flex items-center gap-1 text-[11.5px] font-medium ${def.is_active ? 'text-green-600' : ''}`} style={!def.is_active ? { color: 'var(--text-muted)' } : undefined}>
                  {def.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {def.is_active ? (isAr ? 'مرئي' : 'Visible') : (isAr ? 'مخفي' : 'Hidden')}
                </span>
              )}
              {def && <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{def.total_questions} {isAr ? 'بند' : 'items'}</span>}
            </div>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="card p-4 mb-5 flex items-center gap-2.5" style={{ borderLeft: '3px solid #ef4444' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{isAr ? 'تعذّر تحميل البيانات: ' : 'Could not load analytics: '}{error}</p>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatTile label={isAr ? 'إجمالي الإكمالات' : 'Completions'} value={loading ? '…' : h?.completions ?? 0} />
        <StatTile label={isAr ? 'متوسط الدرجة' : 'Avg score'} value={loading ? '…' : (h?.avgScore ?? '—')} />
        <StatTile label={isAr ? 'تنبيهات عالية الخطورة' : 'High-risk'} value={loading ? '…' : h?.highRiskCount ?? 0} />
        <StatTile label={isAr ? 'ذاتية المبادرة' : 'Self-initiated'} value={loading ? '…' : h?.selfInitiatedCount ?? 0} />
        <StatTile label={isAr ? 'آخر إكمال' : 'Last completed'} value={loading ? '…' : (h?.lastSubmittedAt ? new Date(h.lastSubmittedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' }) : '—')} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: 'var(--divider)' }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors"
            style={tab === key
              ? { color: BLUE, borderBottom: `2px solid ${BLUE}`, marginBottom: '-1px' }
              : { color: 'var(--text-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card h-[260px] animate-pulse" style={{ backgroundColor: 'var(--surface-alt)' }} />
      ) : !data || data.header.completions === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{isAr ? 'لا توجد إكمالات بعد' : 'No completions yet'}</p>
          <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-muted)' }}>{isAr ? 'ستظهر التحليلات بمجرد إرسال التقييمات.' : 'Analytics appear once this assessment is submitted.'}</p>
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-4">
                <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isAr ? 'حسب شدة الأعراض' : 'By severity band'}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.severityBands} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                    <XAxis dataKey="band" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name={isAr ? 'العدد' : 'Count'} fill={ORANGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-4">
                <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isAr ? 'الإكمالات عبر الزمن' : 'Completions over time'}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.trend} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="completions" name={isAr ? 'الإكمالات' : 'Completions'} stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'distribution' && (
            <div className="card p-4">
              <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isAr ? 'توزيع الدرجات الكلية' : 'Total score distribution'}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.scoreHistogram} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                  <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} label={{ value: isAr ? 'الدرجة' : 'Score', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name={isAr ? 'عدد المرضى' : 'Respondents'} fill={BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {def?.high_risk_threshold != null && (
                <p className="text-[11.5px] mt-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <ShieldAlert className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                  {isAr ? 'عتبة الخطورة العالية:' : 'High-risk threshold:'} <b>{def.high_risk_threshold}</b>
                </p>
              )}
            </div>
          )}

          {tab === 'items' && (
            <div className="card overflow-hidden">
              {!data.itemAnalysis.psychometricsAvailable && (
                <div className="px-5 py-3 flex items-start gap-2 text-[12px]" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                  <span>
                    {isAr
                      ? `يتطلب مؤشرا الصعوبة والتمييز ما لا يقل عن ${data.itemAnalysis.minN} استجابة ليكونا موثوقَين. يتم عرض المتوسط والانحراف المعياري ومعدل النقص فقط حالياً.`
                      : `Difficulty & discrimination indices require ≥ ${data.itemAnalysis.minN} responses to be reliable. Showing mean, SD and missing-rate only for now.`}
                  </span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
                      {[isAr ? '#' : '#', isAr ? 'البند' : 'Item', 'N', isAr ? 'المتوسط' : 'Mean', 'SD', isAr ? 'النقص %' : 'Missing %', isAr ? 'الصعوبة' : 'Difficulty', isAr ? 'التمييز' : 'Discrim.'].map((c, i) => (
                        <th key={i} className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${i === 1 ? 'text-left' : 'text-center'}`} style={{ color: 'var(--text-muted)' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.itemAnalysis.items.map((it) => (
                      <tr key={it.itemId} style={{ borderBottom: '1px solid var(--divider)' }}>
                        <td className="px-3 py-2.5 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{it.itemNumber}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-[12.5px] leading-snug" style={{ color: 'var(--text-primary)' }}>
                            {(isAr && it.questionAr ? it.questionAr : it.questionEn) || `Item ${it.itemNumber}`}
                            {it.isSafetyItem && <span className="ms-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEF2F2', color: '#dc2626' }}>{isAr ? 'أمان' : 'SAFETY'}</span>}
                          </p>
                          {it.subscale && <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{it.subscale}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-center text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{it.n}</td>
                        <td className="px-3 py-2.5 text-center text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{it.mean}</td>
                        <td className="px-3 py-2.5 text-center text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{it.stdev}</td>
                        <td className="px-3 py-2.5 text-center text-[12.5px]" style={{ color: it.missingPercent > 10 ? ORANGE : 'var(--text-secondary)' }}>{it.missingPercent}%</td>
                        <td className="px-3 py-2.5 text-center text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{it.difficultyIndex ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{it.discriminationIndex ?? '—'}</td>
                      </tr>
                    ))}
                    {!data.itemAnalysis.items.length && (
                      <tr><td colSpan={8} className="text-center py-10 text-[13px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'لا توجد بنود.' : 'No items defined.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'demographics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <BreakdownChart title={isAr ? 'حسب الجنس' : 'By gender'} data={data.demographics.gender} isAr={isAr} />
              <BreakdownChart title={isAr ? 'حسب الفئة العمرية' : 'By age group'} data={data.demographics.ageGroup} isAr={isAr} />
              <BreakdownChart title={isAr ? 'حسب الدولة' : 'By country'} data={data.demographics.country} isAr={isAr} />
              <BreakdownChart title={isAr ? 'حسب التعليم' : 'By education'} data={data.demographics.education} isAr={isAr} />
            </div>
          )}

          {tab === 'trends' && (
            <div className="grid grid-cols-1 gap-5">
              <div className="card p-4">
                <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isAr ? 'الإكمالات عبر الزمن' : 'Completions over time'}</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.trend} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="completions" name={isAr ? 'الإكمالات' : 'Completions'} stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-4">
                <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isAr ? 'متوسط الدرجة عبر الزمن' : 'Average score over time'}</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.trend} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="avgScore" name={isAr ? 'متوسط الدرجة' : 'Avg score'} stroke={ORANGE} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
