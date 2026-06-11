'use client'

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Activity } from 'lucide-react'

type ScoreEntry = {
  submitted_at: string
  total_score: number
  assessment_definitions: { name_en: string; name_ar: string; code: string } | null
}

type DomainConfig = {
  en: string
  ar: string
}

type ScaleRadarConfig = {
  domain: string
  minScore: number
  maxScore: number
  higherIsBetter: boolean
}

const DOMAINS: Record<string, DomainConfig> = {
  'Depression':    { en: 'Depression',    ar: 'الاكتئاب' },
  'Anxiety':       { en: 'Anxiety',       ar: 'القلق' },
  'Stress':        { en: 'Stress',        ar: 'التوتر' },
  'Sleep':         { en: 'Sleep',         ar: 'النوم' },
  'Resilience':    { en: 'Resilience',    ar: 'المرونة' },
  'Wellbeing':     { en: 'Wellbeing',     ar: 'الرفاهية' },
  'Trauma':        { en: 'Trauma',        ar: 'الصدمة' },
  'Social':        { en: 'Social',        ar: 'الاجتماعي' },
  'Burnout':       { en: 'Burnout',       ar: 'الإرهاق' },
  'Mindfulness':   { en: 'Mindfulness',   ar: 'اليقظة' },
  'Emotion Reg.':  { en: 'Emotion Reg.',  ar: 'المشاعر' },
  'Eating':        { en: 'Eating',        ar: 'الأكل' },
  'Substance':     { en: 'Substance',     ar: 'المواد' },
  'ADHD':          { en: 'ADHD',          ar: 'فرط الحركة' },
  'OCD':           { en: 'OCD',           ar: 'الوسواس' },
  'Mood':          { en: 'Mood',          ar: 'المزاج' },
  'Somatic':       { en: 'Somatic',       ar: 'الجسدي' },
}

const SCALE_CONFIG: Record<string, ScaleRadarConfig> = {
  PHQ9:   { domain: 'Depression',   minScore: 0,   maxScore: 27,  higherIsBetter: false },
  PHQ15:  { domain: 'Somatic',      minScore: 0,   maxScore: 30,  higherIsBetter: false },
  CESD:   { domain: 'Depression',   minScore: 0,   maxScore: 60,  higherIsBetter: false },
  GDS15:  { domain: 'Depression',   minScore: 0,   maxScore: 15,  higherIsBetter: false },
  GAD7:   { domain: 'Anxiety',      minScore: 0,   maxScore: 21,  higherIsBetter: false },
  ASI3:   { domain: 'Anxiety',      minScore: 0,   maxScore: 72,  higherIsBetter: false },
  PDSS:   { domain: 'Anxiety',      minScore: 0,   maxScore: 28,  higherIsBetter: false },
  PSWQ:   { domain: 'Anxiety',      minScore: 16,  maxScore: 80,  higherIsBetter: false },
  DASS21: { domain: 'Stress',       minScore: 0,   maxScore: 126, higherIsBetter: false },
  PSS10:  { domain: 'Stress',       minScore: 0,   maxScore: 40,  higherIsBetter: false },
  PSS4:   { domain: 'Stress',       minScore: 0,   maxScore: 16,  higherIsBetter: false },
  K10:    { domain: 'Stress',       minScore: 10,  maxScore: 50,  higherIsBetter: false },
  ISI:    { domain: 'Sleep',        minScore: 0,   maxScore: 28,  higherIsBetter: false },
  BRS:    { domain: 'Resilience',   minScore: 6,   maxScore: 30,  higherIsBetter: true  },
  CDRISC: { domain: 'Resilience',   minScore: 0,   maxScore: 100, higherIsBetter: true  },
  WHO5:   { domain: 'Wellbeing',    minScore: 0,   maxScore: 100, higherIsBetter: true  },
  WHOQOL: { domain: 'Wellbeing',    minScore: 26,  maxScore: 130, higherIsBetter: true  },
  SWLS:   { domain: 'Wellbeing',    minScore: 5,   maxScore: 35,  higherIsBetter: true  },
  RSES:   { domain: 'Wellbeing',    minScore: 0,   maxScore: 30,  higherIsBetter: true  },
  PCL5:   { domain: 'Trauma',       minScore: 0,   maxScore: 80,  higherIsBetter: false },
  IESR:   { domain: 'Trauma',       minScore: 0,   maxScore: 75,  higherIsBetter: false },
  ACE:    { domain: 'Trauma',       minScore: 0,   maxScore: 10,  higherIsBetter: false },
  LSAS:   { domain: 'Social',       minScore: 0,   maxScore: 144, higherIsBetter: false },
  SPIN:   { domain: 'Social',       minScore: 0,   maxScore: 72,  higherIsBetter: false },
  UCLA:   { domain: 'Social',       minScore: 3,   maxScore: 9,   higherIsBetter: false },
  OLBI:   { domain: 'Burnout',      minScore: 16,  maxScore: 64,  higherIsBetter: false },
  FFMQ:   { domain: 'Mindfulness',  minScore: 39,  maxScore: 195, higherIsBetter: true  },
  DERS:   { domain: 'Emotion Reg.', minScore: 36,  maxScore: 180, higherIsBetter: false },
  EAT26:  { domain: 'Eating',       minScore: 0,   maxScore: 78,  higherIsBetter: false },
  AUDIT:  { domain: 'Substance',    minScore: 0,   maxScore: 40,  higherIsBetter: false },
  CAGE:   { domain: 'Substance',    minScore: 0,   maxScore: 4,   higherIsBetter: false },
  ASRS:   { domain: 'ADHD',         minScore: 0,   maxScore: 72,  higherIsBetter: false },
  OCIR:   { domain: 'OCD',          minScore: 0,   maxScore: 72,  higherIsBetter: false },
  MDQ:    { domain: 'Mood',         minScore: 0,   maxScore: 13,  higherIsBetter: false },
  ASRM:   { domain: 'Mood',         minScore: 0,   maxScore: 20,  higherIsBetter: false },
}

