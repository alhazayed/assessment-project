'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame, TrendingUp, Calendar, BarChart2 } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import MentalHealthRadar from '@/components/mental-health-radar'

type MoodLog = {
  log_date: string
  mood_score: number
  anxiety_score: number
  sleep_hours: number | null
}

type ScoreHistory = {
  submitted_at: string
  total_score: number
  severity_band: string
  assessment_definitions: { name_en: string; name_ar: string; code: string } | null
}

const MOOD_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981']
const MOOD_LABELS_EN = ['Very Low', 'Low', 'Okay', 'Good', 'Great']
const MOOD_LABELS_AR = ['منخفض جداً', 'منخفض', 'مقبول', 'جيد', 'ممتاز']

function moodColor(score: number) {
  if (score <= 2) return MOOD_COLORS[0]
  if (score <= 4) return MOOD_COLORS[1]
  if (score <= 6) return MOOD_COLORS[2]
  if (score <= 8) return MOOD_COLORS[3]
  return MOOD_COLORS[4]
}

function calcStreak(logs: MoodLog[]): number {
  if (!logs.length) return 0
  const dates = new Set(logs.map(l => l.log_date))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (dates.has(key)) { streak++ } else if (i > 0) break
  }
  return streak
}

function getLast30Days() {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export default function InsightsPage() {
  const supabase = createClient()
  const lang = useLang()
  const isAr = lang === 'ar'

  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([])
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssessmentCode, setSelectedAssessmentCode] = useState<string>('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const [moodRes, scoreRes] = await Promise.all([
        supabase.from('mood_logs').select('log_date, mood_score, anxiety_score, sleep_hours')
          .eq('patient_id', user.id).gte('log_date', since90.split('T')[0]).order('log_date'),
        supabase.from('assessment_submissions')
          .select('submitted_at, total_score, severity_band, assessment_definitions(name_en, name_ar, code)')
          .eq('patient_id', user.id).order('submitted_at').limit(100),
      ])
      const logs = (moodRes.data || []) as MoodLog[]
      const scores = (scoreRes.data || []) as unknown as ScoreHistory[]
      setMoodLogs(logs)
      setScoreHistory(scores)

      // Fire rescreening check in background
      fetch('/api/check-rescreening', { method: 'POST' }).catch(() => {})

      // Default to first assessment with multiple entries
      const codes = Array.from(new Set(scores.map(s => s.assessment_definitions?.code).filter((c): c is string => Boolean(c))))
      const firstWithMultiple = codes.find(code => scores.filter(s => s.assessment_definitions?.code === code).length > 1)
      setSelectedAssessmentCode(firstWithMultiple ?? codes[0] ?? '')
      setLoading(false)
    }
    load()
  }, [])

  const streak = calcStreak(moodLogs)
  const last30 = getLast30Days()
  const moodByDay = Object.fromEntries(
    moodLogs.map(l => [l.log_date, l.mood_score])
  )

  // Available assessments with enough data for a trend line
  const uniqueAssessments = Array.from(new Map(
    scoreHistory
      .filter(s => s.assessment_definitions)
      .map(s => [s.assessment_definitions!.code, s.assessment_definitions!])
  ).values())

  const trendData = scoreHistory.filter(s => s.assessment_definitions?.code === selectedAssessmentCode)

  const maxScore = trendData.length > 0 ? Math.max(...trendData.map(s => s.total_score)) : 1
  const minScore = trendData.length > 0 ? Math.min(...trendData.map(s => s.total_score)) : 0
  const scoreRange = maxScore - minScore || 1

  return (
    <div className="p-7 max-w-4xl">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('insights.title', lang)}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('insights.subtitle', lang)}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1D6296', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="space-y-6">

          {/* Mental Health Radar */}
          {scoreHistory.length > 0 && (
            <MentalHealthRadar scoreHistory={scoreHistory} isAr={isAr} />
          )}

          {/* Streak card */}
          <div className="card p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-accent-50">
              <Flame className="w-7 h-7 text-accent-500" />
            </div>
            <div>
              <p className="section-label mb-1">{t('insights.streak', lang)}</p>
              {streak > 0 ? (
                <p className="stat-value">
                  {streak} <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>{t('insights.streak.days', lang)}</span>
                </p>
              ) : (
                <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t('insights.streak.none', lang)}</p>
              )}
            </div>
          </div>

          {/* Mood calendar */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-icon)' }} />
              <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('insights.mood_cal', lang)}</h2>
              <span className="text-xs text-gray-400 ml-1">— {t('insights.last_30_days', lang)}</span>
            </div>

            {moodLogs.length === 0 ? (
              <p className="text-[13.5px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>{t('insights.no_mood', lang)}</p>
            ) : (
              <div className="grid grid-cols-10 gap-1.5">
                {last30.map(day => {
                  const score = moodByDay[day]
                  const color = score != null ? moodColor(score) : '#F3F4F6'
                  const label = score != null
                    ? (isAr ? MOOD_LABELS_AR : MOOD_LABELS_EN)[Math.min(4, Math.floor((score - 1) / 2))]
                    : (isAr ? 'لا يوجد' : 'No data')
                  return (
                    <div
                      key={day}
                      title={`${day}: ${label}${score != null ? ` (${score}/10)` : ''}`}
                      className="aspect-square rounded-md cursor-default transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                    />
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'أقل' : 'Less'}</span>
              {MOOD_COLORS.map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: c }} />
                  <span className="text-[10px] text-gray-400">{(isAr ? MOOD_LABELS_AR : MOOD_LABELS_EN)[i]}</span>
                </div>
              ))}
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{isAr ? 'أكثر' : 'More'}</span>
            </div>
          </div>

          {/* Score trend chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-icon)' }} />
                <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('insights.score_trend', lang)}</h2>
              </div>
              {uniqueAssessments.length > 1 && (
                <select
                  className="input text-xs py-1 max-w-48"
                  value={selectedAssessmentCode}
                  onChange={e => setSelectedAssessmentCode(e.target.value)}
                >
                  {uniqueAssessments.map(a => (
                    <option key={a.code} value={a.code}>
                      {isAr ? a.name_ar : a.name_en}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {scoreHistory.length === 0 ? (
              <p className="text-[13.5px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>{t('insights.no_scores', lang)}</p>
            ) : trendData.length < 2 ? (
              <p className="text-[13.5px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                {t('insights.trend_min_needed', lang)}
              </p>
            ) : (
              <div className="relative">
                {/* Simple SVG line chart */}
                <svg viewBox={`0 0 ${trendData.length * 60} 120`} className="w-full h-32" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 0.5, 1].map(pct => (
                    <line
                      key={pct}
                      x1={0} y1={pct * 100 + 10}
                      x2={trendData.length * 60} y2={pct * 100 + 10}
                      stroke="#F3F4F6" strokeWidth={1}
                    />
                  ))}
                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke="#1D6296"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={trendData.map((s, i) => {
                      const x = i * 60 + 30
                      const y = 110 - ((s.total_score - minScore) / scoreRange) * 90
                      return `${x},${y}`
                    }).join(' ')}
                  />
                  {/* Dots */}
                  {trendData.map((s, i) => {
                    const x = i * 60 + 30
                    const y = 110 - ((s.total_score - minScore) / scoreRange) * 90
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={5} fill="#1D6296" />
                        <circle cx={x} cy={y} r={3} fill="white" />
                        <text x={x} y={y - 10} textAnchor="middle" fontSize={9} fill="#6B7280">{s.total_score}</text>
                      </g>
                    )
                  })}
                </svg>
                {/* X-axis labels */}
                <div className="flex justify-between mt-1 px-1">
                  {trendData.map((s, i) => (
                    <span key={i} className="text-[10px] text-gray-400" style={{ width: `${100 / trendData.length}%`, textAlign: 'center' }}>
                      {new Date(s.submitted_at).toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short', day: 'numeric' })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent mood stats */}
          {moodLogs.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4" style={{ color: 'var(--text-icon)' }} />
                <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('insights.mood_stats', lang)}</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: t('insights.avg_mood', lang),
                    value: (moodLogs.reduce((s, l) => s + l.mood_score, 0) / moodLogs.length).toFixed(1),
                    unit: '/10',
                    color: '#1D6296',
                  },
                  {
                    label: t('insights.avg_anxiety', lang),
                    value: (moodLogs.reduce((s, l) => s + l.anxiety_score, 0) / moodLogs.length).toFixed(1),
                    unit: '/10',
                    color: '#F3650A',
                  },
                  {
                    label: t('insights.days_logged', lang),
                    value: new Set(moodLogs.map(l => l.log_date)).size,
                    unit: '',
                    color: '#12273C',
                  },
                ].map(stat => (
                  <div key={stat.label} className="p-4 rounded-[12px] text-center" style={{ backgroundColor: 'var(--surface-alt)' }}>
                    <p className="text-2xl font-extrabold" style={{ color: stat.color, letterSpacing: '-0.02em' }}>
                      {stat.value}<span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>{stat.unit}</span>
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
