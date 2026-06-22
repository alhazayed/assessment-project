import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAppLocale } from '@/lib/LocaleContext'
import { useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { lang } = useAppLocale()
  const isRTL = useIsRTL(lang)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset() {
    if (!email.trim()) { setError(t('emailRequired', lang)); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('invalidEmail', lang)); return }
    setLoading(true); setError('')
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'vwelfare://reset-password',
    })
    // Always show success to prevent email enumeration
    setSent(true); setLoading(false)
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white dark:bg-gray-900">
      <SafeAreaView className="flex-1 px-6 pt-4 pb-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-8 self-start flex-row items-center gap-1">
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#1D6296" />
          <Text style={{ color: '#1D6296' }}>{t('backToLogin', lang)}</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
          style={isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : undefined}>
          {t('forgotPassword', lang)}
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mb-8"
          style={isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : undefined}>
          {lang === 'ar' ? 'سنرسل رابط إعادة التعيين إلى بريدك الإلكتروني' : "We'll send a reset link to your email."}
        </Text>

        {sent ? (
          <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
            <Text className="text-green-700 dark:text-green-400 font-semibold text-center text-base">
              {lang === 'ar' ? 'تحقق من بريدك الإلكتروني' : 'Check your email!'}
            </Text>
            <Text className="text-green-600 dark:text-green-500 text-center text-sm mt-1">
              {lang === 'ar' ? 'إذا كان الحساب موجوداً، ستصل رسالة إعادة التعيين خلال دقائق.' : "If an account exists, you'll receive a reset link shortly."}
            </Text>
          </View>
        ) : (
          <>
            {!!error && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm" style={isRTL ? { textAlign: 'right' } : undefined}>{error}</Text>
              </View>
            )}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              style={isRTL ? { textAlign: 'right' } : undefined}>
              {t('emailPlaceholder', lang).replace('you@example.com', '') || 'Email'}
            </Text>
            <TextInput
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm mb-6 bg-white dark:bg-gray-800"
              placeholder={t('emailPlaceholder', lang)}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              className="w-full py-3.5 rounded-xl items-center"
              style={{ backgroundColor: '#1D6296' }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold">{t('resetPassword', lang)}</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}
