import { View, Text, TouchableOpacity, ScrollView, Linking, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'

export default function EmergencyScreen() {
  const router = useRouter()
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)

  function callEmergency() {
    Linking.openURL('tel:911')
  }

  function callCrisisLine() {
    Linking.openURL('tel:988')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backRow, isRTL && styles.rtlRow]}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#6B7280" />
          <Text style={[styles.backText, isRTL && { marginRight: 6 }]}>
            {t('back', lang)}
          </Text>
        </TouchableOpacity>

        {/* Warning header */}
        <View style={styles.warningHeader}>
          <View style={styles.warningIconBg}>
            <Ionicons name="alert-circle" size={48} color="#FFFFFF" />
          </View>
          <Text style={[styles.warningTitle, isRTL && styles.rtlText]}>
            {t('emergencyTitle', lang)}
          </Text>
        </View>

        {/* Message */}
        <View style={styles.messageCard}>
          <Text style={[styles.messageText, isRTL && styles.rtlText]}>
            {t('emergencyMessage', lang)}
          </Text>
        </View>

        {/* Emergency Call */}
        <TouchableOpacity onPress={callEmergency} style={styles.emergencyBtn}>
          <Ionicons name="call" size={22} color="#FFFFFF" />
          <Text style={[styles.emergencyBtnText, isRTL && { marginRight: 10 }]}>
            {t('callEmergency', lang)}
          </Text>
        </TouchableOpacity>

        {/* Crisis Line */}
        <TouchableOpacity onPress={callCrisisLine} style={styles.crisisBtn}>
          <Ionicons name="headset" size={22} color="#1D6296" />
          <View style={[styles.crisisBtnInfo, isRTL && { alignItems: 'flex-end' }]}>
            <Text style={[styles.crisisLabel, isRTL && styles.rtlText]}>
              {t('crisisLine', lang)}
            </Text>
            <Text style={[styles.crisisNumber, isRTL && styles.rtlText]}>
              {t('callNumber', lang)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Support message */}
        <View style={styles.supportCard}>
          <Text style={styles.supportEmoji}>💙</Text>
          <Text style={[styles.supportText, isRTL && styles.rtlText]}>
            {t('emergencySupportMessage', lang)}
          </Text>
        </View>

        {/* Additional resources */}
        <View style={styles.additionalCard}>
          <Text style={[styles.additionalTitle, isRTL && styles.rtlText]}>
            {lang === 'ar' ? 'موارد إضافية' : 'Additional Resources'}
          </Text>
          {[
            { label: lang === 'ar' ? 'خط التحدث بصوت عالٍ: 1-800-784-2433' : 'Speak Up: 1-800-784-2433', icon: 'call-outline' },
            { label: lang === 'ar' ? 'الدعم عبر الرسائل النصية: أرسل HOME إلى 741741' : 'Crisis Text: Text HOME to 741741', icon: 'chatbubble-outline' },
            { label: lang === 'ar' ? 'موقع NAMI: nami.org' : 'NAMI: nami.org', icon: 'globe-outline' },
          ].map((item, idx) => (
            <View key={idx} style={[styles.additionalRow, isRTL && styles.rtlRow]}>
              <Ionicons name={item.icon as any} size={16} color="#6B7280" />
              <Text style={[styles.additionalText, isRTL && styles.rtlText]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' },
  scroll: { padding: 20, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  backText: { color: '#6B7280', fontSize: 14, fontWeight: '500', marginLeft: 6 },
  warningHeader: { alignItems: 'center', marginBottom: 24 },
  warningIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningTitle: { fontSize: 24, fontWeight: '800', color: '#991B1B', textAlign: 'center' },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  messageText: { fontSize: 15, color: '#374151', lineHeight: 24 },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  emergencyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  crisisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#1D6296',
  },
  crisisBtnInfo: { flex: 1 },
  crisisLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  crisisNumber: { fontSize: 16, color: '#1D6296', fontWeight: '700', marginTop: 2 },
  supportCard: {
    backgroundColor: '#EBF4FA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  supportEmoji: { fontSize: 36 },
  supportText: { fontSize: 15, color: '#1D6296', textAlign: 'center', lineHeight: 23, fontWeight: '500' },
  additionalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  additionalTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 },
  additionalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  additionalText: { fontSize: 13, color: '#6B7280', flex: 1 },
})
