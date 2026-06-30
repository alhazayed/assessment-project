import type { Metadata } from 'next'
import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'

export const metadata: Metadata = {
  title: 'Terms of Service | V Welfare',
  description: 'Terms of Service for V Welfare. User rights, limitations, acceptable use policy, and disclaimers for our mental health assessment platform.',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  const lang = getLanguage()
  const isRtl = lang === 'ar'

  const sections = isRtl ? [
    {
      title: '١. القبول بالشروط',
      body: 'باستخدامك منصة V Welfare، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام المنصة.',
    },
    {
      title: '٢. وصف الخدمة',
      body: 'تقدم V Welfare أدوات فحص نفسي مبنية على أدلة علمية، وتتبع المزاج، وكتابة اليوميات. المنصة مخصصة للأغراض المعلوماتية والفحص الذاتي فقط، وليست بديلاً عن التشخيص السريري أو العلاج النفسي.',
    },
    {
      title: '٣. إخلاء المسؤولية الطبية',
      body: 'نتائج التقييمات المقدمة من خلال هذه المنصة هي أدوات فحص وليست تشخيصات طبية. إذا كنت تعاني من أعراض نفسية، يرجى استشارة مختص صحي نفسي مؤهل. في حالات الطوارئ، تواصل مع خدمات الطوارئ المحلية فوراً.',
    },
    {
      title: '٤. حساب المستخدم',
      body: 'أنت مسؤول عن الحفاظ على سرية بيانات حسابك. لا يجوز مشاركة بيانات تسجيل الدخول مع أي شخص آخر. يجب إبلاغنا فوراً عن أي استخدام غير مصرح به لحسابك.',
    },
    {
      title: '٥. الخصوصية',
      body: 'نلتزم بحماية خصوصيتك. يرجى الاطلاع على سياسة الخصوصية لمعرفة كيفية جمع بياناتك واستخدامها وحمايتها.',
    },
    {
      title: '٦. التعديلات',
      body: 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية. استمرارك في استخدام المنصة بعد التعديلات يعني قبولك للشروط الجديدة.',
    },
  ] : [
    {
      title: '1. Acceptance of Terms',
      body: 'By using the V Welfare platform, you agree to be bound by these Terms of Service. If you do not agree to any part of these terms, please do not use the platform.',
    },
    {
      title: '2. Description of Service',
      body: 'V Welfare provides evidence-based psychological screening tools, mood tracking, and journaling features. The platform is intended for informational and self-screening purposes only and is not a substitute for clinical diagnosis or professional mental health treatment.',
    },
    {
      title: '3. Medical Disclaimer',
      body: 'Assessment results provided through this platform are screening tools and not medical diagnoses. If you are experiencing mental health symptoms, please consult a qualified mental health professional. In emergencies, contact your local emergency services immediately.',
    },
    {
      title: '4. User Accounts',
      body: 'You are responsible for maintaining the confidentiality of your account credentials. You may not share login details with others. You must notify us immediately of any unauthorized use of your account.',
    },
    {
      title: '5. Privacy',
      body: 'We are committed to protecting your privacy. Please review our Privacy Policy to understand how your data is collected, used, and protected.',
    },
    {
      title: '6. Modifications',
      body: 'We reserve the right to modify these terms at any time. You will be notified of any material changes. Continued use of the platform after modifications constitutes acceptance of the updated terms.',
    },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <BrandLogo variant="icon" size={36} />
            <span className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              V Welfare
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <LanguageToggle lang={lang} />
            <Link href="/login" className="btn-ghost">{isRtl ? 'تسجيل الدخول' : 'Sign in'}</Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium mb-10 hover:opacity-80 transition-opacity" style={{ color: '#1D6296' }}>
          <ArrowLeft className="w-4 h-4" />
          {isRtl ? 'العودة للرئيسية' : 'Back to home'}
        </Link>

        <h1 className="text-[36px] font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {isRtl ? 'شروط الخدمة' : 'Terms of Service'}
        </h1>
        <p className="text-[13.5px] mb-12" style={{ color: 'var(--text-muted)' }}>
          {isRtl ? `آخر تحديث: ${new Date().getFullYear()}` : `Last updated: ${new Date().getFullYear()}`}
        </p>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {section.title}
              </h2>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 card p-6" style={{ background: 'var(--surface-alt)' }}>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'للاستفسارات المتعلقة بهذه الشروط، يرجى التواصل معنا عبر: '
              : 'For questions about these terms, please contact us at: '}
            <a href="mailto:info@vwelfare.com" className="font-semibold hover:underline" style={{ color: '#1D6296' }}>
              info@vwelfare.com
            </a>
          </p>
        </div>
      </div>

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
