'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, X, Phone, ExternalLink } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

const CRISIS_LINES = [
  { country_en: 'Saudi Arabia', country_ar: 'المملكة العربية السعودية', number: '920033360' },
  { country_en: 'UAE',          country_ar: 'الإمارات',                  number: '800HOPE (4673)' },
  { country_en: 'International', country_ar: 'دولي',                    number: '+1-800-273-8255' },
]

export default function CrisisBanner({ lang }: { lang: Lang }) {
  const supabase = createClient()
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const isAr = lang === 'ar'

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('assessment_submissions')
        .select('id')
        .eq('patient_id', user.id)
        .eq('high_risk_flag', true)
        .gte('submitted_at', since)
        .limit(1)

      if (data && data.length > 0) setShow(true)
    }
    check()
  }, [])

  if (!show || dismissed) return null

  return (
    <div className="rounded-xl border-2 p-4 mb-6" style={{ backgroundColor: '#FEF2EC', borderColor: '#F3650A' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3650A' }}>
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 mb-0.5">{t('crisis.title', lang)}</p>
          <p className="text-sm text-gray-600 mb-3">{t('crisis.body', lang)}</p>
          <div className="flex flex-wrap gap-2">
            {CRISIS_LINES.map(line => (
              <a
                key={line.number}
                href={`tel:${line.number.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#F3650A' }}
              >
                <Phone className="w-3 h-3" />
                {isAr ? line.country_ar : line.country_en} · {line.number}
              </a>
            ))}
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: '#1D6296', color: 'white' }}
            >
              <ExternalLink className="w-3 h-3" />
              {t('crisis.more', lang)}
            </a>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
