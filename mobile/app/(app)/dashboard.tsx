import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { useIsRTL } from '@/lib/hooks'
import { useAppLocale } from '@/lib/LocaleContext'
import { t } from '@/lib/i18n'
import { getMoodColor, getSeverityColor } from '@/lib/theme'
import type { AssessmentSubmission, AssessmentDefinition, MoodLog } from '@/lib/types'

const AI_TIPS = [
  'Take 5 deep breaths when you feel overwhelmed. Slow breathing activates your parasympathetic nervous system.',
  'Even 10 minutes of walking can significantly improve your mood and reduce stress levels.',
  'Writing down 3 things you are grateful for each morning rewires your brain toward positivity.',
  'Quality sleep is the foundation of mental health. Try a consistent bedtime routine tonight.',
  'Social connection is a core human need. Reach out to someone you care about today.',
  'Mindfulness is simply paying attention to the present moment without judgment. Try it for 2 minutes.',
  'Your feelings are valid. You do not need to justify why you feel the way you feel.',
]

export default function DashboardScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { lang } = useAppLocale()
  const isRTL = useIsRTL(lang)

  const [submissions, setSubmissions] = useState<(AssessmentSubmission & {
    definition: Pick<AssessmentDefinition, 'name_en' | 'name_ar'>
  })[]>([])
  const [lastMood, setLastMood] = useState<MoodLog | null>(null)
  const [loading, setLoading] = useState(true)

  const displayName = profile?.full_name_en?.split(' ')[0] ?? 'there'
  const dayOfWeek = new Date().getDay()
  const aiTip = AI_TIPS[dayOfWeek % AI_TIPS.length]

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [submissionsRes, moodRes] = await Promise.all([
        supabase
          .from('assessment_submissions')
          .select('*, definition:assessment_definitions(name_en, name_ar)')
          .eq('patient_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(5),
        supabase
          .from('mood_logs')
          .select('*')
          .eq('patient_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .single(),
      ])

      setSubmissions((submissionsRes.data as any) || [])
      setLastMood(moodRes.data as MoodLog | null)
      setLoading(false)
    })()
  }, [])

  const moodEmojis = ['😞', '😔', '😐', '🙂', '😊']
  const moodLabels = [
    t('veryBad', lang),
    t('bad', lang),
    t('okay', lang),
    t('good', lang),
    t('great', lang),
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.welcomeText, isRTL && styles.rtlText]}>
              {t('welcomeMessage', lang, { name: displayName })}
            </Text>
            <Text style={[styles.subtitleText, isRTL && styles.rtlText]}>
              {t('howAreYouFeeling', lang)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings')}
            style={styles.settingsBtn}
          >
            <Ionicons name="settings-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Wellbeing Summary Card */}
        {lastMood && (
          <View style={[styles.wellbeingCard, { borderLeftColor: getMoodColor(lastMood.mood_score) }]}>
            <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>
              {t('wellbeingSummary', lang)}
            </Text>
            <View style={[styles.moodRow, isRTL && styles.rtlRow]}>
              <Text style={styles.moodEmoji}>{moodEmojis[lastMood.mood_score - 1]}</Text>
              <View style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={[styles.moodLabel, isRTL && styles.rtlText]}>
                  {moodLabels[lastMood.mood_score - 1]}
                </Text>
                <Text style={[styles.moodDate, isRTL && styles.rtlText]}>
                  {new Date(lastMood.logged_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {lang === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/assessments/index')}
            style={[styles.actionCard, { backgroundColor: '#1D6296' }]}
          >
            <Ionicons name="clipboard-outline" size={24} color="#FFFFFF" />
            <Text style={[styles.actionLabel, { color: '#FFFFFF' }, isRTL && styles.rtlText]}>
              {t('takeAssessment', lang)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(app)/mood')}
            style={[styles.actionCard, { backgroundColor: '#FEF0E7', borderWidth: 1, borderColor: '#F3650A' }]}
          >
            <Ionicons name="heart-outline" size={24} color="#F3650A" />
            <Text style={[styles.actionLabel, { color: '#F3650A' }, isRTL && styles.rtlText]}>
              {t('logMood', lang)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(app)/ai')}
            style={[styles.actionCard, { backgroundColor: '#EBF4FA', borderWidth: 1, borderColor: '#1D6296' }]}
          >
            <Ionicons name="sparkles-outline" size={24} color="#1D6296" />
            <Text style={[styles.actionLabel, { color: '#1D6296' }, isRTL && styles.rtlText]}>
              {t('aiTitle', lang)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(app)/resources/index')}
            style={[styles.actionCard, { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#22C55E' }]}
          >
            <Ionicons name="library-outline" size={24} color="#16A34A" />
            <Text style={[styles.actionLabel, { color: '#16A34A' }, isRTL && styles.rtlText]}>
              {t('resources', lang)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI Tip */}
        <View style={styles.tipCard}>
          <View style={[styles.tipHeader, isRTL && styles.rtlRow]}>
            <Ionicons name="sparkles" size={16} color="#1D6296" />
            <Text style={[styles.tipTitle, isRTL && styles.rtlText, { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>
              {t('aiTip', lang)}
            </Text>
          </View>
          <Text style={[styles.tipBody, isRTL && styles.rtlText]}>{aiTip}</Text>
        </View>

        {/* Recent Assessments */}
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {t('recentAssessments', lang)}
        </Text>

        {loading ? (
          <ActivityIndicator color="#1D6296" style={{ marginTop: 16 }} />
        ) : submissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={40} color="#D1D5DB" />
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              {t('noAssessments', lang)}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/assessments/index')}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>{t('browseAssessments', lang)}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.submissionList}>
            {submissions.map(sub => {
              const severityColor = sub.severity_band ? getSeverityColor(sub.severity_band) : '#6B7280'
              const name = lang === 'ar' ? (sub.definition as any)?.name_ar || sub.definition?.name_en : sub.definition?.name_en
              return (
                <View key={sub.id} style={styles.submissionCard}>
                  <View style={[styles.submissionRow, isRTL && styles.rtlRow]}>
                    <Text style={[styles.submissionName, isRTL && styles.rtlText]} numberOfLines={1}>
                      {name}
                    </Text>
                    {sub.high_risk_flag && (
                      <View style={styles.highRiskBadge}>
                        <Text style={styles.highRiskText}>{t('highRisk', lang)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.submissionMeta, isRTL && styles.rtlRow]}>
                    <Text style={[styles.submissionScore, isRTL && styles.rtlText]}>
                      {t('score', lang)}: {sub.total_score}
                    </Text>
                    {sub.severity_band && (
                      <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
                        <Text style={[styles.severityText, { color: severityColor }]}>
                          {sub.severity_band}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.submissionDate, isRTL && styles.rtlText]}>
                    {new Date(sub.submitted_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  welcomeText: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitleText: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  settingsBtn: { padding: 8 },
  wellbeingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  moodRow: { flexDirection: 'row', alignItems: 'center' },
  moodEmoji: { fontSize: 32 },
  moodLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  moodDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tipCard: {
    backgroundColor: '#EBF4FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#1D6296' },
  tipBody: { fontSize: 14, color: '#374151', lineHeight: 21 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#1D6296',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  submissionList: { gap: 12 },
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  submissionName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  highRiskBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  highRiskText: { color: '#DC2626', fontSize: 11, fontWeight: '600' },
  submissionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  submissionScore: { fontSize: 13, color: '#6B7280' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  severityText: { fontSize: 11, fontWeight: '600' },
  submissionDate: { fontSize: 12, color: '#9CA3AF' },
})