function toWellness(score: number, cfg: ScaleRadarConfig): number {
  const range = cfg.maxScore - cfg.minScore
  if (range === 0) return 50
  const raw = cfg.higherIsBetter
    ? (score - cfg.minScore) / range
    : (cfg.maxScore - score) / range
  return Math.round(Math.min(1, Math.max(0, raw)) * 100)
}

type RadarPoint = { domain: string; wellness: number; fullMark: number }

function buildRadarData(scoreHistory: ScoreEntry[], isAr: boolean): RadarPoint[] {
  const seenCodes = new Set<string>()
  const latestPerCode: Record<string, number> = {}

  for (const s of [...scoreHistory].reverse()) {
    const code = s.assessment_definitions?.code
    if (!code || seenCodes.has(code)) continue
    seenCodes.add(code)
    latestPerCode[code] = s.total_score
  }

  const domainScores: Record<string, number[]> = {}

  for (const [code, score] of Object.entries(latestPerCode)) {
    const cfg = SCALE_CONFIG[code]
    if (!cfg) continue
    const wellness = toWellness(score, cfg)
    if (!domainScores[cfg.domain]) domainScores[cfg.domain] = []
    domainScores[cfg.domain].push(wellness)
  }

  return Object.entries(domainScores)
    .filter(([, scores]) => scores.length > 0)
    .map(([domainKey, scores]) => ({
      domain: isAr ? (DOMAINS[domainKey]?.ar ?? domainKey) : (DOMAINS[domainKey]?.en ?? domainKey),
      wellness: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      fullMark: 100,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain))
}

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{ value: number; payload: RadarPoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { domain, wellness } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700">{domain}</p>
      <p className="text-gray-500">Wellness: <span className="font-bold text-gray-900">{wellness}%</span></p>
    </div>
  )
}

export default function MentalHealthRadar({ scoreHistory, isAr }: { scoreHistory: ScoreEntry[]; isAr: boolean }) {
  const data = buildRadarData(scoreHistory, isAr)

  if (data.length < 3) return null

  const avgWellness = Math.round(data.reduce((s, d) => s + d.wellness, 0) / data.length)
  const wellnessColor = avgWellness >= 70 ? '#16A34A' : avgWellness >= 45 ? '#D97706' : '#DC2626'

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">
            {isAr ? 'خريطة الصحة النفسية' : 'Mental Health Radar'}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: wellnessColor }}>{avgWellness}%</p>
          <p className="text-[10px] text-gray-400">{isAr ? 'متوسط الرفاهية' : 'Avg. Wellness'}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="domain"
            tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            tickCount={4}
          />
          <Radar
            name={isAr ? 'الرفاهية' : 'Wellness'}
            dataKey="wellness"
            stroke="#1D6296"
            fill="#1D6296"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-gray-400 text-center mt-2">
        {isAr
          ? `يعتمد على ${data.length} مجالات من تقييماتك الأخيرة. 100% = رفاهية مثلى.`
          : `Based on ${data.length} domains from your most recent assessments. 100% = optimal wellness.`}
      </p>
    </div>
  )
}
