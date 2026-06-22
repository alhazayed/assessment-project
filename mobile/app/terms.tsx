import { ScrollView, View, Text, TouchableOpacity, Linking } from 'react-native'
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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View
        className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#1D6296" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1"
          style={isRTL ? { textAlign: 'right' } : undefined}>
          {isAr ? 'شروط الاستخدام' : 'Terms of Use'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mb-6"
          style={isRTL ? { textAlign: 'right' } : undefined}>
          {isAr ? 'آخر تحديث: يونيو 2026' : 'Last updated: June 2026'}
        </Text>

        {/* Healthcare disclaimer — prominent */}
        <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-6">
          <Text className="text-amber-800 dark:text-amber-300 font-bold text-sm mb-1"
            style={isRTL ? { textAlign: 'right' } : undefined}>
            {isAr ? '⚠️ إخلاء مسؤولية طبي مهم' : '⚠️ Important Medical Disclaimer'}
          </Text>
          <Text className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed"
            style={isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : undefined}>
            {isAr
              ? 'تطبيق Vwelfare ليس بديلاً عن الرعاية الصحية النفسية المتخصصة. التقييمات والمعلومات المقدمة لأغراض تثقيفية فقط وليست تشخيصاً طبياً. إذا كنت تعاني من أزمة نفسية، اتصل بخدمات الطوارئ فوراً.'
              : 'Vwelfare is not a substitute for professional mental health care. Assessments and information provided are for educational purposes only and do not constitute medical diagnosis. If you are experiencing a mental health crisis, contact emergency services immediately.'}
          </Text>
        </View>

        {[
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
              : 'You may use Vwelfare for personal, non-commercial purposes only. Sharing your account, using the service for any unlawful purpose, or attempting to access other users\' data is prohibited.',
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
        ].map(({ heading, body }) => (
          <View key={heading} className="mb-6">
            <Text className="text-base font-bold text-gray-900 dark:text-white mb-2"
              style={isRTL ? { textAlign: 'right' } : undefined}>
              {heading}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
              style={isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : undefined}>
              {body}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
          className="mt-2 py-3.5 rounded-xl items-center border border-gray-200 dark:border-gray-700"
        >
          <Text className="text-sm font-medium" style={{ color: '#1D6296' }}>
            {isAr ? 'عرض الشروط الكاملة على الويب' : 'View Full Terms on Web'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
