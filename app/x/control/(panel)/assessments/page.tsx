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
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.assessments.title', lang)}</h1>
          <p className="text-gray-500 mt-1">{active}/{assessments.length} {t('admin.assessments.active', lang)} · {totalSubs} {t('admin.assessments.total_subs', lang)}</p>
        </div>
        <ClipboardList className="w-6 h-6 text-gray-400" />
      </div>

      {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-700 rounded-lg">{msg}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.assessments.col.assessment', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.assessments.col.code', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.assessments.col.questions', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.assessments.col.submissions', lang)}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('admin.assessments.col.status', lang)}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{t('admin.assessments.col.toggle', lang)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('admin.loading', lang)}</td></tr>
            ) : assessments.map(a => (
              <tr key={a.id} className={`hover:bg-gray-50 ${updating === a.id ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{a.name_en}</p>
                  {a.name_ar && <p className="text-xs text-gray-400 text-right" dir="rtl">{a.name_ar}</p>}
                </td>
                <td className="px-4 py-3"><span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a.code}</span></td>
                <td className="px-4 py-3 text-gray-600">{a.total_questions}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${(a.submission_count / maxSubs) * 100}%` }} />
                    </div>
                    <span className="text-gray-700 font-medium">{a.submission_count}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 w-fit text-xs font-medium ${a.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {a.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {a.is_active ? t('admin.assessments.visible', lang) : t('admin.assessments.hidden', lang)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggle(a.id, a.is_active)} className="text-gray-400 hover:text-brand-600 transition-colors">
                    {a.is_active
                      ? <ToggleRight className="w-7 h-7 text-brand-600" />
                      : <ToggleLeft className="w-7 h-7" />}
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
