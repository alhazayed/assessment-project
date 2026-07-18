import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAppLocale } from '@/lib/LocaleContext'
import { useIsRTL } from '@/lib/hooks'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { lang } = useAppLocale()
  const isRTL = useIsRTL(lang)
  const isAr = lang === 'ar'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    // The recovery deep link is exchanged for a session asynchronously
    // (see lib/useDeepLinkAuth.ts), so react to auth-state changes rather than
    // reading the session only once — otherwise a valid link can momentarily
    // appear "invalid" before the exchange completes.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession((prev) => prev || !!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (password.length < 8) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
      setLoading(false)
      setTimeout(() => router.replace('/(app)/dashboard'), 2000)
    }
  }

  if (!hasSession) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900 items-center justify-center px-6">
        <Text className="text-gray-500 dark:text-gray-400 text-center">
          {isAr ? 'رابط غير صالح أو منتهي الصلاحية.' : 'Invalid or expired reset link.'}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="mt-4">
          <Text style={{ color: '#1D6296', fontWeight: '600' }}>
            {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white dark:bg-gray-900">
      <SafeAreaView className="flex-1 px-6 pt-8 pb-8">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
          style={isRTL ? { textAlign: 'right' } : undefined}>
          {isAr ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mb-8"
          style={isRTL ? { textAlign: 'right' } : undefined}>
          {isAr ? 'اختر كلمة مرور قوية لحسابك' : 'Choose a strong password for your account'}
        </Text>

        {done ? (
          <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
            <Text className="text-green-700 dark:text-green-400 font-semibold text-center">
              {isAr ? '✓ تم تغيير كلمة المرور بنجاح' : '✓ Password updated successfully'}
            </Text>
            <Text className="text-green-600 dark:text-green-500 text-center text-sm mt-1">
              {isAr ? 'جاري توجيهك...' : 'Redirecting you...'}
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
              {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
            </Text>
            <TextInput
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm mb-4 bg-white dark:bg-gray-800"
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              style={isRTL ? { textAlign: 'right' } : undefined}>
              {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </Text>
            <TextInput
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm mb-6 bg-white dark:bg-gray-800"
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
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
                : <Text className="text-white font-semibold">
                    {isAr ? 'تحديث كلمة المرور' : 'Update Password'}
                  </Text>
              }
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}
