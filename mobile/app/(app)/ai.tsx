import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  timestamp: Date
}

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

export default function AIScreen() {
  const router = useRouter()
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)
  const scrollRef = useRef<ScrollView>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'ai',
      text: t('aiGreeting', lang),
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${WEB_URL}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang }),
        signal: AbortSignal.timeout(15000),
      })

      let aiText: string
      if (res.ok) {
        const data = await res.json()
        aiText = data.message ?? data.response ?? t('aiStaticResponse', lang)
      } else {
        aiText = t('aiStaticResponse', lang)
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: aiText,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: t('aiStaticResponse', lang),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#1D6296" />
          </TouchableOpacity>
          <View style={[styles.headerCenter, isRTL && { alignItems: 'flex-end' }]}>
            <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
              {t('aiTitle', lang)}
            </Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>
              {t('aiSubtitle', lang)}
            </Text>
          </View>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="warning-outline" size={14} color="#D97706" />
          <Text style={[styles.disclaimerText, isRTL && styles.rtlText]}>
            {t('aiDisclaimer', lang)}
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(msg => {
            const isUser = msg.role === 'user'
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubbleWrapper,
                  isUser ? styles.userBubbleWrapper : styles.aiBubbleWrapper,
                  isRTL && (isUser ? styles.rtlUserWrapper : styles.rtlAIWrapper),
                ]}
              >
                {!isUser && (
                  <View style={styles.aiAvatar}>
                    <Text style={{ fontSize: 14 }}>🤖</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userMessageText : styles.aiMessageText,
                      isRTL && styles.rtlText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            )
          })}

          {loading && (
            <View style={[styles.messageBubbleWrapper, styles.aiBubbleWrapper]}>
              <View style={styles.aiAvatar}>
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
              <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#1D6296" />
                <Text style={[styles.typingText, isRTL && styles.rtlText]}>
                  {t('typing', lang)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputRow, isRTL && styles.rtlRow]}>
          <TextInput
            style={[styles.textInput, isRTL && styles.rtlText]}
            placeholder={t('aiInputPlaceholder', lang)}
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  keyboardView: { flex: 1 },
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
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  avatarBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 18 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  disclaimerText: { fontSize: 11, color: '#92400E', flex: 1, lineHeight: 16 },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, gap: 12, paddingBottom: 20 },
  messageBubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubbleWrapper: { justifyContent: 'flex-end' },
  aiBubbleWrapper: { justifyContent: 'flex-start' },
  rtlUserWrapper: { flexDirection: 'row-reverse' },
  rtlAIWrapper: { flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#1D6296',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: { fontSize: 14, lineHeight: 21 },
  userMessageText: { color: '#FFFFFF' },
  aiMessageText: { color: '#111827' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 13, color: '#6B7280', fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1D6296',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#9CA3AF' },
})
