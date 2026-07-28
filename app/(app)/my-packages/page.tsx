import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import Link from 'next/link'
import { Layers, CheckCircle2, ChevronRight } from 'lucide-react'

export const metadata = { robots: { index: false, follow: false } }

type PkgAssessment = { assessment_code: string; is_available: boolean }
type Pkg = {
  id: string
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  category: string
  color: string | null
  status: string
  sort_order: number
  package_assessments: PkgAssessment[]
}

export default async function MyPackagesPage() {
  const supabase = await createClient()
  const lang = await getLanguage()
  const isAr = lang === 'ar'
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/my-packages')

  const [pkgRes, subsRes, resultsRes] = await Promise.all([
    supabase
      .from('packages')
      .select('id, name_en, name_ar, description_en, description_ar, category, color, status, sort_order, package_assessments(assessment_code, is_available)')
      .eq('status', 'active')
      .order('sort_order', { ascending: true }),
    supabase
      .from('assessment_submissions')
      .select('assessment_definitions(code)')
      .eq('patient_id', user.id),
    supabase
      .from('package_results')
      .select('package_id, status')
      .eq('user_id', user.id)
      .eq('status', 'completed'),
  ])

  const packages = (pkgRes.data || []) as Pkg[]
  const completedCodes = new Set<string>(
    (subsRes.data || [])
      .map((s: any) => s.assessment_definitions?.code)
      .filter(Boolean)
  )
  const completedPackageIds = new Set<string>((resultsRes.data || []).map((r: any) => r.package_id))

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('packages.title', lang)}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('packages.subtitle', lang)}</p>
      </div>

      {packages.length === 0 ? (
        <div className="card p-10 text-center">
          <Layers className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('packages.empty', lang)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const name = isAr && pkg.name_ar ? pkg.name_ar : pkg.name_en
            const desc = isAr && pkg.description_ar ? pkg.description_ar : pkg.description_en
            const available = (pkg.package_assessments || []).filter(a => a.is_available)
            const doneInPkg = available.filter(a => completedCodes.has(a.assessment_code)).length
            const totalInPkg = available.length
            const isCompleted = completedPackageIds.has(pkg.id)
            const inProgress = !isCompleted && doneInPkg > 0
            const accent = pkg.color || '#1D6296'

            return (
              <Link key={pkg.id} href={`/packages/${pkg.id}`} className="card-hover p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}1A` }}>
                    <Layers className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  {isCompleted ? (
                    <span className="badge-minimal border inline-flex items-center gap-1 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" />{isAr ? 'مكتمل' : 'Completed'}
                    </span>
                  ) : inProgress ? (
                    <span className="badge-neutral flex-shrink-0">{isAr ? `قيد التقدم ${doneInPkg}/${totalInPkg}` : `In progress ${doneInPkg}/${totalInPkg}`}</span>
                  ) : (
                    <span className="badge-neutral flex-shrink-0">{totalInPkg} {isAr ? 'مقاييس' : 'scales'}</span>
                  )}
                </div>
                <h3 className="text-[15px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{name}</h3>
                {desc && <p className="text-[13px] mb-4 line-clamp-3 flex-1" style={{ color: 'var(--text-secondary)' }}>{desc}</p>}
                <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: accent }}>
                  {isCompleted ? (isAr ? 'عرض النتيجة' : 'View result') : inProgress ? (isAr ? 'متابعة' : 'Continue') : (isAr ? 'ابدأ' : 'Start')}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
