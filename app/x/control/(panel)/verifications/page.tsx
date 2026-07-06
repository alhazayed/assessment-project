'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, CheckCircle2, XCircle, PauseCircle, FileText, ExternalLink } from 'lucide-react'
import { useLang } from '@/lib/use-lang'

type Verification = {
  id: string
  clinician_id: string
  full_name: string
  professional_title: string
  license_number: string
  country: string
  specialty: string
  organization: string
  document_urls: string[]
  status: string
  rejection_reason: string | null
  reviewed_at: string | null
  updated_at: string
  profiles: { full_name_en: string | null; role: string; avatar_url: string | null } | null
}

const TABS = [
  { key: 'pending_verification', en: 'Pending', ar: 'قيد المراجعة' },
  { key: 'verified',             en: 'Verified', ar: 'موثّق' },
  { key: 'rejected',             en: 'Rejected', ar: 'مرفوض' },
  { key: 'suspended',            en: 'Suspended', ar: 'معلّق' },
]

const statusBadgeClass = (status: string) => ({
  pending_verification: 'bg-yellow-50 text-yellow-700',
  verified: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-gray-100 text-gray-600',
}[status] || 'bg-gray-100 text-gray-600')

export default function AdminVerificationsPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const [tab, setTab] = useState('pending_verification')
  const [rows, setRows] = useState<Verification[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const load = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/clinician-verifications?status=${encodeURIComponent(status)}`)
      const data = await res.json()
      setRows(data.verifications || [])
      setTotal(data.total || 0)
    } catch {
      setRows([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  async function review(id: string, status: 'verified' | 'rejected' | 'suspended') {
    let rejection_reason: string | undefined
    if (status === 'rejected') {
      const input = window.prompt(isAr ? 'سبب الرفض (اختياري):' : 'Rejection reason (optional):')
      if (input === null) return // admin cancelled
      rejection_reason = input.trim() || undefined
    }
    setActingId(id)
    const res = await fetch('/api/admin/clinician-verifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, rejection_reason }),
    })
    setActingId(null)
    if (res.ok) {
      flash(isAr ? 'تم تحديث الحالة وإشعار الأخصائي' : 'Status updated — clinician notified')
      load(tab)
    } else {
      flash(isAr ? 'فشل تحديث الحالة' : 'Failed to update status')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck className="w-6 h-6" style={{ color: '#1D6296' }} />
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'توثيق الأخصائيين' : 'Clinician Verifications'}
        </h1>
      </div>
      <p className="mb-6 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
        {isAr ? 'مراجعة وثائق الاعتماد المقدمة من الأخصائيين.' : 'Review credentials submitted by clinicians.'}
      </p>

      {msg && <div className="alert-success mb-4 text-[13.5px]">{msg}</div>}

      {/* Status tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(t2 => (
          <button
            key={t2.key}
            onClick={() => setTab(t2.key)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
              tab === t2.key ? 'text-white' : ''
            }`}
            style={tab === t2.key
              ? { backgroundColor: '#1D6296' }
              : { backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
          >
            {isAr ? t2.ar : t2.en}
            {tab === t2.key && !loading ? ` (${total})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-10 text-center text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          {isAr ? 'جارٍ التحميل…' : 'Loading…'}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
            {isAr ? 'لا توجد طلبات في هذه الحالة.' : 'No submissions in this status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(v => (
            <div key={v.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{v.full_name}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(v.status)}`}>
                      {TABS.find(t2 => t2.key === v.status) ? (isAr ? TABS.find(t2 => t2.key === v.status)!.ar : TABS.find(t2 => t2.key === v.status)!.en) : v.status}
                    </span>
                  </div>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {v.professional_title} · {v.specialty} · {v.organization}
                  </p>
                  <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isAr ? 'رقم الترخيص' : 'License'}: <span className="font-mono">{v.license_number}</span>
                    {' · '}{v.country}
                    {' · '}{new Date(v.updated_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  {v.rejection_reason && (
                    <p className="text-[12.5px] mt-1" style={{ color: '#C02A2A' }}>
                      {isAr ? 'سبب الرفض' : 'Rejection reason'}: {v.rejection_reason}
                    </p>
                  )}
                  {v.document_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {v.document_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg hover:opacity-80"
                          style={{ backgroundColor: 'var(--surface-alt)', color: '#1D6296', border: '1px solid var(--divider)' }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {isAr ? `مستند ${i + 1}` : `Document ${i + 1}`}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {v.status !== 'verified' && (
                    <button
                      onClick={() => review(v.id, 'verified')}
                      disabled={actingId === v.id}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                      style={{ backgroundColor: '#1B8A5A' }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isAr ? 'اعتماد' : 'Approve'}
                    </button>
                  )}
                  {v.status !== 'rejected' && (
                    <button
                      onClick={() => review(v.id, 'rejected')}
                      disabled={actingId === v.id}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                      style={{ backgroundColor: '#C02A2A' }}
                    >
                      <XCircle className="w-4 h-4" />
                      {isAr ? 'رفض' : 'Reject'}
                    </button>
                  )}
                  {v.status === 'verified' && (
                    <button
                      onClick={() => review(v.id, 'suspended')}
                      disabled={actingId === v.id}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
                    >
                      <PauseCircle className="w-4 h-4" />
                      {isAr ? 'تعليق' : 'Suspend'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
