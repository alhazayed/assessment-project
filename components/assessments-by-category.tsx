'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CloudRain, Zap, Wind, ShieldAlert, Sparkles,
  Moon, FlaskConical, MoreHorizontal, ChevronRight, Brain,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

type Assessment = {
  id: string
  code: string
  name_en: string
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  total_questions: number
}

interface Category {
  id: string
  labelEn: string
  labelAr: string
  icon: LucideIcon
  accent: string    // Tailwind bg+text for the tab active state
  badge: string     // badge chip on the card
  codes: string[]
}

const CATEGORIES: Category[] = [
  {
    id: 'mood',
    labelEn: 'Mood & Depression',
    labelAr: 'المزاج والاكتئاب',
    icon: CloudRain,
    accent: 'bg-blue-600 text-white',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    codes: ['PHQ9', 'GDS15', 'MDQ', 'DASS21', 'CESD', 'ASRM', 'PANAS'],
  },
  {
    id: 'anxiety',
    labelEn: 'Anxiety',
    labelAr: 'القلق',
    icon: Zap,
    accent: 'bg-purple-600 text-white',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    codes: ['GAD7', 'LSAS', 'OCIR', 'SPIN', 'PDSS', 'PSWQ', 'ASI3'],
  },
  {
    id: 'stress',
    labelEn: 'Stress',
    labelAr: 'الضغط النفسي',
    icon: Wind,
    accent: 'bg-orange-500 text-white',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    codes: ['PSS10', 'PSS4', 'K10'],
  },
  {
    id: 'trauma',
    labelEn: 'Trauma & PTSD',
    labelAr: 'الصدمة واضطراب ما بعد الصدمة',
    icon: ShieldAlert,
    accent: 'bg-red-600 text-white',
    badge: 'bg-red-50 text-red-700 border-red-200',
    codes: ['PCL5', 'IESR', 'ACE'],
  },
  {
    id: 'wellbeing',
    labelEn: 'Well-being',
    labelAr: 'الرفاهية وتقدير الذات',
    icon: Sparkles,
    accent: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    codes: ['WHO5', 'SWLS', 'RSES', 'BRS', 'CDRISC', 'WHOQOL', 'UCLA'],
  },
  {
    id: 'sleep',
    labelEn: 'Sleep',
    labelAr: 'النوم',
    icon: Moon,
    accent: 'bg-brand-600 text-white',
    badge: 'bg-brand-50 text-brand-700 border-brand-200',
    codes: ['ISI'],
  },
  {
    id: 'substance',
    labelEn: 'Substance Use',
    labelAr: 'تعاطي المواد',
    icon: FlaskConical,
    accent: 'bg-amber-500 text-white',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    codes: ['AUDIT', 'CAGE'],
  },
  {
    id: 'personality',
    labelEn: 'Personality & Mindfulness',
    labelAr: 'الشخصية واليقظة الذهنية',
    icon: Brain,
    accent: 'bg-violet-600 text-white',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    codes: ['BFI44', 'IPIP120', 'FFMQ', 'ECRR'],
  },
  {
    id: 'other',
    labelEn: 'Other',
    labelAr: 'أخرى',
    icon: MoreHorizontal,
    accent: 'bg-gray-700 text-white',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    codes: ['ASRS', 'EAT26', 'PHQ15', 'DERS', 'OLBI'],
  },
]

interface Props {
  assessments: Assessment[]
  lang: Lang
}

export default function AssessmentsByCategory({ assessments, lang }: Props) {
  const [activeId, setActiveId] = useState('mood')

  const isAr = lang === 'ar'
  const byCode = Object.fromEntries(assessments.map(a => [a.code, a]))

  const active = CATEGORIES.find(c => c.id === activeId)!
  const activeItems = active.codes.map(code => byCode[code]).filter(Boolean)

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = cat.id === activeId
          const count = cat.codes.filter(c => byCode[c]).length
          return (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                isActive
                  ? `${cat.accent} border-transparent shadow-sm`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {isAr ? cat.labelAr : cat.labelEn}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Assessment cards for active category */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[200px]">
        {activeItems.map(a => {
          const name = isAr && a.name_ar ? a.name_ar : a.name_en
          const description = isAr && a.description_ar ? a.description_ar : a.description_en
          return (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${active.badge}`}>
                  {isAr ? active.labelAr : active.labelEn}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md font-medium">
                  {a.total_questions}{t('assessments.questions', lang)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 leading-snug mb-2">{name}</h3>
              {description && (
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed flex-1">
                  {description}
                </p>
              )}
              <Link
                href={`/assessments/${a.id}`}
                className="mt-4 btn-primary text-xs px-4 py-2 self-start gap-1.5"
              >
                {t('assessments.start', lang)}
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )
        })}
      </div>

      {/* Browse all link */}
      <div className="mt-6 text-center">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          {t('assessments.section.sub.pre', lang)} {assessments.length} {t('assessments.section.sub.post', lang)}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
