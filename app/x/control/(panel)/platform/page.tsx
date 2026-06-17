'use client'

import { useEffect, useState } from 'react'
import { Settings, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type Flag = { id: string; flag_key: string; display_name: string; description: string; is_enabled: boolean; applies_to: string[] }
type Setting = { key: string; value: string; updated_at: string }

export default function AdminPlatformPage() {
  const lang = useLang()
  const [flags, setFlags] = useState<Flag[]>([])
  const [settings, setSettings] = useState<Setting[]>([])
  const [settingEdits, setSettingEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const [fr, sr] = await Promise.all([fetch('/api/admin/flags'), fetch('/api/admin/settings')])
    const fd = await fr.json(); const sd = await sr.json()
    setFlags(fd.flags || [])
    setSettings(sd.settings || [])
    const edits: Record<string, string> = {}
    ;(sd.settings || []).forEach((s: Setting) => { edits[s.key] = s.value })
    setSettingEdits(edits)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function toggleFlag(id: string, current: boolean) {
    await fetch('/api/admin/flags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_enabled: !current }) })
    flash(t(!current ? 'admin.platform.feature_enabled' : 'admin.platform.feature_disabled', lang))
    load()
  }

  async function saveSetting(key: string) {
    await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: settingEdits[key] }) })
    flash(t('admin.platform.setting_saved', lang))
    load()
  }

  return (
    <div className="p-7 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('admin.platform.title', lang)}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('admin.platform.subtitle', lang)}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
          <Settings className="w-5 h-5 text-brand-600" />
        </div>
      </div>

      {msg && <div className="mb-5 alert-success">{msg}</div>}

      {/* Feature Flags */}
      <div className="card p-6 mb-6">
        <h2 className="text-[14.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('admin.platform.flags', lang)}</h2>
        {loading ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.loading', lang)}</p>
        ) : flags.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.platform.no_flags', lang)}</p>
        ) : (
          <div>
            {flags.map((f, i) => (
              <div key={f.id} className="flex items-center justify-between py-4"
                style={i < flags.length - 1 ? { borderBottom: '1px solid var(--divider)' } : undefined}>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.display_name}</p>
                    <code className="text-[11px] font-mono px-1.5 py-0.5 rounded-[4px]"
                      style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-muted)' }}>{f.flag_key}</code>
                  </div>
                  <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
                  {f.applies_to?.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {f.applies_to.map((r: string) => (
                        <span key={r} className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => toggleFlag(f.id, f.is_enabled)} className="flex-shrink-0">
                  {f.is_enabled
                    ? <ToggleRight className="w-8 h-8" style={{ color: 'var(--vw-blue)' }} />
                    : <ToggleLeft className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Settings */}
      <div className="card p-6">
        <h2 className="text-[14.5px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('admin.platform.config', lang)}</h2>
        {loading ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.loading', lang)}</p>
        ) : settings.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('admin.platform.no_settings', lang)}</p>
        ) : (
          <div className="space-y-4">
            {settings.map(s => (
              <div key={s.key}>
                <label className="block mb-1.5">
                  <code className="text-[11.5px] font-mono px-1.5 py-0.5 rounded-[4px] mr-2"
                    style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{s.key}</code>
                  <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{t('admin.platform.updated', lang)} {new Date(s.updated_at).toLocaleDateString()}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={settingEdits[s.key] ?? s.value}
                    onChange={e => setSettingEdits(p => ({ ...p, [s.key]: e.target.value }))}
                  />
                  <button onClick={() => saveSetting(s.key)} className="btn-accent flex items-center gap-1.5 text-sm">
                    <Save className="w-3.5 h-3.5" />
                    {t('admin.platform.save', lang)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
