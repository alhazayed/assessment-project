'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, AlertTriangle, Users, Repeat, ClipboardList, RefreshCw } from 'lucide-react'
import { useLang } from '@/lib/use-lang'

type Priority = 'critical' | 'high' | 'moderate'

type Alert = {
  submissionId: string
  patientId: string
  patientName: string
  assessmentCode: string
  assessmentName: string
  score: number
  severityBand: string
  submittedAt: string
  repeatCount: number
  priority: Priority
  recommendedAction: string
}

type RiskData = {
  alerts: Alert[]
  summary: {
    totalAlerts: number
    patientsAtRisk: number
    repeatRiskPatients: number
    topAssessment: string | null
  }
}

const PRIORITY_STYLE: Record<Priority, { bg: string; fg: string; label: string; labelAr: string }> = {
  critical: { bg: '#FEF2F2', fg: '#dc2626', label: 'Critical', labelAr: 'حرجة' },
  high:     { bg: '#FFF7ED', fg: '#ea580c', label: 'High',     labelAr: 'عالية' },
  moderate: { bg: '#FEFCE8', fg: '#ca8a04', label: 'Moderate', labelAr: 'متوسطة' },
}

export default function ClinicalRiskPage() {
  const lang = useLang()
  const isAr = lang === 'ar'

  const [data, setData] = useState<RiskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/dashboard/risk?limit=100', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const s = data?.summary
  const cards = [
    { label: isAr ? 'إجمالي التنبيهات' : 'Total Alerts', value: s?.totalAlerts ?? 0, icon: AlertTriangle, color: '#dc2626' },
    { label: isAr ? 'مرضى معرضون للخطر' : 'Patients at Risk', value: s?.patientsAtRisk ?? 0, icon: Users, color: '#1D6296' },
    { label: isAr ? 'مخاطر متكررة' : 'Repeat-Risk Patients', value: s?.repeatRiskPatients ?? 0, icon: Repeat, color: '#ea580c' },
    { label: isAr ? 'التقييم الأكثر شيوعاً' : 'Top Assessment', value: s?.topAssessment ?? '—', icon: ClipboardList, color: '#0891b2' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-[1400px]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" style={{ color: '#dc2626' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {isAr ? 'لوحة المخاطر السريرية' : 'Clinical Risk Dashboard'}
            </h1>
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isAr
              ? 'تنبيهات التقييمات عالية الخطورة، مرتبة حسب الأولوية'
              : 'High-risk assessment alerts, prioritised for clinical follow-up'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="card p-4 mb-5 flex items-center gap-2.5" style={{ borderLeft: '3px solid #ef4444' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'تعذّر تحميل بيانات المخاطر: ' : 'Could not load risk data: '}{error}
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${color}15` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {loading ? '…' : value}
            </p>
            <p className="text-[11.5px] mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'تنبيهات المخاطر' : 'Risk Alerts'}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {isAr ? 'جارٍ التحميل…' : 'Loading…'}
          </div>
        ) : !data?.alerts.length ? (
          <div className="p-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {isAr ? 'لا توجد تنبيهات مخاطر عالية حالياً.' : 'No high-risk alerts at this time.'}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
            {data.alerts.map(a => {
              const ps = PRIORITY_STYLE[a.priority]
              return (
                <div key={a.submissionId} className="px-5 py-4 flex items-start gap-4" style={{ borderColor: 'var(--divider)' }}>
                  {/* Priority badge */}
                  <span
                    className="flex-shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-full mt-0.5"
                    style={{ backgroundColor: ps.bg, color: ps.fg }}
                  >
                    {isAr ? ps.labelAr : ps.label}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {a.patientName}
                        {a.repeatCount > 1 && (
                          <span className="ms-2 text-[11px] font-medium" style={{ color: '#ea580c' }}>
                            ×{a.repeatCount} {isAr ? 'تنبيهات' : 'flags'}
                          </span>
                        )}
                      </p>
                      <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(a.submittedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-medium">{a.assessmentCode}</span> · {a.assessmentName} ·{' '}
                      {isAr ? 'الدرجة' : 'score'} <b>{a.score}</b> · {a.severityBand}
                    </p>

                    <p className="text-[12px] mt-1.5 flex items-center gap-1.5" style={{ color: ps.fg }}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {a.recommendedAction}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PHI notice */}
      <div className="mt-5 rounded-xl p-4 text-[12px]" style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>
        <p className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
          🔒 {isAr ? 'بيانات سريرية حساسة' : 'Sensitive clinical data'}
        </p>
        <p>
          {isAr
            ? 'تحتوي هذه الصفحة على معلومات صحية محمية (PHI). الوصول مقصور على المسؤولين المصرّح لهم.'
            : 'This page contains Protected Health Information (PHI). Access is restricted to authorised administrators. Prioritisation is rule-based on repeat high-risk flags — not a clinical diagnosis.'}
        </p>
      </div>
    </div>
  )
}
