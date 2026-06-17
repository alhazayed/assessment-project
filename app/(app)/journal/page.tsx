'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Plus, Save, X } from 'lucide-react'
import type { JournalEntry } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

export default function JournalPage() {
  const supabase = createClient()
  const lang = useLang()
  const [entries, setEntries]       = useState<JournalEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [newEntry, setNewEntry]     = useState('')
  const [isShared, setIsShared]     = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadEntries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
    setEntries(data as JournalEntry[] || [])
    setLoading(false)
  }

  useEffect(() => { loadEntries() }, [])

  async function handleSave() {
    if (!newEntry.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const wordCount = newEntry.trim().split(/\s+/).length
    await supabase.from('journal_entries').insert({
      patient_id: user.id,
      body: newEntry.trim(),
      is_shared: isShared,
      shared_at: isShared ? new Date().toISOString() : null,
      word_count: wordCount,
    })

    setNewEntry('')
    setIsShared(false)
    setShowEditor(false)
    setSaving(false)
    loadEntries()
  }

  return (
    <div className="p-7 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('journal.title', lang)}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('journal.subtitle', lang)}</p>
        </div>
        <button onClick={() => setShowEditor(true)} className="btn-accent gap-2">
          <Plus className="w-4 h-4" />
          {t('journal.new', lang)}
        </button>
      </div>

      {/* Editor */}
      {showEditor && (
        <div className="card p-6 mb-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('journal.new.title', lang)}</h2>
            <button
              onClick={() => setShowEditor(false)}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--surface-alt)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            className="input resize-none mb-4"
            rows={8}
            value={newEntry}
            onChange={e => setNewEntry(e.target.value)}
            placeholder={t('journal.placeholder', lang)}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={e => setIsShared(e.target.checked)}
                className="rounded"
                style={{ accentColor: '#1D6296' }}
              />
              <span className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('journal.share', lang)}</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {newEntry.trim() ? newEntry.trim().split(/\s+/).length : 0} {t('journal.words', lang)}
              </span>
              <button
                onClick={handleSave}
                disabled={!newEntry.trim() || saving}
                className="btn-accent gap-2 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                {saving ? t('journal.saving', lang) : t('journal.save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-[16px]" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF2EC' }}>
            <BookOpen className="w-7 h-7" style={{ color: '#F3650A' }} />
          </div>
          <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('journal.empty.title', lang)}</h3>
          <p className="text-[13.5px] mb-5" style={{ color: 'var(--text-secondary)' }}>{t('journal.empty.sub', lang)}</p>
          <button onClick={() => setShowEditor(true)} className="btn-accent gap-2">
            <Plus className="w-4 h-4" />
            {t('journal.empty.cta', lang)}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const isExpanded = expandedId === entry.id
            const preview = entry.body.slice(0, 200)
            const needsTruncation = entry.body.length > 200

            return (
              <div
                key={entry.id}
                className="card-hover p-5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {new Date(entry.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                    {entry.is_shared && (
                      <span className="badge-info">{t('journal.shared', lang)}</span>
                    )}
                  </div>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {entry.word_count || 0} {t('journal.words', lang)}
                  </span>
                </div>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {isExpanded ? entry.body : preview}
                  {!isExpanded && needsTruncation && (
                    <span className="ms-1 font-semibold" style={{ color: '#1D6296' }}>...</span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
