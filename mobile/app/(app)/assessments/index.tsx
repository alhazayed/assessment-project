import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import type { AssessmentDefinition } from '@/lib/types'

interface AssessmentSession {
  id: string
  definition_id: string
  status: string
}

const CATEGORIES = [
  { key: 'all' },
  { key: 'Mental Health' },
  { key: 'Wellbeing' },
  { key: 'Personality' },
  { key: 'Cognitive' },
]

export default function AssessmentsListScreen() {
  const router = useRouter()
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)

  const [definitions, setDefinitions] = useState<AssessmentDefinition[]>([])
  const [sessions, setSessions] = useState<AssessmentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [defsRes, sessionsRes] = await Promise.all([
        supabase
          .from('assessment_definitions')
          .select('*')
          .eq('is_active', true)
          .order('name_en'),
        user
          ? supabase
              .from('assessment_sessions')
              .select('id, definition_id, status')
              .eq('patient_id', user.id)
              .eq('status', 'in_progress')
          : Promise.resolve({ data: [] }),
      ])
      setDefinitions(defsRes.data || [])
      setSessions((sessionsRes.data as AssessmentSession[]) || [])
      setLoading(false)
    })()
  }, [])

  const inProgressDefs = definitions.filter(def =>
    sessions.some(s => s.definition_id === def.id)
  )

  const filteredDefs = definitions.filter(def => {
    const name = lang === 'ar' ? def.name_ar : def.name_en
    const matchesSearch = search.trim() === '' || name.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  function getSession(defId: string) {
    return sessions.find(s => s.definition_id === defId)
  }

  function handleStart(defId: string) {
    router.push(`/(app)/assessments/${defId}` as any)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>
          {t('assessmentsTitle', lang)}
        </Text>

        {/* Search */}
        <View style={[styles.searchRow, isRTL && styles.rtlRow]}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlText]}
            placeholder={t('searchPlaceholder', lang)}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setActiveCategory(cat.key)}
                style={[
                  styles.categoryChip,
                  activeCategory === cat.key && styles.categoryChipActive,
                ]}
              >
                <Text style={[
                  styles.categoryChipText,
                  activeCategory === cat.key && styles.categoryChipTextActive,
                ]}>
                  {cat.key === 'all' ? t('allCategories', lang) : cat.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#1D6296" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* In Progress */}
            {inProgressDefs.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>
                  {t('inProgress', lang)}
                </Text>
                <View style={styles.defList}>
                  {inProgressDefs.map(def => {
                    const name = lang === 'ar' ? def.name_ar : def.name_en
                    const desc = lang === 'ar' ? def.description_ar : def.description_en
                    return (
                      <View key={def.id} style={[styles.defCard, styles.inProgressCard]}>
                        <View style={styles.inProgressBadge}>
                          <Text style={styles.inProgressBadgeText}>{t('inProgress', lang)}</Text>
                        </View>
                        <Text style={[styles.defName, isRTL && styles.rtlText]}>{name}</Text>
                        {desc && (
                          <Text style={[styles.defDesc, isRTL && styles.rtlText]} numberOfLines={2}>
                            {desc}
                          </Text>
                        )}
                        <View style={[styles.defMeta, isRTL && styles.rtlRow]}>
                          <View style={[styles.metaItem, isRTL && styles.rtlRow]}>
                            <Ionicons name="help-circle-outline" size={14} color="#6B7280" />
                            <Text style={styles.metaText}>
                              {t('questions', lang, { count: def.total_questions })}
                            </Text>
                          </View>
                          <View style={[styles.metaItem, isRTL && styles.rtlRow]}>
                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                            <Text style={styles.metaText}>
                              {t('estimatedTime', lang, { min: Math.ceil(def.total_questions * 0.5) })}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleStart(def.id)}
                          style={[styles.startBtn, { backgroundColor: '#F3650A' }]}
                        >
                          <Text style={styles.startBtnText}>{t('resumeAssessment', lang)}</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </View>
              </>
            )}

            {/* Available */}
            <Text style={[styles.sectionLabel, isRTL && styles.rtlText]}>
              {t('available', lang)}
            </Text>
            {filteredDefs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={48} color="#D1D5DB" />
                <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
                  {lang === 'ar' ? 'لا توجد تقييمات متاحة' : 'No assessments found'}
                </Text>
              </View>
            ) : (
              <View style={styles.defList}>
                {filteredDefs.map(def => {
                  const name = lang === 'ar' ? def.name_ar : def.name_en
                  const desc = lang === 'ar' ? def.description_ar : def.description_en
                  const hasSession = getSession(def.id)

                  return (
                    <View key={def.id} style={styles.defCard}>
                      <View style={[styles.cardHeaderRow, isRTL && styles.rtlRow]}>
                        <Text style={[styles.defName, isRTL && styles.rtlText, { flex: 1 }]} numberOfLines={2}>
                          {name}
                        </Text>
                      </View>
                      {desc && (
                        <Text style={[styles.defDesc, isRTL && styles.rtlText]} numberOfLines={2}>
                          {desc}
                        </Text>
                      )}
                      <View style={[styles.defMeta, isRTL && styles.rtlRow]}>
                        <View style={[styles.metaItem, isRTL && styles.rtlRow]}>
                          <Ionicons name="help-circle-outline" size={14} color="#6B7280" />
                          <Text style={styles.metaText}>
                            {t('questions', lang, { count: def.total_questions })}
                          </Text>
                        </View>
                        <View style={[styles.metaItem, isRTL && styles.rtlRow]}>
                          <Ionicons name="time-outline" size={14} color="#6B7280" />
                          <Text style={styles.metaText}>
                            {t('estimatedTime', lang, { min: Math.ceil(def.total_questions * 0.5) })}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleStart(def.id)}
                        style={[
                          styles.startBtn,
                          hasSession ? { backgroundColor: '#F3650A' } : { backgroundColor: '#1D6296' },
                        ]}
                      >
                        <Text style={styles.startBtnText}>
                          {hasSession ? t('resumeAssessment', lang) : t('startAssessment', lang)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}
          </>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },
  categoryScroll: { marginBottom: 20 },
  categoryRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: { backgroundColor: '#EBF4FA', borderColor: '#1D6296' },
  categoryChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  categoryChipTextActive: { color: '#1D6296', fontWeight: '700' },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  defList: { gap: 12, marginBottom: 24 },
  defCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inProgressCard: { borderColor: '#F3650A', borderWidth: 1.5 },
  inProgressBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF0E7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
  },
  inProgressBadgeText: { color: '#F3650A', fontSize: 11, fontWeight: '700' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  defName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6, lineHeight: 21 },
  defDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 12 },
  defMeta: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  startBtn: { paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  startBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
})
