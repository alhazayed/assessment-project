import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'

export default function PrivacyPage() {
  const lang = getLanguage()
  const isRtl = lang === 'ar'

  const sections = isRtl ? [
    {
      title: '١. ما البيانات التي نجمعها؟',
      body: 'نجمع المعلومات التي تقدمها عند إنشاء حسابك (الاسم، البريد الإلكتروني)، نتائج التقييمات النفسية، سجلات المزاج، وإدخالات اليوميات. لا نجمع أي بيانات بدون موافقتك الصريحة.',
    },
    {
      title: '٢. كيف نستخدم بياناتك؟',
      body: 'نستخدم بياناتك لتقديم خدمات المنصة، وعرض تاريخ تقييماتك، وتتبع تقدمك الزمني. لا نبيع بياناتك لأطراف ثالثة ولا نستخدمها لأغراض تجارية.',
    },
    {
      title: '٣. مشاركة البيانات',
      body: 'بياناتك خاصة وسرية. الوصول الوحيد المسموح به هو: (أ) أنت شخصياً، (ب) المختص النفسي المُعيَّن لك إذا وافقت على ذلك. لا نشارك بياناتك مع أي جهة خارجية إلا في حالات يقتضيها القانون.',
    },
    {
      title: '٤. أمان البيانات',
      body: 'نستخدم تشفيراً من النوع AES-256 لتخزين البيانات، وبروتوكول TLS لنقلها. تتم مصادقة المستخدمين بشكل آمن عبر Supabase Auth. تطبق قواعد RLS (أمان مستوى الصفوف) لضمان أن كل مستخدم يصل فقط لبياناته.',
    },
    {
      title: '٥. حقوق المستخدم',
      body: 'لديك الحق في الوصول إلى بياناتك، تصحيحها، وطلب حذفها في أي وقت. يمكنك تصدير بياناتك أو حذف حسابك عبر إعدادات الملف الشخصي أو بالتواصل مع فريق الدعم.',
    },
    {
      title: '٦. ملفات تعريف الارتباط',
      body: 'نستخدم ملفات تعريف الارتباط الضرورية فقط للحفاظ على جلسة تسجيل الدخول وتفضيلات اللغة والوضع المظلم. لا نستخدم ملفات تعريف الارتباط التسويقية أو التتبعية.',
    },
  ] : [
    {
      title: '1. What Data Do We Collect?',
      body: 'We collect information you provide when creating your account (name, email), your psychological assessment results, mood logs, and journal entries. We do not collect any data without your explicit consent.',
    },
    {
      title: '2. How Do We Use Your Data?',
      body: 'We use your data to provide platform services, display your assessment history, and track your progress over time. We do not sell your data to third parties or use it for commercial purposes.',
    },
    {
      title: '3. Data Sharing',
      body: 'Your data is private and confidential. Access is only permitted to: (a) yourself, (b) your assigned clinician if you have consented to this. We do not share your data with any external parties except where required by law.',
    },
    {
      title: '4. Data Security',
      body: 'We use AES-256 encryption for data storage and TLS for transmission. Users are securely authenticated via Supabase Auth. Row Level Security (RLS) policies ensure each user can only access their own data.',
    },
    {
      title: '5. Your Rights',
      body: 'You have the right to access, correct, and request deletion of your data at any time. You can export your data or delete your account through your profile settings or by contacting our support team.',
    },
    {
      title: '6. Cookies',
      body: 'We use only strictly necessary cookies to maintain your login session and preferences such as language and dark mode. We do not use marketing or tracking cookies.',
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
          {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
              ? 'لممارسة حقوقك أو للاستفسار عن سياسة الخصوصية، تواصل معنا: '
              : 'To exercise your rights or inquire about this policy, contact us: '}
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
