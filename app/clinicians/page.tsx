import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { ArrowLeft, ClipboardList, Users, BarChart3, MessageSquare, Shield, Bell, ChevronRight } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'

export default async function CliniciansPage() {
  const lang = await getLanguage()
  const isRtl = lang === 'ar'

  const features = isRtl ? [
    { icon: ClipboardList, color: '#EAF2F9', iconColor: '#1D6296', title: 'تعيين التقييمات', desc: 'عيّن تقييمات نفسية محددة لكل مريض مع تواريخ استحقاق وملاحظات خاصة. يتلقى المريض إشعاراً فورياً.' },
    { icon: BarChart3, color: '#E6F4EC', iconColor: '#1B8A5A', title: 'مراجعة النتائج', desc: 'اطلع على نتائج تقييمات مرضاك بشكل مفصل مع التفسيرات السريرية وتطور الأعراض عبر الزمن.' },
    { icon: Users, color: '#FEF2EC', iconColor: '#F3650A', title: 'إدارة المرضى', desc: 'تابع قائمة مرضاك، ومستوى نشاطهم، والحالات عالية الخطورة التي تستدعي انتباهاً فورياً.' },
    { icon: MessageSquare, color: '#EAF2F9', iconColor: '#1D6296', title: 'المراسلة الآمنة', desc: 'تواصل مع مرضاك بشكل آمن وسري عبر منصة المراسلة المشفرة داخل المنصة.' },
    { icon: Bell, color: '#FBF1DC', iconColor: '#B07A12', title: 'تنبيهات الخطر', desc: 'تلقّ تنبيهات فورية عند وصول مريض إلى نتائج تقييم تشير إلى خطورة عالية تستدعي التدخل.' },
    { icon: Shield, color: '#FDE8E8', iconColor: '#C02A2A', title: 'أمان وخصوصية', desc: 'جميع البيانات مشفرة ومحمية بسياسات أمان RLS. تحكم كامل في ما يُشارَك معك من بيانات المرضى.' },
  ] : [
    { icon: ClipboardList, color: '#EAF2F9', iconColor: '#1D6296', title: 'Assign Assessments', desc: 'Assign specific psychological assessments to each patient with due dates and personal notes. Patients receive immediate notifications.' },
    { icon: BarChart3, color: '#E6F4EC', iconColor: '#1B8A5A', title: 'Review Results', desc: 'View your patients\' assessment results in detail with clinical interpretations and symptom progression over time.' },
    { icon: Users, color: '#FEF2EC', iconColor: '#F3650A', title: 'Patient Management', desc: 'Monitor your patient list, activity levels, and high-risk cases that require immediate attention.' },
    { icon: MessageSquare, color: '#EAF2F9', iconColor: '#1D6296', title: 'Secure Messaging', desc: 'Communicate securely and confidentially with your patients through the encrypted in-platform messaging system.' },
    { icon: Bell, color: '#FBF1DC', iconColor: '#B07A12', title: 'Risk Alerts', desc: 'Receive immediate alerts when a patient reaches assessment results indicating high risk requiring intervention.' },
    { icon: Shield, color: '#FDE8E8', iconColor: '#C02A2A', title: 'Security & Privacy', desc: 'All data is encrypted and protected by RLS security policies. Full control over what patient data is shared with you.' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <header className="sticky top-0 z-50 safe-top safe-x" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 no-underline min-w-0">
            <BrandLogo variant="icon" size={36} />
            <span className="hidden sm:inline text-base font-extrabold tracking-tight truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              V Welfare
            </span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <DarkModeToggle />
            <LanguageToggle lang={lang} />
            <Link href="/login" className="hidden sm:inline-flex btn-ghost">{isRtl ? 'تسجيل الدخول' : 'Sign in'}</Link>
            <Link href="/register" className="btn-accent">{isRtl ? 'إنشاء حساب' : 'Create account'}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6" style={{ background: 'linear-gradient(180deg, #EAF2F9 0%, var(--page-bg) 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium mb-8 hover:opacity-80 transition-opacity" style={{ color: '#1D6296' }}>
            <ArrowLeft className="w-4 h-4" />
            {isRtl ? 'العودة للرئيسية' : 'Back to home'}
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold mb-6" style={{ background: '#EAF2F9', color: '#1D6296', border: '1px solid #A9CFE7' }}>
            {isRtl ? 'قريباً · بوابة المختصين' : 'Coming Soon · Clinician Portal'}
          </div>

          <h1 className="text-[44px] font-extrabold tracking-tight mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {isRtl ? 'بوابة المختصين النفسيين' : 'The Clinician Portal'}
          </h1>
          <p className="text-xl leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'أدوات متكاملة تساعد المختصين النفسيين على متابعة مرضاهم، وتعيين التقييمات، وتلقي التنبيهات، والتواصل الآمن — كل ذلك في مكان واحد.'
              : 'A complete toolkit helping mental health clinicians monitor patients, assign assessments, receive risk alerts, and communicate securely — all in one place.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-accent-lg gap-2">
              {isRtl ? 'إنشاء حساب مجاني' : 'Create a free account'}
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="btn-ghost-lg">
              {isRtl ? 'تواصل معنا' : 'Contact us'}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6" style={{ backgroundColor: 'var(--surface-alt)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              {isRtl ? 'مميزات البوابة' : 'Portal Features'}
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {isRtl
                ? 'كل ما يحتاجه المختص لتقديم رعاية نفسية فعّالة ومبنية على بيانات.'
                : 'Everything a clinician needs to deliver effective, data-driven mental health care.'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4" style={{ backgroundColor: f.color }}>
                  <f.icon className="w-5 h-5" style={{ color: f.iconColor }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {isRtl ? 'هل أنت مختص نفسي؟' : 'Are you a mental health clinician?'}
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'تواصل معنا للانضمام كمختص على منصة V Welfare وبدء رعاية مرضاك رقمياً.'
              : 'Contact us to join V Welfare as a clinician and start supporting your patients digitally.'}
          </p>
          <Link href="/contact" className="btn-accent gap-2">
            {isRtl ? 'تواصل مع فريقنا' : 'Get in touch'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {isRtl
            ? `© ${new Date().getFullYear()} V Welfare. جميع الحقوق محفوظة.`
            : `© ${new Date().getFullYear()} V Welfare. All rights reserved.`}
        </p>
      </footer>
    </div>
  )
}
