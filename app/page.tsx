import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { AssessmentDefinition } from '@/lib/types'
import {
  ClipboardList, Brain, BookOpen, MessageSquare,
  BarChart3, Heart, Shield, Users, ChevronRight,
  Sparkles, Clock, Lock, Globe
} from 'lucide-react'

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

const DOMAIN_LABEL: Record<string, string> = {
  PHQ9: 'Depression', GAD7: 'Anxiety', DASS21: 'Depression · Anxiety · Stress',
  ISI: 'Sleep', ASRS: 'ADHD', AUDITC: 'Alcohol', DAST10: 'Drug Use',
  MDQ: 'Bipolar', PCL5: 'Trauma', WHO5: 'Well-being', K10: 'Distress',
  OCIR: 'OCD', IESR: 'Trauma', PSS10: 'Stress', RSES: 'Self-esteem',
  GDS15: 'Depression', ESS: 'Sleep', EAT26: 'Eating', CAGE: 'Alcohol',
  ACE: 'Childhood Adversity', PSS4: 'Stress', PHQ15: 'Somatic', WEMWBS: 'Well-being',
  LSAS: 'Social Anxiety',
}

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const { data: definitions } = await supabase
    .from('assessment_definitions')
    .select('id, code, name_en, description_en, total_questions')
    .eq('is_active', true)
    .order('name_en')

  const assessments = (definitions || []) as Pick<AssessmentDefinition, 'id' | 'code' | 'name_en' | 'description_en' | 'total_questions'>[]

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">vWelfare</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#services" className="hover:text-gray-900 transition-colors">Services</a>
            <a href="#assessments" className="hover:text-gray-900 transition-colors">Assessments</a>
            <a href="#about" className="hover:text-gray-900 transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">
              Get started free
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
            Free · Evidence-based · Bilingual
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            Your mental health<br />
            <span className="text-brand-600">deserves clarity</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Take validated psychological assessments, track your mood, and connect with clinicians —
            all in one place. No account required to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#assessments" className="btn-primary text-base px-6 py-3 gap-2">
              <ClipboardList className="w-5 h-5" />
              Take a free assessment
            </a>
            <Link href="/register" className="btn-secondary text-base px-6 py-3 gap-2">
              Create free account
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-gray-400">
            {assessments.length} validated scales available · No login required to take any assessment
          </p>
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, text: 'Clinically validated tools' },
              { icon: Lock, text: 'Private & confidential' },
              { icon: Globe, text: 'Arabic & English' },
              { icon: Clock, text: 'Results in minutes' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <section id="services" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              A complete mental health support ecosystem — from screening to ongoing care.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ClipboardList,
                color: 'bg-blue-50 text-blue-600',
                title: 'Validated Assessments',
                description: `${assessments.length} evidence-based psychological scales covering depression, anxiety, stress, trauma, ADHD, eating disorders, substance use, and more. Free to take — no account needed.`,
                cta: 'Take an assessment',
                href: '#assessments',
              },
              {
                icon: BarChart3,
                color: 'bg-purple-50 text-purple-600',
                title: 'Mood Tracking',
                description: 'Log your mood, energy, anxiety, and sleep daily. Visualise trends over time and share insights with your clinician to inform treatment decisions.',
                cta: 'Create account to track',
                href: '/register',
              },
              {
                icon: BookOpen,
                color: 'bg-emerald-50 text-emerald-600',
                title: 'Personal Journal',
                description: 'Write private reflections and optionally share entries with your assigned clinician. Evidence shows expressive writing supports emotional regulation.',
                cta: 'Start journaling',
                href: '/register',
              },
              {
                icon: MessageSquare,
                color: 'bg-orange-50 text-orange-600',
                title: 'Clinician Messaging',
                description: 'Communicate securely with your assigned mental health clinician. Share updates, ask questions, and stay connected between appointments.',
                cta: 'Connect with a clinician',
                href: '/register',
              },
              {
                icon: Brain,
                color: 'bg-rose-50 text-rose-600',
                title: 'Scientific Results',
                description: 'Every assessment result includes a clinical explanation of your score, evidence-based recommendations, related conditions to be aware of, and suggested follow-up assessments.',
                cta: 'See a sample result',
                href: '#assessments',
              },
              {
                icon: Users,
                color: 'bg-teal-50 text-teal-600',
                title: 'Clinician Portal',
                description: 'Clinicians can assign assessments, review patient results, monitor mood trends, flag high-risk cases, and maintain therapeutic relationships — all in one dashboard.',
                cta: 'For clinicians',
                href: '/register',
              },
            ].map((service) => (
              <div key={service.title} className="card p-6 flex flex-col hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1">{service.description}</p>
                <a href={service.href} className="mt-5 text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
                  {service.cta} <ChevronRight className="w-3.5 h-3.5" />
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
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Free assessments — start now</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              All {assessments.length} tools are scientifically validated and free to use.
              No account required. Create one to save your results and track progress over time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((a) => {
              const colorClass = DOMAIN_COLORS[a.code] ?? 'bg-gray-50 text-gray-600 border-gray-200'
              const domainLabel = DOMAIN_LABEL[a.code] ?? 'Mental Health'
              return (
                <div key={a.id} className="card p-5 flex flex-col hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                      {domainLabel}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md font-medium">
                      {a.total_questions}Q
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 leading-snug mb-2">{a.name_en}</h3>
                  {a.description_en && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed flex-1">
                      {a.description_en}
                    </p>
                  )}
                  <Link
                    href={`/assessments/${a.id}`}
                    className="mt-4 btn-primary text-xs px-4 py-2 self-start"
                  >
                    Start free
                  </Link>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-6 py-4 text-sm text-brand-700">
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Want to track your progress?</strong>{' '}
                <Link href="/register" className="underline font-semibold hover:text-brand-800">Create a free account</Link>
                {' '}to save results, monitor trends, and connect with a clinician.
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
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for real mental health care</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                vWelfare is a bilingual (Arabic &amp; English) mental health platform designed to bridge the gap
                between evidence-based screening tools and everyday access to mental health support.
              </p>
              <p className="text-gray-500 leading-relaxed mb-6">
                Every assessment on this platform is a validated, open-source psychological scale used by
                clinicians and researchers worldwide. Results are explained in plain language with scientific
                context, clinical recommendations, and suggested next steps.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                  </div>
                  <p className="text-sm text-gray-600">All screening tools are free and publicly accessible without registration</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                  </div>
                  <p className="text-sm text-gray-600">Results include scientific explanations, not just scores</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                  </div>
                  <p className="text-sm text-gray-600">Designed for both individual users and clinical organisations</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                  </div>
                  <p className="text-sm text-gray-600">Fully bilingual — Arabic and English throughout</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: `${assessments.length}`, label: 'Validated scales' },
                { value: '24/7', label: 'Always available' },
                { value: '2', label: 'Languages' },
                { value: '100%', label: 'Free to screen' },
              ].map(({ value, label }) => (
                <div key={label} className="card p-6 text-center">
                  <div className="text-3xl font-bold text-brand-600 mb-1">{value}</div>
                  <div className="text-sm text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="bg-brand-600 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to understand your mental health?</h2>
          <p className="text-brand-100 text-lg mb-8">
            Take any assessment for free — no account, no waiting. Create an account to save your history.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#assessments" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-lg hover:bg-brand-50 transition-colors text-sm">
              <ClipboardList className="w-4 h-4" />
              Browse assessments
            </a>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-700 text-white font-semibold rounded-lg hover:bg-brand-800 transition-colors text-sm border border-brand-500">
              Create free account
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
            <span className="font-semibold">vWelfare</span>
            <span className="text-gray-500 text-sm ml-2">Mental Health Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/assessments" className="hover:text-white transition-colors">Assessments</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          <p className="text-xs text-gray-600 text-center md:text-right">
            For screening purposes only. Not a substitute for professional clinical assessment.
          </p>
        </div>
      </footer>

    </div>
  )
}
