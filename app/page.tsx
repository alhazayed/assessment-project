import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import Link from 'next/link'
import LanguageToggle from '@/components/language-toggle'
import type { AssessmentDefinition } from '@/lib/types'
import {
  ClipboardList, Brain, BookOpen, MessageSquare,
  BarChart3, Heart, Shield, Users, ChevronRight,
  Sparkles, Clock, Lock, Globe
} from 'lucide-react'
import AIAssessmentFinder from '@/components/ai-assessment-finder'

const DOMAIN_COLORS: Record<string, string> = {
  PHQ9:   'bg-blue-50 text-blue-700 border-blue-200',
  GAD7:   'bg-purple-50 text-purple-700 border-purple-200',
  DASS21: 'bg-violet-50 text-violet-700 border-violet-200',
  ISI:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  ASRS:   'bg-amber-50 text-amber-700 border-amber-200',
  AUDITC: 'bg-orange-50 text-orange-700 border-orange-200',
  DAST10: 'bg-rose-50 text-rose-700 border-rose-200',
  MDQ:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  PCL5:   'bg-red-50 text-red-700 border-red-200',
  WHO5:   'bg-green-50 text-green-700 border-green-200',
  K10:    'bg-teal-50 text-teal-700 border-teal-200',
  OCIR:   'bg-pink-50 text-pink-700 border-pink-200',
  IESR:   'bg-red-50 text-red-700 border-red-200',
  PSS10:  'bg-orange-50 text-orange-700 border-orange-200',
  RSES:   'bg-sky-50 text-sky-700 border-sky-200',
  GDS15:  'bg-blue-50 text-blue-700 border-blue-200',
  ESS:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  EAT26:  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  CAGE:   'bg-orange-50 text-orange-700 border-orange-200',
  ACE:    'bg-rose-50 text-rose-700 border-rose-200',
  PSS4:   'bg-amber-50 text-amber-700 border-amber-200',
  PHQ15:  'bg-cyan-50 text-cyan-700 border-cyan-200',
  WEMWBS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LSAS:   'bg-purple-50 text-purple-700 border-purple-200',
}

const DOMAIN_LABEL_EN: Record<string, string> = {
  PHQ9: 'Depression', GAD7: 'Anxiety', DASS21: 'Depression · Anxiety · Stress',
  ISI: 'Sleep', ASRS: 'ADHD', AUDITC: 'Alcohol', DAST10: 'Drug Use',
  MDQ: 'Bipolar', PCL5: 'Trauma', WHO5: 'Well-being', K10: 'Distress',
  OCIR: 'OCD', IESR: 'Trauma', PSS10: 'Stress', RSES: 'Self-esteem',
  GDS15: 'Depression', ESS: 'Sleep', EAT26: 'Eating', CAGE: 'Alcohol',
  ACE: 'Childhood Adversity', PSS4: 'Stress', PHQ15: 'Somatic', WEMWBS: 'Well-being',
  LSAS: 'Social Anxiety',
}

const DOMAIN_LABEL_AR: Record<string, string> = {
  PHQ9: 'الاكتئاب', GAD7: 'القلق', DASS21: 'الاكتئاب · القلق · الضغط',
  ISI: 'النوم', ASRS: 'فرط الحركة', AUDITC: 'الكحول', DAST10: 'تعاطي المخدرات',
  MDQ: 'ثنائي القطب', PCL5: 'الصدمة', WHO5: 'الرفاهية', K10: 'الضيق',
  OCIR: 'الوسواس القهري', IESR: 'الصدمة', PSS10: 'الضغط', RSES: 'تقدير الذات',
  GDS15: 'الاكتئاب', ESS: 'النوم', EAT26: 'الأكل', CAGE: 'الكحول',
  ACE: 'الطفولة', PSS4: 'الضغط', PHQ15: 'جسدي', WEMWBS: 'الرفاهية',
  LSAS: 'القلق الاجتماعي',
}

