'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'

type Announcement = {
  id: string; title_en: string; title_ar: string; body_en: string; body_ar: string
  type: string; target_roles: string[]; is_active: boolean; is_dismissible: boolean
  starts_at: string | null; ends_at: string | null; created_at: string
}

const ROLES = ['patient', 'clinician', 'admin', 'superadmin']
const TYPES = ['info', 'warning', 'success', 'error']

const defaultForm = { title_en: '', title_ar: '', body_en: '', body_ar: '', type: 'info', target_roles: [] as string[], is_dismissible: true, starts_at: '', ends_at: '' }

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/announcements')
    const data = await res.json()
    setAnnouncements(data.announcements || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    flash('Announcement created')
    setShowForm(false); setForm(defaultForm); load()
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/announcements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    flash(`Announcement ${!current ? 'activated' : 'deactivated'}`)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement?')) return
    await fetch('/api/admin/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    flash('Deleted')
    load()
  }

  function toggleRole(role: string) {
    setForm(p => ({ ...p, target_roles: p.target_roles.includes(role) ? p.target_roles.filter(r => r !== role) : [...p.target_roles, role] }))
  }

  const typeBadge = (type: string) => ({ info: 'bg-blue-50 text-blue-700', warning: 'bg-yellow-50 text-yellow-700', success: 'bg-green-50 text-green-700', error: 'bg-red-50 text-red-700' }[type] || 'bg-gray-100 text-gray-600')

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-1">Platform-wide messages shown to users</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />New Announcement
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-700 rounded-lg">{msg}</div>}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">New Announcement</h2>
            <button onClick={() => { setShowForm(false); setForm(defaultForm) }}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Title (EN)</label>
                <input className="input" required value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} />
              </div>
              <div>
                <label className="label">Title (AR)</label>
                <input className="input" dir="rtl" value={form.title_ar} onChange={e => setForm(p => ({ ...p, title_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Body (EN)</label>
                <textarea className="input resize-none" rows={3} value={form.body_en} onChange={e => setForm(p => ({ ...p, body_en: e.target.value }))} />
              </div>
              <div>
                <label className="label">Body (AR)</label>
                <textarea className="input resize-none" rows={3} dir="rtl" value={form.body_ar} onChange={e => setForm(p => ({ ...p, body_ar: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Starts at</label>
                <input type="datetime-local" className="input" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div>
                <label className="label">Ends at</label>
                <input type="datetime-local" className="input" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Target Roles (leave empty = all)</label>
              <div className="flex gap-2 mt-1">
                {ROLES.map(r => (
                  <button key={r} type="button" onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${form.target_roles.includes(r) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dismissible" checked={form.is_dismissible} onChange={e => setForm(p => ({ ...p, is_dismissible: e.target.checked }))} className="rounded text-indigo-600" />
              <label htmlFor="dismissible" className="text-sm text-gray-700">Dismissible by users</label>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm) }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <p className="text-sm text-gray-400">Loading…</p>
          : announcements.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No announcements yet</p>
            </div>
          ) : announcements.map(a => (
            <div key={a.id} className={`bg-white border rounded-xl p-5 ${a.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeBadge(a.type)}`}>{a.type}</span>
                    {a.target_roles?.map(r => <span key={r} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize">{r}</span>)}
                    {!a.is_active && <span className="text-xs text-gray-400">Inactive</span>}
                  </div>
                  <p className="font-semibold text-gray-900">{a.title_en}</p>
                  {a.title_ar && <p className="text-sm text-gray-400 text-right" dir="rtl">{a.title_ar}</p>}
                  <p className="text-sm text-gray-600 mt-1">{a.body_en}</p>
                  <p className="text-xs text-gray-400 mt-2">Created {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(a.id, a.is_active)}>
                    {a.is_active ? <ToggleRight className="w-7 h-7 text-indigo-600" /> : <ToggleLeft className="w-7 h-7 text-gray-300" />}
                  </button>
                  <button onClick={() => remove(a.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
