'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronDown, ChevronRight, AlertTriangle, FileText, Loader2, User as UserIcon } from 'lucide-react'
import { getLocalizedBandContent } from '@/lib/assessment-content'
import { ASSESSMENT_CONTENT_AR } from '@/lib/assessment-content-ar'

interface Answer { item_number: number; question_en: string; question_ar: string; response_value: number; response_label_en: string; response_label_ar: string }
interface Submission {
  id: string; code: string; name_en: string; name_ar: string | null
  total_score: number; severity_band: string | null; high_risk_flag: boolean
  is_self_initiated: boolean; submitted_at: string; answers: Answer[]
}
interface Profile {
  id: string; full_name_en: string; full_name_ar: string | null; role: string; is_active: boolean; created_at: string
  gender: string | null; date_of_birth: string | null; marital_status: string | null; educational_status: string | null; country_of_residence: string | null
}

export default function UserAssessmentsClient({ userId, lang }: { userId: string; lang: string }) {
  const isAr = lang === 'ar'
  const [data, setData] = useState<{ profile: Profile; submissions: Submission[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/assessments`, { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setError(res.status === 403 ? (isAr ? 'هذه الصفحة للمشرف الأعلى فقط' : 'Superadmin only') : (isAr ? 'تعذّر تحميل البيانات' : 'Failed to load'))
          return
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError(isAr ? 'تعذّر تحميل البيانات' : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [userId, isAr])

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isAr ? 'ar' : 'en', { year: 'numeric', month: 'short', day: 'numeric' })
  const name = (p: Profile) => (isAr && p.full_name_ar ? p.full_name_ar : p.full_name_en)

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (error) return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/x/control/users" className="inline-flex items-center gap-1 text-[12.5px] mb-4 text-gray-500"><ChevronLeft className="w-3.5 h-3.5" /> {isAr ? 'المستخدمون' : 'Users'}</Link>
      <div className="text-center py-16 text-sm text-red-600">{error}</div>
    </div>
  )
  if (!data) return null

  const { profile, submissions } = data

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <Link href="/x/control/users" className="inline-flex items-center gap-1 text-[12.5px] mb-4 text-gray-500">
        <ChevronLeft className="w-3.5 h-3.5" /> {isAr ? 'المستخدمون' : 'Users'}
      </Link>

      {/* Profile header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-5 h-5 text-brand-700" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{name(profile)}</h1>
            <p className="text-[12px] text-gray-500 capitalize">{profile.role} · {isAr ? 'انضم' : 'joined'} {fmt(profile.created_at)}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px]">
          {[
            [isAr ? 'الجنس' : 'Gender', profile.gender],
            [isAr ? 'الحالة الاجتماعية' : 'Marital', profile.marital_status],
            [isAr ? 'التعليم' : 'Education', profile.educational_status],
            [isAr ? 'الدولة' : 'Country', profile.country_of_residence],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-gray-400">{k}</dt>
              <dd className="text-gray-700 capitalize">{v || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {isAr ? `التقييمات (${submissions.length})` : `Assessments (${submissions.length})`}
      </h2>

      {submissions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          {isAr ? 'لا توجد تقييمات لهذا المستخدم.' : 'This user has no assessments.'}
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(s => {
            const isOpen = !!open[s.id]
            const band = getLocalizedBandContent(s.code, s.severity_band ?? '', lang, ASSESSMENT_CONTENT_AR)
            const displayBand = s.severity_band || (isAr ? 'غير محدد' : 'N/A')
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpen(o => ({ ...o, [s.id]: !o[s.id] }))}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-gray-900 truncate">
                      {isAr && s.name_ar ? s.name_ar : s.name_en} <span className="text-gray-400">({s.code})</span>
                    </p>
                    <p className="text-[11.5px] text-gray-500">
                      {fmt(s.submitted_at)} · {isAr ? 'الدرجة' : 'score'} {s.total_score} · {displayBand}
                      {!s.is_self_initiated && <span className="ml-1">· {isAr ? 'بتكليف' : 'assigned'}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.high_risk_flag && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> {isAr ? 'خطر' : 'High risk'}
                      </span>
                    )}
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    {/* Report / interpretation */}
                    {band?.explanation && (
                      <div>
                        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 mb-1"><FileText className="w-3.5 h-3.5" /> {isAr ? 'التقرير' : 'Report'}</p>
                        <p className="text-[12.5px] text-gray-700 leading-relaxed mb-2">{band.explanation}</p>
                        {band.recommendations?.length > 0 && (
                          <ul className="list-disc list-inside space-y-0.5 text-[12px] text-gray-600">
                            {band.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Answers */}
                    <div>
                      <p className="text-[12px] font-semibold text-gray-600 mb-2">{isAr ? `الإجابات (${s.answers.length})` : `Answers (${s.answers.length})`}</p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[420px] text-[12px]">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-100">
                              <th className="py-1.5 pr-2 font-medium w-8">#</th>
                              <th className="py-1.5 pr-2 font-medium">{isAr ? 'السؤال' : 'Question'}</th>
                              <th className="py-1.5 pr-2 font-medium">{isAr ? 'الإجابة' : 'Answer'}</th>
                              <th className="py-1.5 font-medium text-right w-10">{isAr ? 'القيمة' : 'Val'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.answers.map(a => (
                              <tr key={a.item_number} className="border-b border-gray-50 align-top">
                                <td className="py-1.5 pr-2 text-gray-400">{a.item_number}</td>
                                <td className="py-1.5 pr-2 text-gray-700">{isAr ? a.question_ar : a.question_en}</td>
                                <td className="py-1.5 pr-2 text-gray-900 font-medium">{isAr ? a.response_label_ar : a.response_label_en}</td>
                                <td className="py-1.5 text-gray-500 text-right">{a.response_value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
