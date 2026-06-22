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
      recipient_id: clinicianId ?? userId,
      body: text,
      is_read: false,
    })
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <View style={styles.avatar}>
            <Ionicons name="medical" size={18} color="white" />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.headerName, isRTL && styles.rtlText]}>
              {lang === 'ar' ? 'فريق الرعاية' : 'Care Team'}
            </Text>
            <Text style={[styles.headerSub, isRTL && styles.rtlText]}>
              {lang === 'ar' ? 'معالج نفسي' : 'Your therapist'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#1D6296" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={32} color="#1D6296" />
            </View>
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              {lang === 'ar'
                ? 'لا توجد رسائل بعد\nستظهر هنا رسائل فريق الرعاية'
                : 'No messages yet\nMessages from your care team will appear here'}
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.messageList}
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
                  <Text
                    style={[styles.bubbleText, { color: isMine ? '#FFFFFF' : '#374151' }]}
                    textBreakStrategy="highQuality"
                  >
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

        {/* Input bar */}
        <View style={[styles.inputBar, isRTL && styles.rtlRow]}>
          <TextInput
            style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? '#1D6296' : '#E5E7EB' }]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={input.trim() ? 'white' : '#9CA3AF'} />
            ) : (
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={18}
                color={input.trim() ? 'white' : '#9CA3AF'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1D6296',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF4FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  messageList: { padding: 16, gap: 8 },
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
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
})