export default async function LandingPage() {
  const supabase = createClient()
  const lang = getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const { data: definitions } = await supabase
    .from('assessment_definitions')
    .select('id, code, name_en, name_ar, description_en, description_ar, total_questions')
    .eq('is_active', true)
    .order('name_en')

  const assessments = (definitions || []) as Pick<AssessmentDefinition, 'id' | 'code' | 'name_en' | 'name_ar' | 'description_en' | 'description_ar' | 'total_questions'>[]
  const DOMAIN_LABEL = lang === 'ar' ? DOMAIN_LABEL_AR : DOMAIN_LABEL_EN

  const services = [
    {
      icon: ClipboardList,
      color: 'bg-blue-50 text-blue-600',
      titleKey: 'service.assessments.title' as const,
      descPre: `${assessments.length} `,
      descKey: 'service.assessments.desc.pre' as const,
      ctaKey: 'service.assessments.cta' as const,
      href: '#assessments',
    },
    {
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-600',
      titleKey: 'service.mood.title' as const,
      descKey: 'service.mood.desc' as const,
      ctaKey: 'service.mood.cta' as const,
      href: '/register',
    },
    {
      icon: BookOpen,
      color: 'bg-emerald-50 text-emerald-600',
      titleKey: 'service.journal.title' as const,
      descKey: 'service.journal.desc' as const,
      ctaKey: 'service.journal.cta' as const,
      href: '/register',
    },
    {
      icon: MessageSquare,
      color: 'bg-orange-50 text-orange-600',
      titleKey: 'service.messages.title' as const,
      descKey: 'service.messages.desc' as const,
      ctaKey: 'service.messages.cta' as const,
      href: '/register',
    },
    {
      icon: Brain,
      color: 'bg-rose-50 text-rose-600',
      titleKey: 'service.results.title' as const,
      descKey: 'service.results.desc' as const,
      ctaKey: 'service.results.cta' as const,
      href: '#assessments',
    },
    {
      icon: Users,
      color: 'bg-teal-50 text-teal-600',
      titleKey: 'service.clinicians.title' as const,
      descKey: 'service.clinicians.desc' as const,
      ctaKey: 'service.clinicians.cta' as const,
      href: '/register',
    },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">{t('app.name', lang)}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#services" className="hover:text-gray-900 transition-colors">{t('nav.services', lang)}</a>
            <a href="#assessments" className="hover:text-gray-900 transition-colors">{t('nav.assessments', lang)}</a>
            <a href="#about" className="hover:text-gray-900 transition-colors">{t('nav.about', lang)}</a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} />
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              {t('nav.signin', lang)}
            </Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">
              {t('nav.signup', lang)}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white pt-20 pb-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.12),transparent)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {t('landing.badge', lang)}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            {t('landing.hero1', lang)}<br />
            <span className="text-brand-600">{t('landing.hero2', lang)}</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.hero.sub', lang)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#assessments" className="btn-primary text-base px-6 py-3 gap-2">
              <ClipboardList className="w-5 h-5" />
              {t('landing.cta.assess', lang)}
            </a>
            <Link href="/register" className="btn-secondary text-base px-6 py-3 gap-2">
              {t('landing.cta.register', lang)}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-gray-400">
            {assessments.length}{t('landing.count.suffix', lang)}
          </p>
        </div>
      </section>

      {/* ── AI Recommender ──────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {t('landing.ai.badge', lang)}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {t('landing.ai.title', lang)}
            </h2>
            <p className="text-gray-500">{t('landing.ai.sub', lang)}</p>
          </div>
          <AIAssessmentFinder />
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, key: 'trust.validated' as const },
              { icon: Lock, key: 'trust.private' as const },
              { icon: Globe, key: 'trust.bilingual' as const },
              { icon: Clock, key: 'trust.fast' as const },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                {t(key, lang)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <section id="services" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('services.title', lang)}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{t('services.sub', lang)}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service) => (
              <div key={service.titleKey} className="card p-6 flex flex-col hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{t(service.titleKey, lang)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1">
                  {'descPre' in service ? service.descPre : ''}{t(service.descKey, lang)}
                </p>
                <a href={service.href} className="mt-5 text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
                  {t(service.ctaKey, lang)} <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Assessments ─────────────────────────────────────────────────── */}
      <section id="assessments" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('assessments.section.title', lang)}</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              {t('assessments.section.sub.pre', lang)} {assessments.length} {t('assessments.section.sub.post', lang)}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((a) => {
              const colorClass = DOMAIN_COLORS[a.code] ?? 'bg-gray-50 text-gray-600 border-gray-200'
              const domainLabel = DOMAIN_LABEL[a.code] ?? 'Mental Health'
              const name = lang === 'ar' && a.name_ar ? a.name_ar : a.name_en
              const description = lang === 'ar' && a.description_ar ? a.description_ar : a.description_en
              return (
                <div key={a.id} className="card p-5 flex flex-col hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                      {domainLabel}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md font-medium">
                      {a.total_questions}{t('assessments.questions', lang)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 leading-snug mb-2">{name}</h3>
                  {description && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed flex-1">{description}</p>
                  )}
                  <Link href={`/assessments/${a.id}`} className="mt-4 btn-primary text-xs px-4 py-2 self-start">
                    {t('assessments.start', lang)}
                  </Link>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-6 py-4 text-sm text-brand-700">
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{t('assessments.track.cta', lang)}</strong>{' '}
                <Link href="/register" className="underline font-semibold hover:text-brand-800">
                  {t('assessments.track.link', lang)}
                </Link>
                {' '}{t('assessments.track.suffix', lang)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('about.title', lang)}</h2>
              <p className="text-gray-500 leading-relaxed mb-6">{t('about.p1', lang)}</p>
              <p className="text-gray-500 leading-relaxed mb-6">{t('about.p2', lang)}</p>
              <div className="flex flex-col gap-3">
                {(['about.bullet1', 'about.bullet2', 'about.bullet3', 'about.bullet4'] as const).map(key => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-brand-600" />
                    </div>
                    <p className="text-sm text-gray-600">{t(key, lang)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: `${assessments.length}`, key: 'about.stat1' as const },
                { value: '24/7', key: 'about.stat2' as const },
                { value: '2', key: 'about.stat3' as const },
                { value: '100%', key: 'about.stat4' as const },
              ].map(({ value, key }) => (
                <div key={key} className="card p-6 text-center">
                  <div className="text-3xl font-bold text-brand-600 mb-1">{value}</div>
                  <div className="text-sm text-gray-500">{t(key, lang)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="bg-brand-600 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t('cta.title', lang)}</h2>
          <p className="text-brand-100 text-lg mb-8">{t('cta.sub', lang)}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#assessments" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-lg hover:bg-brand-50 transition-colors text-sm">
              <ClipboardList className="w-4 h-4" />
              {t('cta.browse', lang)}
            </a>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-700 text-white font-semibold rounded-lg hover:bg-brand-800 transition-colors text-sm border border-brand-500">
              {t('cta.register', lang)}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">{t('app.name', lang)}</span>
            <span className="text-gray-500 text-sm ml-2">{t('app.tagline', lang)}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/assessments" className="hover:text-white transition-colors">{t('nav.assessments', lang)}</Link>
            <Link href="/login" className="hover:text-white transition-colors">{t('nav.signin', lang)}</Link>
            <Link href="/register" className="hover:text-white transition-colors">{t('nav.create_account', lang)}</Link>
          </div>
          <p className="text-xs text-gray-600 text-center md:text-right">
            {t('footer.disclaimer', lang)}
          </p>
        </div>
      </footer>

    </div>
  )
}
