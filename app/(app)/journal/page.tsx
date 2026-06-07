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
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newEntry, setNewEntry] = useState('')
  const [isShared, setIsShared] = useState(false)
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
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('journal.title', lang)}</h1>
          <p className="text-gray-500 mt-1">{t('journal.subtitle', lang)}</p>
        </div>
        <button onClick={() => setShowEditor(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          {t('journal.new', lang)}
        </button>
      </div>

      {showEditor && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t('journal.new.title', lang)}</h2>
            <button onClick={() => setShowEditor(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
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
                className="rounded text-brand-600"
              />
              <span className="text-sm text-gray-600">{t('journal.share', lang)}</span>
            </label>
            <div className="flex gap-3">
              <span className="text-xs text-gray-400 self-center">
                {newEntry.trim() ? newEntry.trim().split(/\s+/).length : 0} {t('journal.words', lang)}
              </span>
              <button
                onClick={handleSave}
                disabled={!newEntry.trim() || saving}
                className="btn-primary gap-2 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                {saving ? t('journal.saving', lang) : t('journal.save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('journal.loading', lang)}</div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-700 mb-2">{t('journal.empty.title', lang)}</h3>
          <p className="text-sm text-gray-400 mb-4">{t('journal.empty.sub', lang)}</p>
          <button onClick={() => setShowEditor(true)} className="btn-primary gap-2">
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
                className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(entry.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </span>
                    {entry.is_shared && (
                      <span className="badge-minimal bg-blue-50 text-blue-600 border border-blue-200">
                        {t('journal.shared', lang)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{entry.word_count || 0} {t('journal.words', lang)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {isExpanded ? entry.body : preview}
                  {!isExpanded && needsTruncation && (
                    <span className="text-brand-600 ml-1">...</span>
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
