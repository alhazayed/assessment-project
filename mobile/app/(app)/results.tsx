import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { getSeverityColor } from '@/lib/theme'
import type { AssessmentSubmission, AssessmentDefinition } from '@/lib/types'

type SubmissionWithDef = AssessmentSubmission & {
  definition: Pick<AssessmentDefinition, 'name_en' | 'name_ar' | 'code'>
}

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

export default function ResultsScreen() {
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)

  const [submissions, setSubmissions] = useState<SubmissionWithDef[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('assessment_submissions')
        .select('*, definition:assessment_definitions(name_en, name_ar, code)')
        .eq('patient_id', user.id)
        .order('submitted_at', { ascending: false })
      setSubmissions((data as any) || [])
      setLoading(false)
    })()
  }, [])

  const assessmentTypes = [
    { key: 'all', label: t('allTypes', lang) },
    ...Array.from(new Set(submissions.map(s => (s.definition as any)?.code))).map(code => ({
      key: code as string,
      label: code as string,
    })),
  ]

  const filtered = filterType === 'all'
    ? submissions
    : submissions.filter(s => (s.definition as any)?.code === filterType)

  async function handleDownloadPDF(submissionId: string) {
    setDownloading(submissionId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${WEB_URL}/api/export/pdf/${submissionId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      if (res.ok) {
        Alert.alert(
          lang === 'ar' ? 'تم' : 'Success',
          lang === 'ar' ? 'جارٍ تحضير ملف PDF...' : 'Your PDF is being prepared. Check your email.',
        )
      } else {
        throw new Error('Failed')
      }
    } catch {
      Alert.alert(
        lang === 'ar' ? 'خطأ' : 'Error',
        lang === 'ar' ? 'تعذر تنزيل التقرير.' : 'Unable to download the report. Please try again.',
      )
    } finally {
      setDownloading(null)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>
          {t('resultsTitle', lang)}
        </Text>

        {/* Filter chips */}
        {assessmentTypes.length > 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              {assessmentTypes.map(type => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setFilterType(type.key)}
                  style={[
                    styles.filterChip,
                    filterType === type.key && styles.filterChipActive,
                  ]}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterType === type.key && styles.filterChipTextActive,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator color="#1D6296" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={56} color="#D1D5DB" />
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              {t('noResults', lang)}
            </Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            {filtered.map(sub => {
              const severityColor = sub.severity_band ? getSeverityColor(sub.severity_band) : '#6B7280'
              const name = lang === 'ar'
                ? (sub.definition as any)?.name_ar || sub.definition?.name_en
                : sub.definition?.name_en
              const isDownloadingThis = downloading === sub.id

              return (
                <View key={sub.id} style={styles.resultCard}>
                  <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
                    <Text style={[styles.resultName, isRTL && styles.rtlText]} numberOfLines={2}>
                      {name}
                    </Text>
                    {sub.high_risk_flag && (
                      <View style={styles.highRiskBadge}>
                        <Text style={styles.highRiskText}>{t('highRisk', lang)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.scoreRow, isRTL && styles.rtlRow]}>
                    <View style={styles.scoreBlock}>
                      <Text style={[styles.scoreLabel, isRTL && styles.rtlText]}>{t('score', lang)}</Text>
                      <Text style={[styles.scoreValue, isRTL && styles.rtlText]}>{sub.total_score}</Text>
                    </View>
                    {sub.severity_band && (
                      <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
                        <Text style={[styles.severityText, { color: severityColor }]}>
                          {sub.severity_band}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.dateText, isRTL && styles.rtlText]}>
                    {t('completedOn', lang)}: {new Date(sub.submitted_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleDownloadPDF(sub.id)}
                    disabled={isDownloadingThis}
                    style={styles.pdfBtn}
                  >
                    {isDownloadingThis ? (
                      <ActivityIndicator size="small" color="#1D6296" />
                    ) : (
                      <>
                        <Ionicons name="document-text-outline" size={16} color="#1D6296" />
                        <Text style={[styles.pdfBtnText, { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>
                          {t('downloadPDF', lang)}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlRow: { flexDirection: 'row-reverse' },
  filterScroll: { marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#1D6296', borderColor: '#1D6296' },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 260, lineHeight: 21 },
  resultsList: { gap: 12 },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8, lineHeight: 21 },
  highRiskBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  highRiskText: { color: '#DC2626', fontSize: 11, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  scoreBlock: {},
  scoreLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  scoreValue: { fontSize: 28, fontWeight: '800', color: '#1D6296', lineHeight: 34 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  severityText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1D6296',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 4,
  },
  pdfBtnText: { color: '#1D6296', fontSize: 13, fontWeight: '600' },
})
