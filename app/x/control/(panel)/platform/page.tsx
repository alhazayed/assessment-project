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
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.platform.title', lang)}</h1>
          <p className="text-gray-500 mt-1">{t('admin.platform.subtitle', lang)}</p>
        </div>
        <Settings className="w-6 h-6 text-gray-400" />
      </div>

      {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-700 rounded-lg">{msg}</div>}

      {/* Feature Flags */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('admin.platform.flags', lang)}</h2>
        {loading ? (
          <p className="text-sm text-gray-400">{t('admin.loading', lang)}</p>
        ) : flags.length === 0 ? (
          <p className="text-sm text-gray-400">{t('admin.platform.no_flags', lang)}</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {flags.map(f => (
              <div key={f.id} className="flex items-center justify-between py-4">
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{f.display_name}</p>
                    <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f.flag_key}</code>
                  </div>
                  <p className="text-xs text-gray-500">{f.description}</p>
                  {f.applies_to?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {f.applies_to.map((r: string) => (
                        <span key={r} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => toggleFlag(f.id, f.is_enabled)} className="flex-shrink-0">
                  {f.is_enabled
                    ? <ToggleRight className="w-8 h-8 text-indigo-600" />
                    : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('admin.platform.config', lang)}</h2>
        {loading ? (
          <p className="text-sm text-gray-400">{t('admin.loading', lang)}</p>
        ) : settings.length === 0 ? (
          <p className="text-sm text-gray-400">{t('admin.platform.no_settings', lang)}</p>
        ) : (
          <div className="space-y-4">
            {settings.map(s => (
              <div key={s.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-2">{s.key}</code>
                  <span className="text-gray-400 text-xs">{t('admin.platform.updated', lang)} {new Date(s.updated_at).toLocaleDateString()}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={settingEdits[s.key] ?? s.value}
                    onChange={e => setSettingEdits(p => ({ ...p, [s.key]: e.target.value }))}
                  />
                  <button onClick={() => saveSetting(s.key)}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
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
