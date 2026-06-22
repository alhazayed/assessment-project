import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { getMoodColor } from '@/lib/theme'
import type { MoodLog } from '@/lib/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 64
const CHART_HEIGHT = 100
const BAR_WIDTH = CHART_WIDTH / 7 - 8

const MOOD_EMOJIS = ['😞', '😔', '😐', '🙂', '😊']
const DAY_ABBR_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_ABBR_AR = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت']

function MoodTrendChart({ logs, lang }: { logs: MoodLog[]; lang: string }) {
  const today = new Date()
  const dayLabels = lang === 'ar' ? DAY_ABBR_AR : DAY_ABBR_EN

  // Build last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })

  const dayData = days.map(day => {
    const dateStr = day.toISOString().slice(0, 10)
    const log = logs.find(l => l.logged_at.slice(0, 10) === dateStr)
    return {
      label: dayLabels[day.getDay()],
      score: log?.mood_score ?? null,
    }
  })

  return (
    <View style={styles.chartWrapper}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 32}>
        {dayData.map((day, idx) => {
          const x = idx * (CHART_WIDTH / 7) + 4
          const barHeight = day.score ? (day.score / 5) * CHART_HEIGHT : 0
          const y = CHART_HEIGHT - barHeight
          const color = day.score ? getMoodColor(day.score) : '#E5E7EB'

          return (
            <G key={idx}>
              {/* Background bar */}
              <Rect
                x={x}
                y={0}
                width={BAR_WIDTH}
                height={CHART_HEIGHT}
                rx={4}
                fill="#F3F4F6"
              />
              {/* Filled bar */}
              {day.score && (
                <Rect
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={barHeight}
                  rx={4}
                  fill={color}
                />
              )}
              {/* Day label */}
              <SvgText
                x={x + BAR_WIDTH / 2}
                y={CHART_HEIGHT + 20}
                fontSize="10"
                fill="#9CA3AF"
                textAnchor="middle"
              >
                {day.label}
              </SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

export default function MoodScreen() {
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)

  const [mood, setMood] = useState(3)
  const [anxiety, setAnxiety] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [notes, setNotes] = useState('')
  const [logs, setLogs] = useState<MoodLog[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const moodLabels = [
    t('veryBad', lang),
    t('bad', lang),
    t('okay', lang),
    t('good', lang),
    t('great', lang),
  ]

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('patient_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(14)
      setLogs(data || [])
      setLoading(false)
    })()
  }, [saved])

  async function handleLog() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('mood_logs').insert({
      patient_id: user.id,
      mood_score: mood,
      anxiety_score: anxiety,
      energy_score: energy,
      notes: notes.trim() || null,
    })
    setNotes('')
    setSaving(false)
    setSaved(s => !s)
  }

  const recentLogs = logs.slice(0, 7)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>
          {t('moodTitle', lang)}
        </Text>

        {/* Log card */}
        <View style={styles.logCard}>
          <Text style={[styles.cardTitle, isRTL && styles.rtlText]}>
            {t('howAreYouFeeling', lang)}
          </Text>

          {/* Mood selector */}
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('moodLabel', lang)}
          </Text>
          <View style={[styles.emojiRow, isRTL && styles.rtlRow]}>
            {[1, 2, 3, 4, 5].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setMood(v)}
                style={styles.emojiBtn}
              >
                <Text style={[styles.emoji, { opacity: mood === v ? 1 : 0.35 }]}>
                  {MOOD_EMOJIS[v - 1]}
                </Text>
                <Text style={[
                  styles.emojiLabel,
                  { color: mood === v ? '#1D6296' : '#9CA3AF' },
                  isRTL && styles.rtlText,
                ]}>
                  {moodLabels[v - 1]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Anxiety level */}
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('anxietyLevel', lang)}
          </Text>
          <View style={[styles.levelRow, isRTL && styles.rtlRow]}>
            {[1, 2, 3, 4, 5].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setAnxiety(v)}
                style={[styles.levelBtn, anxiety === v && styles.levelBtnActive]}
              >
                <Text style={[styles.levelBtnText, anxiety === v && styles.levelBtnTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Energy level */}
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('energyLevel', lang)}
          </Text>
          <View style={[styles.levelRow, isRTL && styles.rtlRow]}>
            {[1, 2, 3, 4, 5].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setEnergy(v)}
                style={[
                  styles.levelBtn,
                  energy === v && { backgroundColor: '#F3650A', borderColor: '#F3650A' },
                ]}
              >
                <Text style={[
                  styles.levelBtnText,
                  energy === v && { color: '#FFFFFF' },
                ]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[styles.fieldLabel, isRTL && styles.rtlText]}>
            {t('notes', lang)}
          </Text>
          <TextInput
            style={[styles.notesInput, isRTL && styles.rtlText]}
            placeholder={t('notesPlaceholder', lang)}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />

          <TouchableOpacity
            onPress={handleLog}
            disabled={saving}
            style={styles.logBtn}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.logBtnText}>{t('logMoodBtn', lang)}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* 7-day trend chart */}
        {logs.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('moodTrend', lang)}
            </Text>
            <MoodTrendChart logs={logs} lang={lang} />
          </View>
        )}

        {/* History */}
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {t('recentEntries', lang)}
        </Text>

        {loading ? (
          <ActivityIndicator color="#1D6296" />
        ) : recentLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              {t('noLogs', lang)}
            </Text>
          </View>
        ) : (
          <View style={styles.logList}>
            {recentLogs.map(log => (
              <View key={log.id} style={[styles.logEntry, isRTL && styles.rtlRow]}>
                <Text style={styles.logEmoji}>{MOOD_EMOJIS[log.mood_score - 1]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.logMoodLabel, isRTL && styles.rtlText]}>
                    {moodLabels[log.mood_score - 1]}
                  </Text>
                  {log.notes && (
                    <Text style={[styles.logNotes, isRTL && styles.rtlText]} numberOfLines={1}>
                      {log.notes}
                    </Text>
                  )}
                  <View style={[styles.logMetaRow, isRTL && styles.rtlRow]}>
                    <Text style={styles.logDate}>
                      {new Date(log.logged_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </Text>
                    {log.energy_score && (
                      <Text style={styles.logMeta}>
                        {lang === 'ar' ? `طاقة: ${log.energy_score}` : `Energy: ${log.energy_score}`}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.moodDot, { backgroundColor: getMoodColor(log.mood_score) }]} />
              </View>
            ))}
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
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  emojiBtn: { alignItems: 'center', gap: 3 },
  emoji: { fontSize: 30 },
  emojiLabel: { fontSize: 10, textAlign: 'center' },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  levelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  levelBtnActive: { backgroundColor: '#1D6296', borderColor: '#1D6296' },
  levelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  levelBtnTextActive: { color: '#FFFFFF' },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
    minHeight: 80,
  },
  logBtn: {
    backgroundColor: '#F3650A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartWrapper: { alignItems: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', fontSize: 14 },
  logList: { gap: 10 },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logEmoji: { fontSize: 28 },
  logMoodLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  logNotes: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logMetaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  logDate: { fontSize: 11, color: '#9CA3AF' },
  logMeta: { fontSize: 11, color: '#9CA3AF' },
  moodDot: { width: 10, height: 10, borderRadius: 5 },
})
