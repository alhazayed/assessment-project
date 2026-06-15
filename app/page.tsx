import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import Link from 'next/link'
import LanguageToggle from '@/components/language-toggle'
import type { AssessmentDefinition } from '@/lib/types'
import {
  ClipboardList, Brain, BookOpen, MessageSquare,
  BarChart3, Heart, Users, ChevronRight,
  Sparkles, Clock, Lock, Globe, Shield
} from 'lucide-react'
import AIAssessmentFinder from '@/components/ai-assessment-finder'
import AssessmentsByCategory from '@/components/assessments-by-category'
import BrandLogo from '@/components/brand-logo'


export default async function LandingPage() {
  const supabase = createClient()
  const lang = getLanguage()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin' || profile?.role === 'superadmin') redirect('/x/control')
    redirect('/dashboard')
  }

  const { data: definitions } = await supabase
    .from('assessment_definitions')
    .select('id, code, name_en, name_ar, description_en, description_ar, total_questions')
    .eq('is_active', true)
    .order('name_en')

  const assessments = (definitions || []) as Pick<AssessmentDefinition, 'id' | 'code' | 'name_en' | 'name_ar' | 'description_en' | 'description_ar' | 'total_questions'>[]

  const services = [
    {
      icon: ClipboardList,
      color: 'bg-brand-50 text-brand-600',
      titleKey: 'service.assessments.title' as const,
      descPre: `${assessments.length} `,
      descKey: 'service.assessments.desc.pre' as const,
      ctaKey: 'service.assessments.cta' as const,
      href: '#assessments',
    },
    {
      icon: BarChart3,
      color: 'bg-brand-100 text-brand-700',
      titleKey: 'service.mood.title' as const,
      descKey: 'service.mood.desc' as const,
      ctaKey: 'service.mood.cta' as const,
      href: '/register',
    },
    {
      icon: BookOpen,
      color: 'bg-accent-50 text-accent-600',
      titleKey: 'service.journal.title' as const,
      descKey: 'service.journal.desc' as const,
      ctaKey: 'service.journal.cta' as const,
      href: '/register',
    },
    {
      icon: MessageSquare,
      color: 'bg-brand-50 text-brand-500',
      titleKey: 'service.messages.title' as const,
      descKey: 'service.messages.desc' as const,
      ctaKey: 'service.messages.cta' as const,
      href: '/register',
    },
    {
      icon: Brain,
      color: 'bg-accent-50 text-accent-500',
      titleKey: 'service.results.title' as const,
      descKey: 'service.results.desc' as const,
      ctaKey: 'service.results.cta' as const,
      href: '#assessments',
    },
    {
      icon: Users,
      color: 'bg-brand-900/10 text-brand-600',
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
            <BrandLogo variant="icon" size={40} />
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(29,98,150,0.12),transparent)]" />
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
            <div className="inline-flex items-center gap-2 bg-accent-50 text-accent-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {t('landing.ai.badge', lang)}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {t('landing.ai.title', lang)}
            </h2>
            <p className="text-gray-500">{t('landing.ai.sub', lang)}</p>
          </div>
          <AIAssessmentFinder lang={lang} />
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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('assessments.section.title', lang)}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              {t('assessments.section.sub.pre', lang)} {assessments.length} {t('assessments.section.sub.post', lang)}
            </p>
          </div>

          <AssessmentsByCategory assessments={assessments} lang={lang} />

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

      {/* ── ADHD Zone Tool promo ────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-8 md:flex md:items-center md:justify-between gap-6">
              <div className="mb-5 md:mb-0">
                <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                  <Brain className="w-3.5 h-3.5" />
                  {t('adhd.landing.badge', lang)}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('adhd.landing.title', lang)}</h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-lg">{t('adhd.landing.sub', lang)}</p>
                <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Green — Online</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Yellow — Fraying</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Red — Hijacked</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /> Black — Shutdown</span>
                </div>
              </div>
              <Link
                href="/adhd-zones"
                className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap flex-shrink-0"
              >
                {t('adhd.landing.cta', lang)}
                <ChevronRight className="w-4 h-4" />
              </Link>
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
            <BrandLogo variant="icon" size={32} />
            <span className="font-semibold">{t('app.name', lang)}</span>
            <span className="text-gray-500 text-sm ml-2">{t('app.tagline', lang)}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#assessments" className="hover:text-white transition-colors">{t('nav.assessments', lang)}</a>
            <Link href="/login" className="hover:text-white transition-colors">{t('nav.signin', lang)}</Link>
            <Link href="/register" className="hover:text-white transition-colors">{t('nav.create_account', lang)}</Link>
            <a href="mailto:info@vwelfare.com" className="hover:text-white transition-colors">{t('footer.contact', lang)}</a>
          </div>
          <p className="text-xs text-gray-600 text-center md:text-right">
            {t('footer.disclaimer', lang)}
          </p>
        </div>
      </footer>

    </div>
  )
}
