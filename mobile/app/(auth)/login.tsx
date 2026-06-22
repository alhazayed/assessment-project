import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

export default function LoginScreen() {
  const router = useRouter()
  const { lang, setLang } = useLocale()
  const isRTL = useIsRTL(lang)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin() {
    if (!email.trim()) { setError(t('emailRequired', lang)); return }
    if (!password) { setError(t('passwordRequired', lang)); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) { setError(t('invalidEmail', lang)); return }

    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (err) {
      // Never expose specific auth errors — always show generic message
      setError(t('signInError', lang))
      setLoading(false)
    } else {
      router.replace('/(app)/dashboard')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Language toggle */}
        <View style={[styles.langRow, isRTL && styles.rtlRow]}>
          {(['en', 'ar'] as Lang[]).map(l => (
            <TouchableOpacity
              key={l}
              onPress={() => setLang(l)}
              style={[styles.langBtn, lang === l && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
                {l === 'en' ? 'EN' : 'عر'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>V</Text>
          </View>
          <Text style={[styles.appName, isRTL && styles.rtlText]}>Vwelfare</Text>
          <Text style={[styles.tagline, isRTL && styles.rtlText]}>
            {lang === 'ar' ? 'شريكك في الصحة النفسية' : 'Your Mental Wellness Partner'}
          </Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, isRTL && styles.rtlText]}>
          {lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}
        </Text>
        <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
          {lang === 'ar' ? 'سجّل الدخول إلى حسابك' : 'Sign in to your account'}
        </Text>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error}</Text>
          </View>
        )}

        {/* Email */}
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

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {lang === 'ar' ? 'كلمة المرور' : 'Password'}
          </Text>
          <View style={[styles.passwordRow, isRTL && styles.rtlRow]}>
            <TextInput
              style={[styles.textInput, styles.passwordInput, isRTL && styles.rtlText]}
              placeholder={t('passwordPlaceholder', lang)}
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

        {/* Sign in */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={styles.signInBtn}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.signInBtnText}>{t('signIn', lang)}</Text>
          }
        </TouchableOpacity>

        {/* Forgot password */}
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={styles.forgotLink}>
            <Text style={styles.forgotLinkText}>{t('forgotPasswordLink', lang)}</Text>
          </TouchableOpacity>
        </Link>

        {/* Register */}
        <View style={[styles.registerRow, isRTL && styles.rtlRow]}>
          <Text style={styles.registerText}>{t('dontHaveAccount', lang)} </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>{t('createAccount', lang)}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: 24 },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  langBtnActive: { borderColor: '#1D6296', backgroundColor: '#EBF4FA' },
  langBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  langBtnTextActive: { color: '#1D6296' },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1D6296',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#1D6296',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  logoLetter: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  appName: { fontSize: 22, fontWeight: '800', color: '#12273C' },
  tagline: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  fieldGroup: { marginBottom: 16 },
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
  passwordRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  passwordInput: { flex: 1, paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  signInBtn: {
    backgroundColor: '#1D6296',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
    shadowColor: '#1D6296',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  signInBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  forgotLink: { alignItems: 'center', paddingVertical: 8, marginBottom: 20 },
  forgotLinkText: { fontSize: 13, color: '#1D6296', fontWeight: '500' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 13, color: '#6B7280' },
  registerLink: { fontSize: 13, fontWeight: '700', color: '#1D6296' },
})
