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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { getSeverityColor } from '@/lib/theme'
import type { AssessmentDefinition, AssessmentItem, ResponseOption, ScoringBand } from '@/lib/types'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

function calcBand(bands: ScoringBand[], score: number): ScoringBand | null {
  for (const b of bands) {
    if (score >= b.min && score <= b.max) return b
  }
  return bands[bands.length - 1] ?? null
}

export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)

  const [def, setDef] = useState<AssessmentDefinition | null>(null)
  const [items, setItems] = useState<AssessmentItem[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [step, setStep] = useState<'intro' | 'questions' | 'result'>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [result, setResult] = useState<{
    score: number
    band: ScoringBand | null
    highRisk: boolean
    submissionId: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('assessment_definitions').select('*').eq('id', id).single(),
      supabase.from('assessment_items').select('*').eq('definition_id', id).order('item_number'),
    ]).then(([defRes, itemsRes]) => {
      setDef(defRes.data)
      setItems(itemsRes.data || [])
      setLoading(false)
    })
  }, [id])

  async function handleSaveExit() {
    Alert.alert(
      lang === 'ar' ? 'حفظ والخروج' : 'Save & Exit',
      lang === 'ar' ? 'سيتم حفظ تقدمك وستتمكن من المتابعة لاحقاً.' : 'Your progress will be saved and you can resume later.',
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: lang === 'ar' ? 'حفظ والخروج' : 'Save & Exit',
          onPress: async () => {
            if (!def) return
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await supabase.from('assessment_sessions').upsert({
                patient_id: user.id,
                definition_id: def.id,
                status: 'in_progress',
                answers_snapshot: answers,
                current_item_index: currentIdx,
              }, { onConflict: 'patient_id,definition_id' })
            }
            router.back()
          },
        },
      ],
    )
  }

  async function handleSubmit() {
    if (!def) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const responses = items
      .filter(item => answers[item.id] !== undefined)
      .map(item => {
        const opt = item.response_options.find(o => o.value === answers[item.id])!
        return {
          item_id: item.id,
          response_value: answers[item.id],
          response_label_en: opt.label_en,
          response_label_ar: opt.label_ar,
        }
      })

    const totalScore = responses.reduce((sum, r) => sum + r.response_value, 0)
    const band = calcBand(def.scoring_logic as ScoringBand[], totalScore)
    const highRisk = responses.some(r => {
      const item = items.find(i => i.id === r.item_id)
      return item?.is_safety_item && r.response_value > 0
    }) || (def.high_risk_threshold !== null && totalScore >= def.high_risk_threshold)

    const { data: submission } = await supabase
      .from('assessment_submissions')
      .insert({
        patient_id: user.id,
        definition_id: def.id,
        total_score: totalScore,
        severity_band: band?.severity_en ?? null,
        high_risk_flag: highRisk,
        is_self_initiated: true,
      })
      .select('id')
      .single()

    if (submission) {
      await supabase.from('assessment_responses').insert(
        responses.map(r => ({ submission_id: submission.id, ...r }))
      )
      // Clear in-progress session
      await supabase
        .from('assessment_sessions')
        .delete()
        .eq('patient_id', user.id)
        .eq('definition_id', def.id)
    }

    setResult({
      score: totalScore,
      band,
      highRisk,
      submissionId: submission?.id ?? null,
    })
    setStep('result')
    setSubmitting(false)
  }

  async function handleDownloadPDF() {
    if (!result?.submissionId) return
    setDownloadingPDF(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${WEB_URL}/api/export/pdf/${result.submissionId}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      if (res.ok) {
        Alert.alert(
          lang === 'ar' ? 'تم' : 'Success',
          lang === 'ar' ? 'جارٍ تحضير ملف PDF...' : 'Your PDF is being prepared.',
        )
      } else {
        throw new Error('Failed')
      }
    } catch {
      Alert.alert(t('error', lang))
    } finally {
      setDownloadingPDF(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D6296" />
      </View>
    )
  }

  if (!def) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('error', lang)}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnSimple}>
          <Text style={styles.backBtnText}>{t('back', lang)}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const currentItem = items[currentIdx]
  const answeredCount = Object.keys(answers).length
  const progress = items.length > 0 ? answeredCount / items.length : 0
  const name = lang === 'ar' ? def.name_ar : def.name_en
  const desc = lang === 'ar' ? def.description_ar : def.description_en

  // INTRO
  if (step === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backRow, isRTL && styles.rtlRow]}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#1D6296" />
            <Text style={[styles.backText, isRTL && { marginRight: 6 }]}>{t('back', lang)}</Text>
          </TouchableOpacity>

          <Text style={[styles.introTitle, isRTL && styles.rtlText]}>{name}</Text>
          {desc && (
            <Text style={[styles.introDesc, isRTL && styles.rtlText]}>{desc}</Text>
          )}

          <View style={styles.infoCard}>
            <View style={[styles.infoRow, isRTL && styles.rtlRow]}>
              <Ionicons name="help-circle-outline" size={18} color="#6B7280" />
              <Text style={[styles.infoText, isRTL && styles.rtlText]}>
                {t('questions', lang, { count: def.total_questions })}
              </Text>
            </View>
            <View style={[styles.infoRow, isRTL && styles.rtlRow]}>
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <Text style={[styles.infoText, isRTL && styles.rtlText]}>
                {t('estimatedTime', lang, { min: Math.ceil(def.total_questions * 0.5) })}
              </Text>
            </View>
            <View style={[styles.infoRow, isRTL && styles.rtlRow]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
              <Text style={[styles.infoText, isRTL && styles.rtlText]}>
                {lang === 'ar' ? 'إجاباتك سرية ومحمية' : 'Your responses are private and protected'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setStep('questions')}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>{t('beginAssessment', lang)}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // QUESTIONS
  if (step === 'questions' && currentItem) {
    const questionText = lang === 'ar' ? currentItem.question_ar : currentItem.question_en
    const allAnswered = answeredCount === items.length
    const currentAnswered = answers[currentItem.id] !== undefined

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.questionContainer}>
          {/* Top bar */}
          <View style={[styles.questionTopBar, isRTL && styles.rtlRow]}>
            <TouchableOpacity onPress={handleSaveExit} style={styles.saveExitBtn}>
              <Text style={styles.saveExitText}>{t('saveExit', lang)}</Text>
            </TouchableOpacity>
            <Text style={[styles.questionCounter, isRTL && styles.rtlText]}>
              {t('question', lang, { current: currentIdx + 1, total: items.length })}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]}
            />
          </View>
          <Text style={[styles.progressPct, isRTL && styles.rtlText]}>
            {Math.round(progress * 100)}%
          </Text>

          <ScrollView style={styles.questionScroll} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Question */}
            <Text style={[styles.questionText, isRTL && styles.rtlText]}>
              {questionText}
            </Text>

            {/* Options */}
            <View style={styles.optionsList}>
              {currentItem.response_options.map((opt: ResponseOption) => {
                const selected = answers[currentItem.id] === opt.value
                const label = lang === 'ar' ? opt.label_ar : opt.label_en
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setAnswers(prev => ({ ...prev, [currentItem.id]: opt.value }))
                      if (currentIdx < items.length - 1) {
                        setTimeout(() => setCurrentIdx(i => i + 1), 220)
                      }
                    }}
                    style={[
                      styles.optionBtn,
                      selected && styles.optionBtnSelected,
                    ]}
                  >
                    <Text style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                      isRTL && styles.rtlText,
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>

          {/* Navigation */}
          <View style={[styles.navRow, isRTL && styles.rtlRow]}>
            {currentIdx > 0 && (
              <TouchableOpacity
                onPress={() => setCurrentIdx(i => i - 1)}
                style={styles.prevBtn}
              >
                <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={16} color="#374151" />
                <Text style={[styles.prevBtnText, isRTL && { marginRight: 4 }]}>{t('previous', lang)}</Text>
              </TouchableOpacity>
            )}

            {currentIdx < items.length - 1 ? (
              <TouchableOpacity
                onPress={() => setCurrentIdx(i => i + 1)}
                disabled={!currentAnswered}
                style={[
                  styles.nextBtn,
                  !currentAnswered && styles.nextBtnDisabled,
                ]}
              >
                <Text style={[styles.nextBtnText, isRTL && { marginRight: 4 }]}>{t('next', lang)}</Text>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || !allAnswered}
                style={[
                  styles.nextBtn,
                  { backgroundColor: allAnswered ? '#F3650A' : '#E5E7EB' },
                  submitting && { opacity: 0.7 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.nextBtnText, !allAnswered && { color: '#9CA3AF' }]}>
                    {t('submit', lang)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // RESULT
  if (step === 'result' && result) {
    const severityColor = result.band ? getSeverityColor(result.band.severity_en) : '#6B7280'
    const severityLabel = lang === 'ar' ? result.band?.severity_ar : result.band?.severity_en

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.resultHeader}>
            <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
            <Text style={[styles.resultTitle, isRTL && styles.rtlText]}>
              {t('assessmentComplete', lang)}
            </Text>
            <Text style={[styles.resultSubtitle, isRTL && styles.rtlText]}>{name}</Text>
          </View>

          {/* Score card */}
          <View style={[styles.scoreCard, { borderColor: result.highRisk ? '#EF4444' : '#1D6296' }]}>
            <Text style={[styles.scoreLabel, isRTL && styles.rtlText]}>{t('yourScore', lang)}</Text>
            <Text style={[styles.scoreValue, { color: result.highRisk ? '#EF4444' : '#1D6296' }]}>
              {result.score}
            </Text>
            {severityLabel && (
              <View style={[styles.severityPill, { backgroundColor: severityColor + '20' }]}>
                <Text style={[styles.severityPillText, { color: severityColor }, isRTL && styles.rtlText]}>
                  {severityLabel}
                </Text>
              </View>
            )}
            {result.highRisk && (
              <View style={styles.highRiskPill}>
                <Ionicons name="warning" size={14} color="#DC2626" />
                <Text style={styles.highRiskPillText}>
                  {lang === 'ar' ? 'خطر مرتفع' : 'High Risk'}
                </Text>
              </View>
            )}
          </View>

          {result.highRisk && (
            <View style={styles.highRiskAlert}>
              <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
              <Text style={[styles.highRiskAlertText, isRTL && styles.rtlText]}>
                {t('highRiskMessage', lang)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleDownloadPDF}
            disabled={downloadingPDF || !result.submissionId}
            style={styles.pdfBtn}
          >
            {downloadingPDF ? (
              <ActivityIndicator size="small" color="#1D6296" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#1D6296" />
                <Text style={styles.pdfBtnText}>{t('downloadPDF', lang)}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(app)/dashboard')}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>{t('backToDashboard', lang)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setStep('intro'); setAnswers({}); setCurrentIdx(0); setResult(null) }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>{t('takeAgain', lang)}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { fontSize: 16, color: '#6B7280' },
  backBtnSimple: { backgroundColor: '#1D6296', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: '#FFFFFF', fontWeight: '600' },
  scroll: { padding: 20, paddingBottom: 40 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { color: '#1D6296', fontSize: 14, fontWeight: '500', marginLeft: 6 },
  introTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, lineHeight: 32 },
  introDesc: { fontSize: 15, color: '#6B7280', lineHeight: 24, marginBottom: 24 },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: '#374151' },
  primaryBtn: {
    backgroundColor: '#1D6296',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  questionContainer: { flex: 1 },
  questionTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  saveExitBtn: { padding: 4 },
  saveExitText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  questionCounter: { fontSize: 13, color: '#6B7280' },
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', marginHorizontal: 16, borderRadius: 3, marginBottom: 4 },
  progressBarFill: { height: 6, backgroundColor: '#1D6296', borderRadius: 3 },
  progressPct: { fontSize: 11, color: '#1D6296', fontWeight: '600', paddingHorizontal: 16, marginBottom: 16, textAlign: 'right' },
  questionScroll: { flex: 1, paddingHorizontal: 16 },
  questionText: { fontSize: 18, fontWeight: '600', color: '#111827', lineHeight: 28, marginBottom: 24 },
  optionsList: { gap: 10 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  optionBtnSelected: { backgroundColor: '#1D6296', borderColor: '#1D6296' },
  optionText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  optionTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  prevBtnText: { fontSize: 14, color: '#374151', fontWeight: '500', marginLeft: 4 },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#1D6296',
  },
  nextBtnDisabled: { backgroundColor: '#E5E7EB' },
  nextBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  resultHeader: { alignItems: 'center', marginBottom: 24, gap: 8 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  resultSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  scoreCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    marginBottom: 20,
    gap: 8,
  },
  scoreLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValue: { fontSize: 56, fontWeight: '900', lineHeight: 64 },
  severityPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  severityPillText: { fontSize: 14, fontWeight: '700' },
  highRiskPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  highRiskPillText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  highRiskAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    marginBottom: 20,
  },
  highRiskAlertText: { fontSize: 13, color: '#991B1B', lineHeight: 20, flex: 1 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#1D6296',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  pdfBtnText: { color: '#1D6296', fontWeight: '600', fontSize: 14 },
  secondaryBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '500', fontSize: 14 },
})
