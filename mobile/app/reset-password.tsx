import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAppLocale } from '@/lib/LocaleContext'
import { useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
  }, [])

  async function handleReset() {
    if (password.length < 8) {
      setError(t('passwordTooShort', lang))
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
      <SafeAreaView style={styles.centered}>
        <Ionicons name="link-outline" size={48} color="#D1D5DB" />
        <Text style={[styles.invalidText, isRTL && styles.rtlText]}>
          {isAr ? 'رابط غير صالح أو منتهي الصلاحية.' : 'Invalid or expired reset link.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>
            {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeAreaView style={styles.inner}>
        <Text style={[styles.title, isRTL && styles.rtlText]}>
          {isAr ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}
        </Text>
        <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
          {isAr ? 'اختر كلمة مرور قوية لحسابك' : 'Choose a strong password for your account'}
        </Text>

        {done ? (
          <View style={styles.successBox}>
            <Text style={[styles.successTitle, isRTL && styles.rtlText]}>
              {isAr ? '✓ تم تغيير كلمة المرور بنجاح' : '✓ Password updated successfully'}
            </Text>
            <Text style={[styles.successBody, isRTL && styles.rtlText]}>
              {isAr ? 'جاري توجيهك...' : 'Redirecting you...'}
            </Text>
          </View>
        ) : (
          <>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
              </Text>
              <View style={[styles.passwordRow, isRTL && styles.rtlRow]}>
                <TextInput
                  style={[styles.textInput, styles.passwordInput, isRTL && styles.rtlText]}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(s => !s)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
                {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </Text>
              <View style={[styles.passwordRow, isRTL && styles.rtlRow]}>
                <TextInput
                  style={[styles.textInput, styles.passwordInput, isRTL && styles.rtlText]}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirm}
                  value={confirm}
                  onChangeText={setConfirm}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(s => !s)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isAr ? 'تحديث كلمة المرور' : 'Update Password'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  centered: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  invalidText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  backBtn: { backgroundColor: '#1D6296', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32, lineHeight: 22 },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 20,
  },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#15803D', textAlign: 'center', marginBottom: 6 },
  successBody: { fontSize: 13, color: '#16A34A', textAlign: 'center' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  passwordInput: { flex: 1, paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  submitBtn: {
    backgroundColor: '#1D6296',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
})
