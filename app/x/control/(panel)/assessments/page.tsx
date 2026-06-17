'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, ToggleLeft, ToggleRight, CheckCircle, XCircle } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type Assessment = { id: string; code: string; name_en: string; name_ar: string; total_questions: number; is_active: boolean; submission_count: number }

export default function AdminAssessmentsPage() {
  const lang = useLang()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/assessments')
    const data = await res.json()
    setAssessments(data.assessments || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggle(id: string, current: boolean) {
    setUpdating(id)
    await fetch('/api/admin/assessments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    setMsg(t(!current ? 'admin.assessments.enabled' : 'admin.assessments.disabled', lang))
    setTimeout(() => setMsg(''), 3000)
    load()
    setUpdating(null)
  }

  const active = assessments.filter(a => a.is_active).length
  const totalSubs = assessments.reduce((s, a) => s + a.submission_count, 0)
  const maxSubs = Math.max(...assessments.map(a => a.submission_count), 1)

  return (
    <div className="p-7 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.assessments.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {active}/{assessments.length} {t('admin.assessments.active', lang)} · {totalSubs} {t('admin.assessments.total_subs', lang)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
          <ClipboardList className="w-5 h-5 text-brand-600" />
        </div>
      </div>

      {msg && <div className="mb-5 alert-success">{msg}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.assessments.col.assessment', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.assessments.col.code', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.assessments.col.questions', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.assessments.col.submissions', lang)}</th>
              <th className="text-left px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.assessments.col.status', lang)}</th>
              <th className="text-right px-4 py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('admin.assessments.col.toggle', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.loading', lang)}</td></tr>
            ) : assessments.map(a => (
              <tr key={a.id} className={updating === a.id ? 'opacity-50' : ''} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td className="px-4 py-3">
                  <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{a.name_en}</p>
                  {a.name_ar && <p className="text-[11.5px] text-right" dir="rtl" style={{ color: 'var(--text-muted)' }}>{a.name_ar}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11.5px] font-mono px-2 py-0.5 rounded-[4px]"
                    style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{a.code}</span>
                </td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{a.total_questions}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 progress-track">
                      <div className="progress-fill" style={{ width: `${(a.submission_count / maxSubs) * 100}%`, backgroundColor: 'var(--vw-blue)' }} />
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{a.submission_count}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 w-fit text-[12px] font-medium ${a.is_active ? 'text-green-600' : ''}`}
                    style={!a.is_active ? { color: 'var(--text-muted)' } : undefined}>
                    {a.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {a.is_active ? t('admin.assessments.visible', lang) : t('admin.assessments.hidden', lang)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggle(a.id, a.is_active)} className="transition-colors hover:opacity-70">
                    {a.is_active
                      ? <ToggleRight className="w-7 h-7" style={{ color: 'var(--vw-blue)' }} />
                      : <ToggleLeft className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
