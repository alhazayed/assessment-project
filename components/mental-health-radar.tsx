'use client'

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Activity } from 'lucide-react'
import { buildRadarData, type ScoreEntry, type RadarPoint } from '@/lib/radar/wellness'

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
