'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/use-lang'
import { Brain, Activity, ArrowRight, CheckCircle2 } from 'lucide-react'
import ScreeningDisclaimer from '@/components/screening-disclaimer'

type Def = { id: string; code: string; name_en: string; name_ar: string | null; total_questions: number }

const BASELINE_CODES = ['BFI44', 'IPIP120'] as const
const PULSE_CODES = ['WHO5', 'PSS4'] as const

/**
 * Personality baseline once → short wellbeing pulses afterward (Sprint D).
 */
export default function PersonalityBaselinePathPage() {
  const supabase = useMemo(() => createClient(), [])
  const lang = useLang()
  const isAr = lang === 'ar'
  const [defs, setDefs] = useState<Def[]>([])
  const [doneCodes, setDoneCodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const codes = [...BASELINE_CODES, ...PULSE_CODES]
      const [{ data: definitions }, { data: subs }] = await Promise.all([
        supabase
          .from('assessment_definitions')
          .select('id, code, name_en, name_ar, total_questions')
          .eq('is_active', true)
          .in('code', codes),
        supabase
          .from('assessment_submissions')
          .select('assessment_definitions(code)')
          .eq('patient_id', user.id),
      ])
      setDefs((definitions as Def[]) || [])
      const done = new Set<string>()
      for (const s of subs || []) {
        const join = (s as unknown as { assessment_definitions?: { code: string } | { code: string }[] | null }).assessment_definitions
        const code = Array.isArray(join) ? join[0]?.code : join?.code
        if (code) done.add(code)
      }
      setDoneCodes(done)
      setLoading(false)
    }
    load()
  }, [supabase])

  const baseline = BASELINE_CODES.map(c => defs.find(d => d.code === c)).filter(Boolean) as Def[]
  const pulses = PULSE_CODES.map(c => defs.find(d => d.code === c)).filter(Boolean) as Def[]
  const hasBaseline = BASELINE_CODES.some(c => doneCodes.has(c))

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          {isAr ? 'أساس الشخصية ← نبضات قصيرة' : 'Personality baseline → pulse'}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isAr
            ? 'خذ مقياساً للشخصية مرة واحدة، ثم عد بنبضات رفاهية قصيرة لتتبّع كيف تتغيّر حالتك.'
            : 'Take a personality measure once, then return with short wellbeing pulses to track how you change.'}
        </p>
      </div>

      <ScreeningDisclaimer lang={lang} className="mb-5" />

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--vw-blue)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
              <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {isAr ? 'الخطوة 1 — الأساس' : 'Step 1 — Baseline'}
              </h2>
            </div>
            <div className="space-y-2">
              {baseline.map(d => {
                const done = doneCodes.has(d.code)
                return (
                  <Link
                    key={d.id}
                    href={`/assessments/${d.id}`}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--surface-alt)' }}
                  >
                    <div>
                      <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {isAr && d.name_ar ? d.name_ar : d.name_en}
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {d.total_questions}{isAr ? ' سؤال' : ' questions'}
                        {done ? (isAr ? ' · مكتمل' : ' · completed') : ''}
                      </p>
                    </div>
                    {done ? <CheckCircle2 className="w-4 h-4" style={{ color: '#1B8A5A' }} /> : <ArrowRight className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />}
                  </Link>
                )
              })}
              {baseline.length === 0 && (
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {isAr ? 'مقياس الشخصية غير متاح حالياً.' : 'Personality measure not available yet.'}
                </p>
              )}
            </div>
          </div>

          <div className="card p-5" style={{ opacity: hasBaseline ? 1 : 0.85 }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
              <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {isAr ? 'الخطوة 2 — النبضات' : 'Step 2 — Pulses'}
              </h2>
            </div>
            {!hasBaseline && (
              <p className="text-[12.5px] mb-3" style={{ color: 'var(--text-muted)' }}>
                {isAr ? 'يُفضَّل إكمال الأساس أولاً، ويمكنك البدء بالنبضات في أي وقت.' : 'Baseline first is ideal — you can still start pulses anytime.'}
              </p>
            )}
            <div className="space-y-2">
              {pulses.map(d => (
                <Link
                  key={d.id}
                  href={`/assessments/${d.id}`}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--surface-alt)' }}
                >
                  <div>
                    <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {isAr && d.name_ar ? d.name_ar : d.name_en}
                    </p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {d.total_questions}{isAr ? ' سؤال · نبضة قصيرة' : ' questions · short pulse'}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--vw-blue)' }} />
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/insights#self-map" className="btn-secondary">
              {isAr ? 'خريطتي الذاتية' : 'My Self Map'}
            </Link>
            <Link href="/my-packages" className="btn-primary">
              {isAr ? 'كل الملفات الشخصية' : 'All Profiles'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
