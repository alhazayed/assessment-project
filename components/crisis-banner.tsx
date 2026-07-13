'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, X } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import CrisisResources from '@/components/crisis-resources'

export default function CrisisBanner({ lang }: { lang: Lang }) {
  const supabase = useMemo(() => createClient(), [])
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
  }, [supabase])

  if (!show || dismissed) return null

  return (
    <div className="rounded-xl border-2 border-accent-500 bg-accent-50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent-500">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <CrisisResources lang={lang} />
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label={isAr ? 'إغلاق التنبيه' : 'Dismiss warning'}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
