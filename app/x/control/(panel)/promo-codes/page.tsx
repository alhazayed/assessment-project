'use client'

import { useEffect, useState, useCallback } from 'react'
import { Ticket, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/use-lang'

interface PromoCode {
  id: string
  code: string
  code_type: 'free_use' | 'discount'
  discount_type: 'percentage' | 'fixed_amount' | 'free' | null
  discount_value: number | null
  description: string | null
  max_uses: number | null
  current_uses: number
  valid_until: string | null
  active: boolean
  created_at: string
}

export default function PromoCodesPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const tr = (en: string, ar: string) => (isAr ? ar : en)

  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgError, setMsgError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [codeType, setCodeType] = useState<'free_use' | 'discount'>('discount')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'free'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [description, setDescription] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [creating, setCreating] = useState(false)

  const flash = (text: string, error = false) => {
    setMsg(text); setMsgError(error)
    setTimeout(() => setMsg(''), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo-codes')
      if (res.ok) {
        const data = await res.json()
        setCodes(data.codes || [])
      } else {
        const data = await res.json().catch(() => ({}))
        flash(data.error || 'Failed to load codes', true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function createCode(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          codeType,
          discountType: codeType === 'discount' ? discountType : undefined,
          discountValue: codeType === 'discount' && discountType !== 'free' ? Number(discountValue) : undefined,
          description: description.trim() || undefined,
          maxUses: maxUses ? Number(maxUses) : undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        flash(tr('Promo code created', 'تم إنشاء الرمز الترويجي'))
        setCode(''); setDiscountValue(''); setDescription(''); setMaxUses(''); setValidUntil('')
        setShowForm(false)
        load()
      } else {
        flash(data.error || 'Failed to create code', true)
      }
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(c: PromoCode) {
    setBusy(c.id)
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, active: !c.active }),
      })
      if (res.ok) load()
      else flash('Failed to update code', true)
    } finally {
      setBusy(null)
    }
  }

  async function deleteCode(c: PromoCode) {
    if (!confirm(tr(`Delete code ${c.code}?`, `حذف الرمز ${c.code}؟`))) return
    setBusy(c.id)
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id }),
      })
      if (res.ok) { flash(tr('Code deleted', 'تم حذف الرمز')); load() }
      else flash('Failed to delete code', true)
    } finally {
      setBusy(null)
    }
  }

  function discountLabel(c: PromoCode): string {
    if (c.code_type === 'free_use') return tr('Free access', 'وصول مجاني')
    if (c.discount_type === 'free') return tr('Free', 'مجاني')
    if (c.discount_type === 'percentage') return `${c.discount_value}%`
    if (c.discount_type === 'fixed_amount') return `$${((c.discount_value || 0) / 100).toFixed(2)}`
    return '—'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {tr('Promo & Free-Use Codes', 'الرموز الترويجية ورموز الاستخدام المجاني')}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {tr('Create and manage discount and free-access codes for packages', 'إنشاء وإدارة رموز الخصم والوصول المجاني للباقات')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{tr('Refresh', 'تحديث')}</button>
          <button onClick={() => setShowForm(v => !v)} className="btn-accent gap-2 text-sm"><Plus className="w-4 h-4" />{tr('New code', 'رمز جديد')}</button>
        </div>
      </div>

      {msg && <div className={`mb-5 ${msgError ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      {/* Create form */}
      {showForm && (
        <form onSubmit={createCode} className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{tr('Code', 'الرمز')} *</label>
            <input className="input w-full uppercase" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SUMMER2026" required />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{tr('Type', 'النوع')} *</label>
            <select className="input w-full" value={codeType} onChange={e => setCodeType(e.target.value as any)}>
              <option value="discount">{tr('Discount', 'خصم')}</option>
              <option value="free_use">{tr('Free use', 'استخدام مجاني')}</option>
            </select>
          </div>
          {codeType === 'discount' && (
            <>
              <div>
                <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{tr('Discount type', 'نوع الخصم')} *</label>
                <select className="input w-full" value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <option value="percentage">{tr('Percentage (%)', 'نسبة مئوية (%)')}</option>
                  <option value="fixed_amount">{tr('Fixed amount (cents)', 'مبلغ ثابت (سنت)')}</option>
                  <option value="free">{tr('Free (100%)', 'مجاني (100%)')}</option>
                </select>
              </div>
              {discountType !== 'free' && (
                <div>
                  <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {discountType === 'percentage' ? tr('Percent off', 'نسبة الخصم') : tr('Amount off (cents)', 'مبلغ الخصم (سنت)')} *
                  </label>
                  <input className="input w-full" type="number" min="1" value={discountValue} onChange={e => setDiscountValue(e.target.value)} required />
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{tr('Max uses', 'الحد الأقصى للاستخدام')}</label>
            <input className="input w-full" type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder={tr('Unlimited', 'غير محدود')} />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{tr('Valid until', 'صالح حتى')}</label>
            <input className="input w-full" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{tr('Description', 'الوصف')}</label>
            <input className="input w-full" value={description} onChange={e => setDescription(e.target.value)} placeholder={tr('Internal note', 'ملاحظة داخلية')} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{tr('Cancel', 'إلغاء')}</button>
            <button type="submit" disabled={creating} className="btn-accent gap-2 disabled:opacity-50">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}{tr('Create code', 'إنشاء الرمز')}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--divider)' }}>
                {[tr('Code', 'الرمز'), tr('Type', 'النوع'), tr('Value', 'القيمة'), tr('Uses', 'الاستخدام'), tr('Valid until', 'صالح حتى'), tr('Status', 'الحالة'), tr('Actions', 'إجراءات')].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-[12px] font-semibold uppercase tracking-wide ${i === 6 ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{tr('Loading…', 'جارٍ التحميل…')}</td></tr>
              ) : codes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{tr('No promo codes yet. Create your first one.', 'لا توجد رموز ترويجية بعد. أنشئ أول رمز.')}</td></tr>
              ) : codes.map(c => (
                <tr key={c.id} className={busy === c.id ? 'opacity-50' : ''} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{c.code}</p>
                    {c.description && <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: 'var(--text-secondary)' }}>{c.code_type === 'free_use' ? tr('Free use', 'مجاني') : tr('Discount', 'خصم')}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{discountLabel(c)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td className="px-4 py-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : tr('No expiry', 'بلا انتهاء')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(c)} className={`flex items-center gap-1.5 text-[12px] font-medium ${c.active ? 'text-green-600' : 'text-gray-400'}`}>
                      {c.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {c.active ? tr('Active', 'نشط') : tr('Inactive', 'غير نشط')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteCode(c)} title={tr('Delete', 'حذف')} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
