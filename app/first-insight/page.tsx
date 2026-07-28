'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Heart, ArrowRight, Sparkles } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/language-toggle'
import { INSIGHT_THEMES, type InsightThemeId } from '@/lib/self-knowledge'
import ScreeningDisclaimer from '@/components/screening-disclaimer'

type DefRow = { id: string; code: string; name_en: string; name_ar: string | null; total_questions: number }

export default function FirstInsightPage() {
  const router = useRouter()
  const lang = useLang()
  const isAr = lang === 'ar'
  const supabase = useMemo(() => createClient(), [])
  const [defs, setDefs] = useState<DefRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InsightThemeId | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login?next=/first-insight'); return }

      const [{ data: definitions }, { count }] = await Promise.all([
        supabase
          .from('assessment_definitions')
          .select('id, code, name_en, name_ar, total_questions')
          .eq('is_active', true),
        supabase
          .from('assessment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', user.id),
      ])

      setDefs((definitions as DefRow[]) || [])
      // If they already have results, still allow the wizard but show skip to dashboard
      if ((count ?? 0) > 0) {
        // keep page available
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  function pickDefinition(themeId: InsightThemeId): DefRow | null {
    const theme = INSIGHT_THEMES.find(t => t.id === themeId)
    if (!theme) return null
    for (const code of theme.preferredCodes) {
      const found = defs.find(d => d.code === code)
      if (found) return found
    }
    return defs[0] ?? null
  }

  function handleStart() {
    if (!selected) return
    const def = pickDefinition(selected)
    if (!def) return
    try { sessionStorage.setItem('vw_first_insight_theme', selected) } catch {}
    router.push(`/assessments/${def.id}`)
  }

  function handleSkip() {
    try { localStorage.setItem('vw_first_insight_done', '1') } catch {}
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--vw-blue)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const preview = selected ? pickDefinition(selected) : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="w-full max-w-lg mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--vw-blue)' }}>
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('app.name', lang)}</span>
        </div>
        <LanguageToggle lang={lang} />
      </div>

      <div className="w-full max-w-lg card p-7 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: '#FEF2EC', color: '#F3650A' }}>
            <Sparkles className="w-3.5 h-3.5" />
            {isAr ? 'أول رؤية' : 'First insight'}
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            {isAr ? 'ماذا تريد أن تفهم عن نفسك؟' : 'What do you want to understand about yourself?'}
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
            {isAr
              ? 'اختر اتجاهاً واحداً. سنقترح تقييماً قصيراً مناسباً — بدون قائمة طويلة من الاختصارات.'
              : 'Pick one direction. We’ll suggest one fitting short assessment — no wall of acronyms.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {INSIGHT_THEMES.map(theme => {
            const active = selected === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelected(theme.id)}
                className="text-start p-3.5 rounded-xl border-2 transition-all"
                style={active
                  ? { borderColor: 'var(--vw-blue)', backgroundColor: '#EAF2F9' }
                  : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
              >
                <p className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {isAr ? theme.labelAr : theme.labelEn}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {isAr ? theme.descAr : theme.descEn}
                </p>
              </button>
            )
          })}
        </div>

        {preview && (
          <div className="p-3.5 rounded-xl" style={{ backgroundColor: 'var(--surface-alt)' }}>
            <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--vw-blue)' }}>
              {isAr ? 'نقترح لك' : 'We suggest'}
            </p>
            <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {isAr && preview.name_ar ? preview.name_ar : preview.name_en}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {preview.total_questions}{isAr ? ' سؤال · بضع دقائق' : ' questions · a few minutes'}
            </p>
          </div>
        )}

        <ScreeningDisclaimer lang={lang} />

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={handleStart} disabled={!selected || !preview} className="btn-primary flex-1 gap-2 disabled:opacity-40">
            {isAr ? 'ابدأ' : 'Start'}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={handleSkip} className="btn-secondary flex-1">
            {isAr ? 'تخطي إلى لوحة التحكم' : 'Skip to dashboard'}
          </button>
        </div>

        <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <Link href="/assessments" className="underline">
            {isAr ? 'تصفح كل التقييمات' : 'Browse all assessments'}
          </Link>
        </p>
      </div>
    </div>
  )
}
