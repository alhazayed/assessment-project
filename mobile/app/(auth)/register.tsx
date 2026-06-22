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

export default function RegisterScreen() {
  const router = useRouter()
  const { lang, setLang } = useLocale()
  const isRTL = useIsRTL(lang)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleRegister() {
    if (!name.trim()) { setError(t('nameRequired', lang)); return }
    if (!email.trim()) { setError(t('emailRequired', lang)); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) { setError(t('invalidEmail', lang)); return }
    if (password.length < 8) { setError(t('passwordTooShort', lang)); return }

    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name_en: name.trim(),
          gender: gender || null,
          date_of_birth: dob || null,
          language_preference: lang,
        },
      },
    })

    if (err) {
      setError(t('signInError', lang))
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="mail-outline" size={40} color="#1D6296" />
        </View>
        <Text style={[styles.successTitle, isRTL && styles.rtlText]}>
          {lang === 'ar' ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
        </Text>
        <Text style={[styles.successMsg, isRTL && styles.rtlText]}>
          {lang === 'ar'
            ? `أرسلنا رابط تأكيد إلى ${email}. انقر عليه لتفعيل حسابك، ثم سجّل الدخول.`
            : `We sent a confirmation link to ${email}. Tap it to activate your account, then sign in.`
          }
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backToLoginBtn}
        >
          <Text style={styles.backToLoginText}>{t('backToLogin', lang)}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
        </View>

        <Text style={[styles.title, isRTL && styles.rtlText]}>
          {t('createAccount', lang)}
        </Text>
        <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
          {lang === 'ar' ? 'وصول مجاني لجميع التقييمات' : 'Free access to all assessments'}
        </Text>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={[styles.errorText, isRTL && styles.rtlText]}>{error}</Text>
          </View>
        )}

        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('fullName', lang)} *
          </Text>
          <TextInput
            style={[styles.textInput, isRTL && styles.rtlText]}
            placeholder={t('namePlaceholder', lang)}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            autoCorrect={false}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('email', lang)} *
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
            {lang === 'ar' ? 'كلمة المرور' : 'Password'} *
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
          <Text style={[styles.passwordHint, isRTL && styles.rtlText]}>
            {t('passwordTooShort', lang)}
          </Text>
        </View>

        {/* Gender (optional) */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {lang === 'ar' ? 'الجنس (اختياري)' : 'Gender (optional)'}
          </Text>
          <View style={[styles.genderRow, isRTL && styles.rtlRow]}>
            {[
              { val: 'male', en: 'Male', ar: 'ذكر' },
              { val: 'female', en: 'Female', ar: 'أنثى' },
            ].map(g => (
              <TouchableOpacity
                key={g.val}
                onPress={() => setGender(prev => prev === g.val ? '' : g.val as 'male' | 'female')}
                style={[
                  styles.genderBtn,
                  gender === g.val && styles.genderBtnActive,
                ]}
              >
                <Text style={[
                  styles.genderBtnText,
                  gender === g.val && styles.genderBtnTextActive,
                ]}>
                  {lang === 'ar' ? g.ar : g.en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date of Birth (optional) */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {lang === 'ar' ? 'تاريخ الميلاد (اختياري)' : 'Date of Birth (optional)'}
          </Text>
          <TextInput
            style={[styles.textInput, isRTL && styles.rtlText]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            keyboardType="numbers-and-punctuation"
            value={dob}
            onChangeText={setDob}
            maxLength={10}
          />
        </View>

        {/* Register button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={styles.registerBtn}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.registerBtnText}>{t('createAccount', lang)}</Text>
          }
        </TouchableOpacity>

        {/* Sign in link */}
        <View style={[styles.signInRow, isRTL && styles.rtlRow]}>
          <Text style={styles.signInText}>{t('alreadyHaveAccount', lang)} </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.signInLink}>{t('signIn', lang)}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  successContainer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBF4FA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 12 },
  successMsg: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  backToLoginBtn: { backgroundColor: '#1D6296', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  backToLoginText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: 16 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  langBtnActive: { borderColor: '#1D6296', backgroundColor: '#EBF4FA' },
  langBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  langBtnTextActive: { color: '#1D6296' },
  logoSection: { alignItems: 'center', marginBottom: 20 },
  logoCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1D6296', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  textInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#FAFAFA' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  passwordInput: { flex: 1, paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  passwordHint: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB' },
  genderBtnActive: { backgroundColor: '#EBF4FA', borderColor: '#1D6296' },
  genderBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  genderBtnTextActive: { color: '#1D6296', fontWeight: '700' },
  registerBtn: { backgroundColor: '#1D6296', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  registerBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  signInRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signInText: { fontSize: 13, color: '#6B7280' },
  signInLink: { fontSize: 13, fontWeight: '700', color: '#1D6296' },
})
