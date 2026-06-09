'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Search, AlertTriangle, X, ClipboardList,
  Calendar, ChevronRight, CheckCircle2, Clock, Plus,
} from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import type { Profile } from '@/lib/types'

type Patient = {
  id: string
  full_name_en: string
  full_name_ar: string | null
  created_at: string
  date_of_birth: string | null
  gender: string | null
  submission_count: number
  last_submission_at: string | null
  has_high_risk: boolean
}

type Submission = {
  id: string
  submitted_at: string
  total_score: number
  severity_band: string
  high_risk_flag: boolean
  assessment_definitions: { name_en: string; name_ar: string; code: string } | null
}

type AssessmentDef = { id: string; code: string; name_en: string; name_ar: string | null }

function severityColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low') || b.includes('negative')) return 'text-green-700 bg-green-50 border-green-200'
  if (b.includes('mild') || b.includes('subthreshold')) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  if (b.includes('moderate')) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default function PatientsPage() {
  const supabase = createClient()
  const lang = useLang()
  const isAr = lang === 'ar'

  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<Patient | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [subLoading, setSubLoading] = useState(false)

  const [assessments, setAssessments] = useState<AssessmentDef[]>([])
  const [showAssign, setShowAssign] = useState(false)
  const [assignDefId, setAssignDefId] = useState('')
  const [assignDue, setAssignDue] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignMsg, setAssignMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, defsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('assessment_definitions').select('id, code, name_en, name_ar').eq('is_active', true).order('name_en'),
    ])
    const p = profileRes.data as Profile
    setMyProfile(p)
    setAssessments(defsRes.data || [])

    let q = supabase
      .from('profiles')
      .select('id, full_name_en, full_name_ar, created_at, date_of_birth, gender')
      .eq('role', 'patient')
      .eq('is_active', true)
      .order('full_name_en')

    if (p?.role === 'clinician') q = q.eq('assigned_clinician_id', user.id)

    const { data: pts } = await q
    if (!pts?.length) { setPatients([]); setLoading(false); return }

    const ids = pts.map(pt => pt.id)
    const [subsRes, riskRes] = await Promise.all([
      supabase.from('assessment_submissions')
        .select('patient_id, submitted_at')
        .in('patient_id', ids)
        .order('submitted_at', { ascending: false }),
      supabase.from('assessment_submissions')
        .select('patient_id')
        .in('patient_id', ids)
        .eq('high_risk_flag', true)
        .gte('submitted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    const byId: Record<string, { count: number; last: string }> = {}
    ;(subsRes.data || []).forEach((s: any) => {
      if (!byId[s.patient_id]) byId[s.patient_id] = { count: 0, last: s.submitted_at }
      byId[s.patient_id].count++
    })
    const riskSet = new Set((riskRes.data || []).map((r: any) => r.patient_id))

    setPatients(pts.map(pt => ({
      ...pt,
      submission_count: byId[pt.id]?.count ?? 0,
      last_submission_at: byId[pt.id]?.last ?? null,
      has_high_risk: riskSet.has(pt.id),
    })))
    setLoading(false)
  }

  async function openPatient(p: Patient) {
    setSelected(p)
    setShowAssign(false)
    setAssignMsg('')
    setSubLoading(true)
    const { data } = await supabase
      .from('assessment_submissions')
      .select('id, submitted_at, total_score, severity_band, high_risk_flag, assessment_definitions(name_en, name_ar, code)')
      .eq('patient_id', p.id)
      .order('submitted_at', { ascending: false })
      .limit(20)
    setSubmissions((data as unknown as Submission[]) || [])
    setSubLoading(false)
  }

  async function doAssign() {
    if (!selected || !assignDefId || !myProfile) return
    setAssigning(true)
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: selected.id,
        clinician_id: myProfile.id,
        definition_id: assignDefId,
        due_date: assignDue || null,
        note_en: assignNote || null,
      }),
    })
    setAssigning(false)
    setAssignMsg(t('patients.assign.success', lang))
    setAssignDefId(''); setAssignDue(''); setAssignNote('')
    setShowAssign(false)
    setTimeout(() => setAssignMsg(''), 4000)
    load()
  }

  const filtered = patients.filter(p => {
    const name = (isAr && p.full_name_ar ? p.full_name_ar : p.full_name_en).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const isAdmin = myProfile?.role === 'admin' || myProfile?.role === 'superadmin'
  const title = isAdmin ? t('patients.admin_title', lang) : t('patients.title', lang)

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className={`flex-1 p-8 overflow-y-auto ${selected ? 'hidden md:block' : ''}`}>
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-500 mt-1">{t('patients.subtitle', lang)}</p>
            </div>
            <Users className="w-6 h-6 text-gray-400" />
          </div>

          <div className="relative mb-6">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
            <input
              className={`input w-full max-w-sm ${isAr ? 'pr-9' : 'pl-9'}`}
              placeholder={t('patients.search', lang)}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('patients.col.patient', lang)}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('patients.col.joined', lang)}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('patients.col.count', lang)}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('patients.col.last', lang)}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('patients.col.risk', lang)}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('admin.loading', lang)}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">{t('patients.empty', lang)}</p>
                      <p className="text-xs text-gray-300 mt-1">{t('patients.empty.sub', lang)}</p>
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const name = isAr && p.full_name_ar ? p.full_name_ar : p.full_name_en
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selected?.id === p.id ? 'bg-brand-50' : ''}`}
                      onClick={() => openPatient(p)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-indigo-700">{name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-gray-900">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{p.submission_count}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.last_submission_at
                          ? new Date(p.last_submission_at).toLocaleDateString()
                          : <span className="text-gray-300">{t('patients.no_submissions', lang)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.has_high_risk && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            {t('patients.high_risk', lang)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-300 inline-block" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-full md:w-96 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-indigo-700">
                  {(isAr && selected.full_name_ar ? selected.full_name_ar : selected.full_name_en).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {isAr && selected.full_name_ar ? selected.full_name_ar : selected.full_name_en}
                </p>
                <p className="text-xs text-gray-400">
                  {t('patients.detail.joined', lang)} {new Date(selected.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Assign button / form */}
          <div className="px-6 py-4 border-b border-gray-100">
            {assignMsg && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {assignMsg}
              </div>
            )}
            {!showAssign ? (
              <button
                onClick={() => setShowAssign(true)}
                className="flex items-center gap-2 w-full btn-primary text-sm justify-center"
              >
                <Plus className="w-4 h-4" />
                {t('patients.assign.btn', lang)}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">{t('patients.assign.title', lang)}</p>
                <select
                  className="input w-full"
                  value={assignDefId}
                  onChange={e => setAssignDefId(e.target.value)}
                >
                  <option value="">{t('patients.assign.select', lang)}</option>
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>
                      {isAr && a.name_ar ? a.name_ar : a.name_en}
                    </option>
                  ))}
                </select>
                <div>
                  <label className="label">{t('patients.assign.due', lang)}</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={assignDue}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setAssignDue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t('patients.assign.note', lang)}</label>
                  <textarea
                    className="input w-full resize-none"
                    rows={2}
                    value={assignNote}
                    onChange={e => setAssignNote(e.target.value)}
                    dir={isAr ? 'rtl' : 'ltr'}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={doAssign}
                    disabled={!assignDefId || assigning}
                    className="flex-1 btn-primary text-sm disabled:opacity-50"
                  >
                    {assigning ? t('patients.assign.submitting', lang) : t('patients.assign.submit', lang)}
                  </button>
                  <button
                    onClick={() => { setShowAssign(false); setAssignDefId(''); setAssignDue(''); setAssignNote('') }}
                    className="btn-secondary text-sm"
                  >
                    {t('patients.assign.cancel', lang)}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submission history */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('patients.detail.history', lang)}</p>
            {subLoading ? (
              <p className="text-sm text-gray-400">{t('admin.loading', lang)}</p>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{t('patients.detail.no_history', lang)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map(s => {
                  const def = s.assessment_definitions
                  const aName = isAr && def?.name_ar ? def.name_ar : def?.name_en
                  return (
                    <div key={s.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{aName || def?.code}</p>
                        {s.high_risk_flag && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor(s.severity_band)}`}>
                          {s.severity_band}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.submitted_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
