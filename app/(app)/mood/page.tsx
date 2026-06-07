'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Plus, CheckCircle2 } from 'lucide-react'
import type { MoodLog } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

const TRIGGERS_EN = ['stress', 'work', 'family', 'health', 'sleep', 'exercise', 'social', 'weather', 'diet']
const TRIGGERS_AR = ['ضغط', 'عمل', 'عائلة', 'صحة', 'نوم', 'رياضة', 'اجتماعي', 'طقس', 'غذاء']

function MoodBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{score}/10</span>
    </div>
  )
}

export default function MoodPage() {
  const supabase = createClient()
  const lang = useLang()
  const [logs, setLogs] = useState<MoodLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    mood_score: 5,
    energy_score: 5,
    anxiety_score: 5,
    sleep_hours: '' as string,
    activity_minutes: '' as string,
    mood_note: '',
    triggers: [] as string[],
  })

  async function loadLogs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('patient_id', user.id)
      .order('log_date', { ascending: false })
      .limit(30)
    setLogs(data as MoodLog[] || [])
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    await supabase.from('mood_logs').upsert({
      patient_id: user.id,
      log_date: today,
      mood_score: form.mood_score,
      energy_score: form.energy_score,
      anxiety_score: form.anxiety_score,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      activity_minutes: form.activity_minutes ? parseInt(form.activity_minutes) : null,
      mood_note: form.mood_note || null,
      triggers: form.triggers,
    }, { onConflict: 'patient_id,log_date' })

    setSaved(true)
    setSaving(false)
    setShowForm(false)
    loadLogs()
    setTimeout(() => setSaved(false), 3000)
  }

  function toggleTrigger(trigger: string) {
    setForm(prev => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter(x => x !== trigger)
        : [...prev.triggers, trigger],
    }))
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayLog = logs.find(l => l.log_date === todayStr)
  const triggers = lang === 'ar' ? TRIGGERS_AR : TRIGGERS_EN

  const scoreItems = [
    { key: 'mood_score', label: t('mood.mood', lang), color: 'text-pink-600', emoji: '😊' },
    { key: 'energy_score', label: t('mood.energy', lang), color: 'text-yellow-600', emoji: '⚡' },
    { key: 'anxiety_score', label: t('mood.anxiety', lang), color: 'text-purple-600', emoji: '😰' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('mood.title', lang)}</h1>
          <p className="text-gray-500 mt-1">{t('mood.subtitle', lang)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          {todayLog ? t('mood.update', lang) : t('mood.log', lang)}
        </button>
      </div>

      {saved && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          {t('mood.logged', lang)}
        </div>
      )}

      {showForm && (
        <div className="card p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('mood.how', lang)}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {scoreItems.map(({ key, label, color, emoji }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {emoji} {label}: <span className={`font-bold ${color}`}>{form[key as keyof typeof form]}/10</span>
                  </label>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={form[key as keyof typeof form] as number}
                    onChange={e => setForm(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span><span>10</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('mood.sleep', lang)}</label>
                <input
                  type="number" min="0" max="24" step="0.5"
                  className="input"
                  value={form.sleep_hours}
                  onChange={e => setForm(prev => ({ ...prev, sleep_hours: e.target.value }))}
                  placeholder={t('mood.sleep.ph', lang)}
                />
              </div>
              <div>
                <label className="label">{t('mood.activity', lang)}</label>
                <input
                  type="number" min="0" max="600"
                  className="input"
                  value={form.activity_minutes}
                  onChange={e => setForm(prev => ({ ...prev, activity_minutes: e.target.value }))}
                  placeholder={t('mood.activity.ph', lang)}
                />
              </div>
            </div>

            <div>
              <label className="label">{t('mood.triggers', lang)}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {triggers.map((trigger, i) => {
                  const enTrigger = TRIGGERS_EN[i]
                  return (
                    <button
                      key={enTrigger} type="button"
                      onClick={() => toggleTrigger(enTrigger)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                        form.triggers.includes(enTrigger)
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {trigger}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="label">{t('mood.notes', lang)}</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.mood_note}
                onChange={e => setForm(prev => ({ ...prev, mood_note: e.target.value }))}
                placeholder={t('mood.notes.ph', lang)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('mood.cancel', lang)}</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? t('mood.saving', lang) : t('mood.save', lang)}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('mood.loading', lang)}</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-700 mb-2">{t('mood.log', lang)}</h3>
          <p className="text-sm text-gray-400">{t('mood.subtitle', lang)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-gray-900">{log.log_date}</p>
                  {log.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {log.triggers.map(trigger => {
                        const idx = TRIGGERS_EN.indexOf(trigger)
                        const displayTrigger = lang === 'ar' && idx >= 0 ? TRIGGERS_AR[idx] : trigger
                        return (
                          <span key={trigger} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full capitalize">{displayTrigger}</span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400">
                  {log.sleep_hours && <p>{t('mood.sleep', lang)}: {log.sleep_hours}h</p>}
                  {log.activity_minutes && <p>{t('mood.activity', lang)}: {log.activity_minutes}min</p>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">😊 {t('mood.mood', lang)}</p>
                    <MoodBar score={log.mood_score} color="bg-pink-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">⚡ {t('mood.energy', lang)}</p>
                    <MoodBar score={log.energy_score} color="bg-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">😰 {t('mood.anxiety', lang)}</p>
                    <MoodBar score={log.anxiety_score} color="bg-purple-400" />
                  </div>
                </div>
              </div>
              {log.mood_note && (
                <p className="mt-3 text-sm text-gray-500 italic border-t border-gray-50 pt-3">{log.mood_note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
