import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { JournalEntry } from '@/lib/types'

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadEntries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => { loadEntries() }, [])

  async function handleSave() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('journal_entries').insert({
      patient_id: user.id,
      title: title.trim(),
      content: content.trim(),
      is_shared: false,
    })
    setTitle(''); setContent(''); setShowNew(false); setSaving(false)
    loadEntries()
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row justify-between items-center px-4 pt-4 mb-4">
        <Text className="text-2xl font-bold text-gray-900">Journal</Text>
        <TouchableOpacity
          onPress={() => setShowNew(true)}
          className="px-4 py-2 rounded-xl"
          style={{ backgroundColor: '#1D6296' }}
        >
          <Text className="text-white font-semibold text-sm">+ New Entry</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#1D6296" /></View>
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-400 text-center">No journal entries yet.</Text>
          <TouchableOpacity onPress={() => setShowNew(true)} className="mt-4 px-4 py-2 rounded-xl" style={{ backgroundColor: '#1D6296' }}>
            <Text className="text-white font-medium">Write your first entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {entries.map(entry => (
            <View key={entry.id} className="bg-white rounded-2xl p-4 border border-gray-200">
              <Text className="font-semibold text-gray-900 mb-1">{entry.title}</Text>
              <Text className="text-gray-500 text-sm leading-relaxed" numberOfLines={3}>{entry.content}</Text>
              <Text className="text-gray-400 text-xs mt-2">{new Date(entry.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* New entry modal */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="font-semibold text-gray-900">New Entry</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#1D6296" /> : <Text style={{ color: '#1D6296', fontWeight: '600' }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View className="flex-1 px-4 pt-4">
            <TextInput
              className="text-xl font-bold text-gray-900 mb-4"
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="text-gray-700 text-base leading-relaxed flex-1"
              placeholder="Write your thoughts..."
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
