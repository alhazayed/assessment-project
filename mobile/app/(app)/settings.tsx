import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAppLocale } from '@/lib/LocaleContext'
import { useThemeMode, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { ThemeMode } from '@/lib/hooks'
import {
  requestNotificationPermission,
  registerPushToken,
  unregisterPushToken,
  scheduleDailyMoodReminder,
  scheduleWeeklyAssessmentReminder,
  cancelAllReminders,
  getNotificationsEnabled,
  setNotificationsEnabled as persistNotificationsEnabled,
} from '@/lib/notifications'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

export default function SettingsScreen() {
  const router = useRouter()
  const { lang, setLang } = useAppLocale()
  const { mode, setMode } = useThemeMode()
  const isRTL = useIsRTL(lang)

  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    getNotificationsEnabled().then(setNotificationsEnabled)
  }, [])

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        Alert.alert(
          t('notifications', lang),
          lang === 'ar'
            ? 'يرجى تمكين الإشعارات في إعدادات الجهاز.'
            : 'Please enable notifications in your device settings.',
        )
        return
      }
      await scheduleDailyMoodReminder(lang)
      await scheduleWeeklyAssessmentReminder(lang)
      await registerPushToken()
    } else {
      await cancelAllReminders()
      await unregisterPushToken()
    }
    setNotificationsEnabled(value)
    await persistNotificationsEnabled(value)
  }

  function handleDeleteAccount() {
    Alert.alert(
      t('deleteAccount', lang),
      t('deleteConfirm', lang),
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('delete', lang),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true)
            try {
              const { data: { session } } = await supabase.auth.getSession()
              await fetch(`${WEB_URL}/api/user/delete-request`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session?.access_token ?? ''}`,
                },
              })
              await supabase.auth.signOut()
              router.replace('/(auth)/login')
            } catch {
              Alert.alert(t('error', lang), lang === 'ar' ? 'تعذر حذف الحساب. يرجى التواصل مع الدعم.' : 'Unable to delete account. Please contact support.')
            } finally {
              setDeletingAccount(false)
            }
          },
        },
      ],
    )
  }

  async function handleSignOut() {
    Alert.alert(
      t('signOut', lang),
      lang === 'ar' ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to sign out?',
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('signOut', lang),
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
            router.replace('/(auth)/login')
          },
        },
      ],
    )
  }

  const themeOptions: Array<{ value: ThemeMode; labelKey: 'lightMode' | 'darkMode' | 'systemDefault'; icon: string }> = [
    { value: 'light', labelKey: 'lightMode', icon: 'sunny-outline' },
    { value: 'dark', labelKey: 'darkMode', icon: 'moon-outline' },
    { value: 'system', labelKey: 'systemDefault', icon: 'phone-portrait-outline' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#1D6296" />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>
            {t('settingsTitle', lang)}
          </Text>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>
            {t('settingsLanguage', lang)}
          </Text>
          <View style={[styles.langRow, isRTL && styles.rtlRow]}>
            {(['en', 'ar'] as Lang[]).map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => setLang(l)}
                style={[
                  styles.langBtn,
                  lang === l && styles.langBtnActive,
                ]}
              >
                <Text style={[
                  styles.langBtnText,
                  lang === l && styles.langBtnTextActive,
                ]}>
                  {l === 'en' ? 'English' : 'العربية'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>
            {t('settingsTheme', lang)}
          </Text>
          <View style={[styles.themeRow, isRTL && styles.rtlRow]}>
            {themeOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setMode(opt.value)}
                style={[
                  styles.themeBtn,
                  mode === opt.value && styles.themeBtnActive,
                ]}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={18}
                  color={mode === opt.value ? '#1D6296' : '#6B7280'}
                />
                <Text style={[
                  styles.themeBtnText,
                  mode === opt.value && styles.themeBtnTextActive,
                ]}>
                  {t(opt.labelKey, lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>
            {t('notifications', lang)}
          </Text>
          <View style={[styles.settingRow, isRTL && styles.rtlRow]}>
            <Text style={[styles.settingLabel, isRTL && styles.rtlText]}>
              {t('enableNotifications', lang)}
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ true: '#1D6296', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {notificationsEnabled && (
            <View style={[styles.settingRow, isRTL && styles.rtlRow]}>
              <Text style={[styles.settingLabel, isRTL && styles.rtlText]}>
                {t('assessmentReminders', lang)}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            </View>
          )}
        </View>

        {/* Legal / Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>
            {lang === 'ar' ? 'قانوني ودعم' : 'Legal & Support'}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/emergency' as any)}
            style={[styles.linkRow, isRTL && styles.rtlRow]}
          >
            <Text style={[styles.linkText, isRTL && styles.rtlText]}>
              {t('emergency', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={() => router.push('/privacy' as any)}
            style={[styles.linkRow, isRTL && styles.rtlRow]}
          >
            <Text style={[styles.linkText, isRTL && styles.rtlText]}>
              {t('privacy', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={() => router.push('/terms' as any)}
            style={[styles.linkRow, isRTL && styles.rtlRow]}
          >
            <Text style={[styles.linkText, isRTL && styles.rtlText]}>
              {t('termsOfUse', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, isRTL && styles.rtlText, { color: '#EF4444' }]}>
            {lang === 'ar' ? 'منطقة الخطر' : 'Danger Zone'}
          </Text>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            style={styles.dangerBtn}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text style={styles.dangerBtnText}>{t('deleteAccount', lang)}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#6B7280" />
          <Text style={[styles.signOutText, isRTL && { marginRight: 8 }]}>
            {t('signOut', lang)}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.3 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langBtnActive: { backgroundColor: '#EBF4FA', borderColor: '#1D6296' },
  langBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  langBtnTextActive: { color: '#1D6296', fontWeight: '700' },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  themeBtnActive: { backgroundColor: '#EBF4FA', borderColor: '#1D6296' },
  themeBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  themeBtnTextActive: { color: '#1D6296', fontWeight: '700' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingLabel: { fontSize: 14, color: '#374151', flex: 1 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  linkText: { fontSize: 14, color: '#374151' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  signOutText: { color: '#6B7280', fontSize: 14, fontWeight: '500', marginLeft: 8 },
})
