import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import { t } from '@/lib/i18n'
import Link from 'next/link'
import LanguageToggle from '@/components/language-toggle'
import type { AssessmentDefinition } from '@/lib/types'
import {
  ClipboardList, Brain, BookOpen, MessageSquare,
  BarChart3, Heart, ChevronRight,
  Sparkles, Clock, Lock, Globe, Shield, Star
} from 'lucide-react'
import AssessmentsByCategory from '@/components/assessments-by-category'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LandingMobileMenu from '@/components/landing-mobile-menu'

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
  const isRtl = lang === 'ar'

  const services = [
    { icon: ClipboardList, color: '#EAF2F9', iconColor: '#1D6296', titleKey: 'service.assessments.title' as const, descKey: 'service.assessments.desc.pre' as const, ctaKey: 'service.assessments.cta' as const, href: '#assessments' },
    { icon: BarChart3, color: '#E6F4EC', iconColor: '#1B8A5A', titleKey: 'service.mood.title' as const, descKey: 'service.mood.desc' as const, ctaKey: 'service.mood.cta' as const, href: '/register' },
    { icon: BookOpen, color: '#FEF2EC', iconColor: '#F3650A', titleKey: 'service.journal.title' as const, descKey: 'service.journal.desc' as const, ctaKey: 'service.journal.cta' as const, href: '/register' },
    { icon: MessageSquare, color: '#EAF2F9', iconColor: '#1D6296', titleKey: 'service.messages.title' as const, descKey: 'service.messages.desc' as const, ctaKey: 'service.messages.cta' as const, href: '/register' },
    { icon: Brain, color: '#FBF1DC', iconColor: '#B07A12', titleKey: 'service.results.title' as const, descKey: 'service.results.desc' as const, ctaKey: 'service.results.cta' as const, href: '/sample-result' },
    { icon: Heart, color: '#FDE8E8', iconColor: '#C02A2A', titleKey: 'service.clinicians.title' as const, descKey: 'service.clinicians.desc' as const, ctaKey: 'service.clinicians.cta' as const, href: '/clinicians' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
            <BrandLogo variant="icon" size={32} />
            <span className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              V Welfare
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6 text-[13.5px] font-medium ms-6" style={{ color: 'var(--text-secondary)' }}>
            <a href="#services" className="hover:text-[var(--text-primary)] transition-colors">{t('nav.services', lang)}</a>
            <a href="#assessments" className="hover:text-[var(--text-primary)] transition-colors">{t('nav.assessments', lang)}</a>
            <a href="#about" className="hover:text-[var(--text-primary)] transition-colors">{t('nav.about', lang)}</a>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 ms-auto">
            <DarkModeToggle />
            <LanguageToggle lang={lang} />
            {/* Desktop: auth buttons */}
            <Link href="/login" className="hidden sm:inline-flex btn-ghost ms-1">{t('nav.signin', lang)}</Link>
            <Link href="/register" className="hidden sm:inline-flex btn-accent">{t('nav.signup', lang)}</Link>
            {/* Mobile: hamburger */}
            <div className="sm:hidden ms-0.5">
              <LandingMobileMenu lang={lang} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-24 pb-28 px-6"
        style={{ background: 'linear-gradient(180deg, #EAF2F9 0%, var(--page-bg) 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-12 -right-20 w-80 h-80 rounded-full opacity-[0.07]" style={{ background: '#1D6296' }} />
          <div className="absolute top-1/2 -left-32 w-96 h-96 rounded-full opacity-[0.05]" style={{ background: '#4C9BE0' }} />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full opacity-[0.06]" style={{ background: '#F3650A' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold mb-6" style={{ background: '#EAF2F9', color: '#1D6296', border: '1px solid #A9CFE7' }}>
            <Sparkles className="w-3.5 h-3.5" />
            {t('landing.badge', lang)}
          </div>

          <h1 className="text-[32px] sm:text-[48px] md:text-[64px] font-extrabold leading-tight mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {t('landing.hero1', lang)}<br />
            <span style={{ color: '#1D6296' }}>{t('landing.hero2', lang)}</span>
          </h1>

          <p className="text-base sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>
            {t('landing.hero.sub', lang)}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#assessments" className="btn-accent-lg gap-2">
              <ClipboardList className="w-5 h-5" />
              {t('landing.cta.assess', lang)}
            </a>
            <Link href="/register" className="btn-ghost-lg gap-2">
              {t('landing.cta.register', lang)}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Social proof micro-strip */}
          <div className="flex items-center justify-center gap-1.5 mt-8">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#F3650A' }} />
            ))}
            <span className="text-[13px] ms-2" style={{ color: 'var(--text-muted)' }}>
              {assessments.length}{t('landing.count.suffix', lang)}
            </span>
          </div>
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
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, key: 'trust.validated' as const },
              { icon: Lock, key: 'trust.private' as const },
              { icon: Globe, key: 'trust.bilingual' as const },
              { icon: Clock, key: 'trust.fast' as const },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center justify-center gap-2 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#1D6296' }} />
                {t(key, lang)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <section id="services" className="py-20 px-6" style={{ backgroundColor: 'var(--surface-alt)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              {t('services.title', lang)}
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>{t('services.sub', lang)}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {services.map((service) => (
              <div key={service.titleKey} className="card-hover p-6 flex flex-col">
                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4 flex-shrink-0" style={{ backgroundColor: service.color }}>
                  <service.icon className="w-5 h-5" style={{ color: service.iconColor }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t(service.titleKey, lang)}</h3>
                <p className="text-[13.5px] leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
                  {t(service.descKey, lang)}
                </p>
                <a href={service.href} className="mt-4 text-[13px] font-semibold flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: '#1D6296' }}>
                  {t(service.ctaKey, lang)} <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Assessments ─────────────────────────────────────────────────── */}
      <section id="assessments" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              {t('assessments.section.title', lang)}
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {t('assessments.section.sub.pre', lang)} {assessments.length} {t('assessments.section.sub.post', lang)}
            </p>
          </div>

          <AssessmentsByCategory assessments={assessments} lang={lang} />

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 rounded-[14px] px-6 py-4 text-[13.5px]" style={{ background: '#EAF2F9', border: '1px solid #A9CFE7', color: '#1D6296' }}>
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{t('assessments.track.cta', lang)}</strong>{' '}
                <Link href="/register" className="underline font-semibold hover:opacity-80">
                  {t('assessments.track.link', lang)}
                </Link>
                {' '}{t('assessments.track.suffix', lang)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ADHD Zone Promo ─────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ backgroundColor: 'var(--surface-alt)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-[20px] overflow-hidden" style={{ background: 'linear-gradient(135deg, #12273C 0%, #1D3A52 100%)' }}>
            <div className="px-4 py-6 sm:px-8 sm:py-8 md:flex md:items-center md:justify-between gap-8">
              <div className="mb-5 md:mb-0">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] font-bold mb-3" style={{ background: 'rgba(245,158,11,0.18)', color: '#FCD34D' }}>
                  <Brain className="w-3.5 h-3.5" />
                  {t('adhd.landing.badge', lang)}
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>{t('adhd.landing.title', lang)}</h2>
                <p className="text-[13.5px] leading-relaxed max-w-lg" style={{ color: '#7EB7DB' }}>{t('adhd.landing.sub', lang)}</p>
                <div className="flex flex-wrap items-center gap-3 mt-4 text-[12px]" style={{ color: '#6CA8CC' }}>
                  {[
                    { color: '#22C55E', label: isRtl ? 'أخضر — نشط' : 'Green — Online' },
                    { color: '#FBBF24', label: isRtl ? 'أصفر — متعب' : 'Yellow — Fraying' },
                    { color: '#EF4444', label: isRtl ? 'أحمر — مشتت' : 'Red — Hijacked' },
                    { color: '#6B7280', label: isRtl ? 'أسود — خامل' : 'Black — Shutdown' },
                  ].map(z => (
                    <span key={z.color} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: z.color }} />
                      {z.label}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href="/adhd-zones"
                className="inline-flex items-center gap-2 px-5 py-3 font-semibold rounded-[11px] transition-opacity hover:opacity-90 text-sm whitespace-nowrap flex-shrink-0"
                style={{ background: '#F59E0B', color: '#12273C' }}
              >
                {t('adhd.landing.cta', lang)}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>{t('about.title', lang)}</h2>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t('about.p1', lang)}</p>
              <p className="leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{t('about.p2', lang)}</p>
              <div className="flex flex-col gap-3">
                {(['about.bullet1', 'about.bullet2', 'about.bullet3', 'about.bullet4'] as const).map(key => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#EAF2F9' }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: '#1D6296' }} />
                    </div>
                    <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{t(key, lang)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: `${assessments.length}`, key: 'about.stat1' as const },
                { value: '24/7', key: 'about.stat2' as const },
                { value: '2', key: 'about.stat3' as const },
                { value: '100%', key: 'about.stat4' as const },
              ].map(({ value, key }) => (
                <div key={key} className="card p-6 text-center">
                  <div className="text-3xl font-extrabold mb-1" style={{ color: '#1D6296', letterSpacing: '-0.02em' }}>{value}</div>
                  <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{t(key, lang)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: 'linear-gradient(135deg, #1D6296 0%, #12273C 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3" style={{ letterSpacing: '-0.025em' }}>{t('cta.title', lang)}</h2>
          <p className="text-lg mb-8" style={{ color: '#7EB7DB' }}>{t('cta.sub', lang)}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#assessments" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white font-semibold rounded-[11px] hover:bg-brand-50 transition-colors text-[14.5px]" style={{ color: '#1D6296' }}>
              <ClipboardList className="w-4 h-4" />
              {t('cta.browse', lang)}
            </a>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-[11px] transition-colors text-[14.5px] text-white" style={{ background: '#F3650A', boxShadow: '0 12px 26px -10px rgba(243,101,10,0.50)' }}>
              {t('cta.register', lang)}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#0E1A26' }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="icon" size={30} />
            <span className="text-base font-bold text-white" style={{ letterSpacing: '-0.01em' }}>V Welfare</span>
            <span className="text-[12.5px] ms-1" style={{ color: '#4A7A9B' }}>{t('app.tagline', lang)}</span>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-5 text-[13px]" style={{ color: '#4A7A9B' }}>
            <a href="#assessments" className="hover:text-white transition-colors">{t('nav.assessments', lang)}</a>
            <Link href="/login" className="hover:text-white transition-colors">{t('nav.signin', lang)}</Link>
            <Link href="/register" className="hover:text-white transition-colors">{t('nav.create_account', lang)}</Link>
            <a href="mailto:info@vwelfare.com" className="hover:text-white transition-colors">{t('footer.contact', lang)}</a>
          </div>
          <p className="text-[11.5px] text-center md:text-end" style={{ color: '#2E4A62' }}>
            {t('footer.disclaimer', lang)}
          </p>
        </div>
      </footer>

    </div>
  )
}
