import { useEffect, useState, useRef } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { useAppLocale } from '@/lib/LocaleContext'
import { useIsRTL } from '@/lib/hooks'
import type { Message } from '@/lib/types'

export default function MessagesScreen() {
  const { profile } = useAuth()
  const { lang } = useAppLocale()
  const isRTL = useIsRTL(lang)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [clinicianId, setClinicianId] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      // Get assigned clinician
      const cid = profile?.assigned_clinician_id ?? null
      setClinicianId(cid)

      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages(data || [])
      setLoading(false)

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100)
    })()
  }, [profile])

  // Real-time subscription
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function handleSend() {
    const text = input.trim()
    if (!text || !userId) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({
      sender_id: userId,
      recipient_id: clinicianId ?? userId, // fallback to self if no clinician
      body: text,
      is_read: false,
    })
    // Refresh
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
    setSending(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  const placeholder = lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'
  const noMessages = lang === 'ar'
    ? 'لا توجد رسائل بعد\nستظهر هنا رسائل فريق الرعاية'
    : 'No messages yet\nMessages from your care team will appear here'

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}
        >
          <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#1D6296' }}>
            <Ionicons name="medical" size={18} color="white" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 dark:text-white" style={isRTL ? { textAlign: 'right' } : undefined}>
              {lang === 'ar' ? 'فريق الرعاية' : 'Care Team'}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400" style={isRTL ? { textAlign: 'right' } : undefined}>
              {lang === 'ar' ? 'معالج نفسي' : 'Your therapist'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1D6296" />
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-4">
              <Ionicons name="chatbubbles-outline" size={32} color="#1D6296" />
            </View>
            <Text className="text-gray-500 dark:text-gray-400 text-center leading-relaxed">{noMessages}</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map(msg => {
              const isMine = msg.sender_id === userId
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    isMine ? styles.myBubble : styles.theirBubble,
                    isRTL && isMine ? { alignSelf: 'flex-start' } : {},
                    isRTL && !isMine ? { alignSelf: 'flex-end' } : {},
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: isMine ? 'white' : '#374151' }]}
                    textBreakStrategy="highQuality">
                    {msg.body}
                  </Text>
                  <Text style={[styles.timeText, { color: isMine ? '#BFDBFE' : '#9CA3AF' }]}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )
            })}
          </ScrollView>
        )}

        {/* Input */}
        <View
          className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}
        >
          <TextInput
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2.5 text-gray-900 dark:text-white text-sm"
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            style={{ maxHeight: 120, textAlign: isRTL ? 'right' : 'left' }}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
            style={{ backgroundColor: input.trim() ? '#1D6296' : '#E5E7EB' }}
          >
            {sending
              ? <ActivityIndicator size="small" color={input.trim() ? 'white' : '#9CA3AF'} />
              : <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color={input.trim() ? 'white' : '#9CA3AF'} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 2,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1D6296',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
})
