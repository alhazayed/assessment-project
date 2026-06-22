import { ScrollView, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppLocale } from '@/lib/LocaleContext'
import { useIsRTL } from '@/lib/hooks'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

export default function TermsScreen() {
  const router = useRouter()
  const { lang } = useAppLocale()
  const isRTL = useIsRTL(lang)
  const isAr = lang === 'ar'

  const sections = [
    {
      heading: isAr ? 'قبول الشروط' : 'Acceptance of Terms',
      body: isAr
        ? 'باستخدام تطبيق Vwelfare، فإنك توافق على هذه الشروط. إذا كنت لا توافق على أي جزء من هذه الشروط، فلا يجوز لك استخدام الخدمة.'
        : 'By using the Vwelfare application, you agree to these Terms. If you disagree with any part of these terms, you may not access the service.',
    },
    {
      heading: isAr ? 'استخدام الخدمة' : 'Use of Service',
      body: isAr
        ? 'يمكنك استخدام Vwelfare للأغراض الشخصية غير التجارية فقط. يُحظر مشاركة حسابك، أو استخدام الخدمة لأي غرض غير قانوني، أو محاولة الوصول إلى بيانات مستخدمين آخرين.'
        : "You may use Vwelfare for personal, non-commercial purposes only. Sharing your account, using the service for any unlawful purpose, or attempting to access other users' data is prohibited.",
    },
    {
      heading: isAr ? 'حدود المسؤولية' : 'Limitation of Liability',
      body: isAr
        ? 'لا تتحمل Vwelfare المسؤولية عن أي قرارات تُتخذ بناءً على نتائج التقييمات. يجب دائماً استشارة متخصص صحة نفسية مرخص للحصول على تشخيص وعلاج مناسب.'
        : 'Vwelfare is not liable for any decisions made based on assessment results. Always consult a licensed mental health professional for appropriate diagnosis and treatment.',
    },
    {
      heading: isAr ? 'ملكية المحتوى' : 'Content Ownership',
      body: isAr
        ? 'تحتفظ بملكية البيانات التي تدخلها في التطبيق. تمنح Vwelfare ترخيصاً محدوداً لمعالجة هذه البيانات بهدف تقديم الخدمة.'
        : 'You retain ownership of the data you enter into the app. You grant Vwelfare a limited licence to process this data for the purpose of providing the service.',
    },
    {
      heading: isAr ? 'إنهاء الخدمة' : 'Termination',
      body: isAr
        ? 'يحق لك إنهاء حسابك في أي وقت من إعدادات التطبيق. يحق لـ Vwelfare تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط.'
        : 'You may terminate your account at any time from the app settings. Vwelfare reserves the right to suspend or terminate accounts that violate these Terms.',
    },
    {
      heading: isAr ? 'التغييرات على الشروط' : 'Changes to Terms',
      body: isAr
        ? 'قد نُحدّث هذه الشروط من وقت لآخر. سنُخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق.'
        : 'We may update these Terms from time to time. We will notify you of any material changes via email or in-app notification.',
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#1D6296" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {isAr ? 'شروط الاستخدام' : 'Terms of Use'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.updated, isRTL && styles.rtlText]}>
          {isAr ? 'آخر تحديث: يونيو 2026' : 'Last updated: June 2026'}
        </Text>

        {/* Healthcare disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={[styles.disclaimerTitle, isRTL && styles.rtlText]}>
            {isAr ? '⚠️ إخلاء مسؤولية طبي مهم' : '⚠️ Important Medical Disclaimer'}
          </Text>
          <Text style={[styles.disclaimerBody, isRTL && styles.rtlBody]}>
            {isAr
              ? 'تطبيق Vwelfare ليس بديلاً عن الرعاية الصحية النفسية المتخصصة. التقييمات والمعلومات المقدمة لأغراض تثقيفية فقط وليست تشخيصاً طبياً. إذا كنت تعاني من أزمة نفسية، اتصل بخدمات الطوارئ فوراً.'
              : 'Vwelfare is not a substitute for professional mental health care. Assessments and information provided are for educational purposes only and do not constitute medical diagnosis. If you are experiencing a mental health crisis, contact emergency services immediately.'}
          </Text>
        </View>

        {sections.map(({ heading, body }) => (
          <View key={heading} style={styles.section}>
            <Text style={[styles.sectionHeading, isRTL && styles.rtlText]}>{heading}</Text>
            <Text style={[styles.sectionBody, isRTL && styles.rtlBody]}>{body}</Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
          style={styles.webBtn}
        >
          <Text style={styles.webBtnText}>
            {isAr ? 'عرض الشروط الكاملة على الويب' : 'View Full Terms on Web'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  rtlBody: { textAlign: 'right', writingDirection: 'rtl' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 40 },
  updated: { fontSize: 11, color: '#9CA3AF', marginBottom: 24 },
  disclaimer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  disclaimerTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  disclaimerBody: { fontSize: 13, color: '#B45309', lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sectionBody: { fontSize: 13, color: '#4B5563', lineHeight: 22 },
  webBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webBtnText: { fontSize: 13, fontWeight: '500', color: '#1D6296' },
})
