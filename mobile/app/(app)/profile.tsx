import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

export default function ProfileScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameEn, setNameEn] = useState('')
  const [exportingData, setExportingData] = useState(false)

  useEffect(() => {
    if (profile) setNameEn(profile.full_name_en)
  }, [profile])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('profiles').update({ full_name_en: nameEn }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExportData() {
    setExportingData(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${WEB_URL}/api/user/export-data`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      if (res.ok) {
        Alert.alert(
          lang === 'ar' ? 'تم' : 'Success',
          lang === 'ar'
            ? 'سيتم إرسال بياناتك إلى بريدك الإلكتروني.'
            : 'Your data export has been sent to your email.',
        )
      } else {
        throw new Error('Export failed')
      }
    } catch {
      Alert.alert(
        t('error', lang),
        lang === 'ar' ? 'تعذر تصدير البيانات. يرجى المحاولة لاحقاً.' : 'Unable to export data. Please try again later.',
      )
    } finally {
      setExportingData(false)
    }
  }

  async function handleDownloadLastReport() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: lastSub } = await supabase
      .from('assessment_submissions')
      .select('id')
      .eq('patient_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (!lastSub) {
      Alert.alert(
        lang === 'ar' ? 'لا توجد نتائج' : 'No Results',
        lang === 'ar' ? 'لم تكمل أي تقييم بعد.' : 'You have not completed any assessments yet.',
      )
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${WEB_URL}/api/export/pdf/${lastSub.id}`, {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    })
    if (res.ok) {
      Alert.alert(
        lang === 'ar' ? 'تم' : 'Success',
        lang === 'ar' ? 'جارٍ تحضير ملف PDF...' : 'Your PDF is being prepared.',
      )
    } else {
      Alert.alert(t('error', lang))
    }
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

  const initials = (nameEn || 'U')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>
          {t('profileTitle', lang)}
        </Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.profileName, isRTL && styles.rtlText]}>{nameEn}</Text>
          <Text style={[styles.profileRole, isRTL && styles.rtlText]}>
            {profile?.role ?? 'patient'}
          </Text>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('personalInfo', lang)}
          </Text>
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('fullName', lang)}
          </Text>
          <TextInput
            style={[styles.textInput, isRTL && styles.rtlText]}
            value={nameEn}
            onChangeText={setNameEn}
            placeholder={t('namePlaceholder', lang)}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('email', lang)}
          </Text>
          <View style={[styles.readOnlyField, isRTL && styles.rtlRow]}>
            <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
            <Text style={[styles.readOnlyText, isRTL && styles.rtlText]}>
              {lang === 'ar' ? 'بريدك الإلكتروني سري' : 'Your email is private'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {saved ? t('savedSuccess', lang) : t('saveChanges', lang)}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* My Data */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('myData', lang)}
          </Text>
          <TouchableOpacity
            onPress={handleExportData}
            disabled={exportingData}
            style={[styles.actionRow, isRTL && styles.rtlRow]}
          >
            {exportingData
              ? <ActivityIndicator size="small" color="#1D6296" />
              : <Ionicons name="download-outline" size={20} color="#1D6296" />
            }
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>
              {t('exportData', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={handleDownloadLastReport}
            style={[styles.actionRow, isRTL && styles.rtlRow]}
          >
            <Ionicons name="document-text-outline" size={20} color="#1D6296" />
            <Text style={[styles.actionText, isRTL && styles.rtlText]}>
              {t('downloadLastReport', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('account', lang)}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings')}
            style={[styles.actionRow, isRTL && styles.rtlRow]}
          >
            <Ionicons name="settings-outline" size={20} color="#374151" />
            <Text style={[styles.actionText, { color: '#374151' }, isRTL && styles.rtlText]}>
              {t('linkToSettings', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.actionRow, isRTL && styles.rtlRow]}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }, isRTL && styles.rtlText]}>
              {t('signOut', lang)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('support', lang)}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/emergency' as any)}
            style={[styles.actionRow, isRTL && styles.rtlRow]}
          >
            <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }, isRTL && styles.rtlText]}>
              {t('emergency', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={[styles.actionRow, isRTL && styles.rtlRow]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#374151" />
            <Text style={[styles.actionText, { color: '#374151' }, isRTL && styles.rtlText]}>
              {t('privacyPolicy', lang)}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 20 },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlRow: { flexDirection: 'row-reverse' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1D6296',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profileRole: { fontSize: 13, color: '#6B7280', marginTop: 4, textTransform: 'capitalize' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
    backgroundColor: '#F9FAFB',
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  readOnlyText: { fontSize: 13, color: '#6B7280' },
  saveBtn: {
    backgroundColor: '#1D6296',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnSuccess: { backgroundColor: '#16A34A' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actionText: { fontSize: 14, color: '#1D6296', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
})
