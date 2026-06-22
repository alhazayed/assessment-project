import { ScrollView, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppLocale } from '@/lib/LocaleContext'
import { useIsRTL } from '@/lib/hooks'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

export default function PrivacyScreen() {
  const router = useRouter()
  const { lang } = useAppLocale()
  const isRTL = useIsRTL(lang)
  const isAr = lang === 'ar'

  const sections = [
    {
      heading: isAr ? 'المعلومات التي نجمعها' : 'Information We Collect',
      body: isAr
        ? 'نجمع المعلومات التي تقدمها مباشرة، مثل الاسم وعنوان البريد الإلكتروني وبيانات الصحة النفسية المُدخلة من خلال التقييمات وسجلات المزاج والمجلات الشخصية. نستخدم هذه البيانات حصراً لتوفير الخدمة وتحسين تجربتك.'
        : 'We collect information you provide directly, such as your name, email address, and mental health data entered through assessments, mood logs, and journal entries. We use this data solely to provide the service and improve your experience.',
    },
    {
      heading: isAr ? 'كيف نستخدم بياناتك' : 'How We Use Your Data',
      body: isAr
        ? 'تُستخدم بياناتك لتقديم التقييمات النفسية، وتوليد التقارير، وتشغيل مرافق مساعد الذكاء الاصطناعي. لا نبيع بياناتك الشخصية أبداً ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.'
        : 'Your data is used to deliver psychological assessments, generate reports, and power the AI companion features. We never sell your personal data or share it with third parties for marketing purposes.',
    },
    {
      heading: isAr ? 'تخزين البيانات وأمانها' : 'Data Storage & Security',
      body: isAr
        ? 'يتم تخزين جميع البيانات بشكل آمن باستخدام Supabase المستضافة في منطقة الاتحاد الأوروبي المركزية. نستخدم تشفير TLS لجميع نقل البيانات، وتشفير AES-256 للبيانات المخزنة، ومصادقة متعددة العوامل للوصول الإداري.'
        : 'All data is stored securely using Supabase hosted in EU-Central. We use TLS encryption for all data transmission, AES-256 for stored data, and multi-factor authentication for administrative access.',
    },
    {
      heading: isAr ? 'حقوقك' : 'Your Rights',
      body: isAr
        ? 'يحق لك الوصول إلى بياناتك الشخصية وتصحيحها وحذفها في أي وقت. يمكنك تصدير بياناتك الكاملة من قسم الملف الشخصي، أو طلب حذف الحساب. للممارسة هذه الحقوق، تواصل معنا عبر privacy@vwelfare.com.'
        : 'You have the right to access, correct, and delete your personal data at any time. You can export your full data from the Profile section, or request account deletion. To exercise these rights, contact us at privacy@vwelfare.com.',
    },
    {
      heading: isAr ? 'ملفات تعريف الارتباط والتتبع' : 'Cookies & Tracking',
      body: isAr
        ? 'لا يستخدم التطبيق ملفات تعريف الارتباط. نستخدم بيانات مجهولة الهوية لتحليلات الاستخدام للمساعدة في تحسين التطبيق. لا نتتبع موقعك الجغرافي ولا نبني ملفات تعريف إعلانية.'
        : 'The app does not use cookies. We use anonymised usage analytics to help improve the app. We do not track your location or build advertising profiles.',
    },
    {
      heading: isAr ? 'المعلومات الصحية الحساسة' : 'Sensitive Health Information',
      body: isAr
        ? 'ندرك أن بيانات الصحة النفسية حساسة للغاية. لا يمكن لأي طرف ثالث غير مصرح به الوصول إلى نتائج التقييم أو سجلات المزاج أو الملاحظات. يمكن للمعالجين المعينين فقط عرض البيانات عند منحك إذن صريح.'
        : 'We recognise that mental health data is highly sensitive. No unauthorised third party can access your assessment results, mood logs, or notes. Only assigned clinicians can view data when you grant explicit permission.',
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#1D6296" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.updated, isRTL && styles.rtlText]}>
          {isAr ? 'آخر تحديث: يونيو 2026' : 'Last updated: June 2026'}
        </Text>

        {sections.map(({ heading, body }) => (
          <View key={heading} style={styles.section}>
            <Text style={[styles.sectionHeading, isRTL && styles.rtlText]}>{heading}</Text>
            <Text style={[styles.sectionBody, isRTL && styles.rtlBody]}>{body}</Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
          style={styles.webBtn}
        >
          <Text style={styles.webBtnText}>
            {isAr ? 'عرض السياسة الكاملة على الويب' : 'View Full Policy on Web'}
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
