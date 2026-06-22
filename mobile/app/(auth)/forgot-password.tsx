import { useState } from 'react'
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
    setLoading(true)
    setError('')
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'vwelfare://reset-password',
    })
    // Always show success to prevent email enumeration
    setSent(true)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeAreaView style={styles.inner}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backRow, isRTL && styles.rtlRow]}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={20}
            color="#1D6296"
          />
          <Text style={[styles.backText, isRTL && { marginRight: 6 }]}>
            {t('backToLogin', lang)}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.title, isRTL && styles.rtlText]}>
          {t('forgotPassword', lang)}
        </Text>
        <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
          {lang === 'ar'
            ? 'سنرسل رابط إعادة التعيين إلى بريدك الإلكتروني'
            : "We'll send a reset link to your email."}
        </Text>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={[styles.successTitle, isRTL && styles.rtlText]}>
              {lang === 'ar' ? 'تحقق من بريدك الإلكتروني!' : 'Check your email!'}
            </Text>
            <Text style={[styles.successBody, isRTL && styles.rtlText]}>
              {lang === 'ar'
                ? 'إذا كان الحساب موجوداً، ستصل رسالة إعادة التعيين خلال دقائق.'
                : "If an account exists, you'll receive a reset link shortly."}
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
                {t('email', lang)}
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.rtlText]}
                placeholder={t('emailPlaceholder', lang)}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>{t('resetPassword', lang)}</Text>
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
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32, alignSelf: 'flex-start' },
  backText: { color: '#1D6296', fontSize: 14, fontWeight: '500', marginLeft: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32, lineHeight: 22 },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 20,
  },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#15803D', textAlign: 'center', marginBottom: 8 },
  successBody: { fontSize: 13, color: '#16A34A', textAlign: 'center', lineHeight: 20 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13 },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
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
  submitBtn: {
    backgroundColor: '#1D6296',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
})
