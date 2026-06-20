import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/lib/types'

export default function MessagesScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50)
      setMessages(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 mb-4">
        <Text className="text-2xl font-bold text-gray-900">Messages</Text>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#1D6296" /></View>
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">No messages yet</Text>
          <Text className="text-gray-400 text-sm mt-1">Messages from your care team will appear here</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {messages.map(msg => {
            const isMine = msg.sender_id === userId
            return (
              <View key={msg.id} className={`max-w-xs rounded-2xl px-4 py-3 ${isMine ? 'self-end' : 'self-start'}`}
                style={{ backgroundColor: isMine ? '#1D6296' : 'white', borderWidth: isMine ? 0 : 1, borderColor: '#E5E7EB' }}
              >
                <Text style={{ color: isMine ? 'white' : '#374151', fontSize: 14 }}>{msg.body}</Text>
                <Text style={{ color: isMine ? '#93C5FD' : '#9CA3AF', fontSize: 10, marginTop: 4 }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
