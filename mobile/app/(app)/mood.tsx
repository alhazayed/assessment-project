import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { MoodLog } from '@/lib/types'

const MOOD_LABELS = ['Very Bad', 'Bad', 'Okay', 'Good', 'Great']
const MOOD_EMOJIS = ['😞', '😔', '😐', '🙂', '😊']

export default function MoodScreen() {
  const [mood, setMood] = useState(3)
  const [anxiety, setAnxiety] = useState(3)
  const [notes, setNotes] = useState('')
  const [logs, setLogs] = useState<MoodLog[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('patient_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(7)
      setLogs(data || [])
      setLoading(false)
    })()
  }, [saved])

  async function handleLog() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('mood_logs').insert({
      patient_id: user.id,
      mood_score: mood,
      anxiety_score: anxiety,
      notes: notes.trim() || null,
    })
    setNotes('')
    setSaving(false)
    setSaved(s => !s)
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-6">Mood Tracker</Text>

        {/* Log card */}
        <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-4">How are you feeling?</Text>

          <Text className="text-sm text-gray-500 mb-2">Mood</Text>
          <View className="flex-row justify-between mb-4">
            {[1,2,3,4,5].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setMood(v)}
                className="items-center"
              >
                <Text style={{ fontSize: 28, opacity: mood === v ? 1 : 0.4 }}>{MOOD_EMOJIS[v-1]}</Text>
                <Text style={{ fontSize: 10, color: mood === v ? '#1D6296' : '#9CA3AF', marginTop: 2 }}>{MOOD_LABELS[v-1]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm text-gray-500 mb-2">Anxiety level (1–5)</Text>
          <View className="flex-row gap-2 mb-4">
            {[1,2,3,4,5].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setAnxiety(v)}
                className="flex-1 py-2 rounded-lg items-center"
                style={{ backgroundColor: anxiety === v ? '#1D6296' : '#F3F4F6' }}
              >
                <Text style={{ color: anxiety === v ? 'white' : '#374151', fontWeight: '600' }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm text-gray-500 mb-2">Notes (optional)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm mb-4"
            placeholder="How are you doing today?"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />

          <TouchableOpacity
            onPress={handleLog}
            disabled={saving}
            className="w-full py-3.5 rounded-xl items-center"
            style={{ backgroundColor: '#F3650A' }}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Log Mood</Text>}
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text className="font-bold text-gray-900 mb-3">Recent Entries</Text>
        {loading ? <ActivityIndicator color="#1D6296" /> : logs.length === 0 ? (
          <Text className="text-gray-400 text-center py-4">No mood logs yet</Text>
        ) : (
          <View className="gap-3">
            {logs.map(log => (
              <View key={log.id} className="bg-white rounded-2xl p-4 border border-gray-200 flex-row items-center gap-3">
                <Text style={{ fontSize: 28 }}>{MOOD_EMOJIS[log.mood_score - 1]}</Text>
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">{MOOD_LABELS[log.mood_score - 1]}</Text>
                  {log.notes && <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>{log.notes}</Text>}
                  <Text className="text-gray-400 text-xs mt-1">{new Date(log.logged_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
