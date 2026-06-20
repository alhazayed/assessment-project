'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Plus, CheckCircle2, AlertCircle } from 'lucide-react'
import type { MoodLog } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

const TRIGGERS_EN = ['stress', 'work', 'family', 'health', 'sleep', 'exercise', 'social', 'weather', 'diet']
const TRIGGERS_AR = ['ضغط', 'عمل', 'عائلة', 'صحة', 'نوم', 'رياضة', 'اجتماعي', 'طقس', 'غذاء']

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 progress-track">
        <div className="progress-fill" style={{ width: `${score * 10}%`, background: color }} />
      </div>
      <span className="text-[12px] font-semibold w-10 text-end flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
        {score}/10
      </span>
    </div>
  )
}

export default function MoodContent() {
  const supabase = createClient()
  const lang = useLang()
  const [logs, setLogs]         = useState<MoodLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({
    mood_score:        5,
    energy_score:      5,
    anxiety_score:     5,
    sleep_hours:       '' as string,
    activity_minutes:  '' as string,
    mood_note:         '',
    triggers:          [] as string[],
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
    setSaveError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }

      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('mood_logs').upsert({
        patient_id:       user.id,
        log_date:         today,
        mood_score:       form.mood_score,
        energy_score:     form.energy_score,
        anxiety_score:    form.anxiety_score,
        sleep_hours:      form.sleep_hours ? parseFloat(form.sleep_hours) : null,
        activity_minutes: form.activity_minutes ? parseInt(form.activity_minutes) : null,
        mood_note:        form.mood_note || null,
        triggers:         form.triggers,
      }, { onConflict: 'patient_id,log_date' })

      if (error) throw error

      setSaved(true)
      setSaving(false)
      setShowForm(false)
      loadLogs()
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError(lang === 'ar' ? 'تعذّر حفظ السجل. يرجى المحاولة مرة أخرى.' : 'Failed to save. Please try again.')
      setSaving(false)
    }
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
    { key: 'mood_score',    label: t('mood.mood', lang),    color: '#E879A0', emoji: '😊' },
    { key: 'energy_score',  label: t('mood.energy', lang),  color: '#F59E0B', emoji: '⚡' },
    { key: 'anxiety_score', label: t('mood.anxiety', lang), color: '#A78BFA', emoji: '😰' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('mood.title', lang)}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('mood.subtitle', lang)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-accent gap-2">
          <Plus className="w-4 h-4" />
          {todayLog ? t('mood.update', lang) : t('mood.log', lang)}
        </button>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="alert-success mb-6 flex items-center gap-2 text-[13.5px]" style={{ color: '#1B8A5A' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {t('mood.logged', lang)}
        </div>
      )}

      {/* Error toast */}
      {saveError && (
        <div className="alert-error mb-6 flex items-center gap-2 text-[13.5px]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="card p-6 mb-7">
          <h2 className="text-[15px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{t('mood.how', lang)}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {scoreItems.map(({ key, label, color, emoji }) => (
                <div key={key}>
                  <label className="label flex items-center gap-1.5 mb-2">
                    <span>{emoji}</span>
                    <span>{label}</span>
                    <span className="ms-auto font-bold" style={{ color }}>{form[key as keyof typeof form]}/10</span>
                  </label>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={form[key as keyof typeof form] as number}
                    onChange={e => setForm(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: color }}
                  />
                  <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>1</span><span>10</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  const active = form.triggers.includes(enTrigger)
                  return (
                    <button
                      key={enTrigger}
                      type="button"
                      onClick={() => toggleTrigger(enTrigger)}
                      className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold capitalize transition-colors"
                      style={active
                        ? { background: '#1D6296', color: '#fff' }
                        : { background: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                      }
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
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                {t('mood.cancel', lang)}
              </button>
              <button type="submit" disabled={saving} className="btn-accent">
                {saving ? t('mood.saving', lang) : t('mood.save', lang)}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log list */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-[16px]" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-4" style={{ background: '#FDE8E8' }}>
            <Heart className="w-7 h-7" style={{ color: '#C02A2A' }} />
          </div>
          <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('mood.log', lang)}</h3>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('mood.subtitle', lang)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{log.log_date}</p>
                  {log.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {log.triggers.map(trigger => {
                        const idx = TRIGGERS_EN.indexOf(trigger)
                        const displayTrigger = lang === 'ar' && idx >= 0 ? TRIGGERS_AR[idx] : trigger
                        return (
                          <span key={trigger} className="px-2 py-0.5 rounded-full text-[11.5px] font-medium capitalize" style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {displayTrigger}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="text-end text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {log.sleep_hours && <p>{t('mood.sleep', lang)}: {log.sleep_hours}h</p>}
                  {log.activity_minutes && <p>{t('mood.activity', lang)}: {log.activity_minutes}min</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[12px] mb-1.5" style={{ color: 'var(--text-muted)' }}>😊 {t('mood.mood', lang)}</p>
                  <ScoreBar score={log.mood_score} color="#E879A0" />
                </div>
                <div>
                  <p className="text-[12px] mb-1.5" style={{ color: 'var(--text-muted)' }}>⚡ {t('mood.energy', lang)}</p>
                  <ScoreBar score={log.energy_score} color="#F59E0B" />
                </div>
                <div>
                  <p className="text-[12px] mb-1.5" style={{ color: 'var(--text-muted)' }}>😰 {t('mood.anxiety', lang)}</p>
                  <ScoreBar score={log.anxiety_score} color="#A78BFA" />
                </div>
              </div>
              {log.mood_note && (
                <p className="mt-3 text-[13px] italic pt-3" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--divider)' }}>
                  {log.mood_note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
