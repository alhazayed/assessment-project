import type { Metadata } from 'next'
import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'GDPR-compliant privacy policy for V Welfare. Learn how we collect, use, store, and protect your personal and mental health data. Your privacy and security are our priority.',
  robots: { index: true, follow: true },
}

export default async function PrivacyPage() {
  const lang = await getLanguage()
  const isRtl = lang === 'ar'

  const sections = isRtl ? [
    {
      title: '١. معلومات المسؤول عن البيانات',
      body: 'يتم التحكم في بياناتك الشخصية من قِبل V Welfare ("نحن"، "الشركة"). نحن منصة رقمية للتقييمات النفسية والصحة العقلية. البريد الإلكتروني: info@vwelfare.com. نتعاون مع معالجات بيانات موثوقة: Supabase (استضافة قواعد البيانات والتخزين)، Vercel (استضافة التطبيق والحوسبة)، Google Gemini (معالجة الملاحظات الإكلينيكية المدعومة بالذكاء الاصطناعي).',
    },
    {
      title: '٢. البيانات التي نجمعها ولماذا',
      body: 'نجمع البيانات الشخصية فقط بموافقتك الصريحة، بما في ذلك: الاسم الكامل والبريد الإلكتروني (الأساس: تنفيذ العقد)؛ نتائج التقييمات النفسية والمزاج والمذكرات (الأساس: تنفيذ الخدمة)؛ بيانات ديموغرافية (العمر، الجنس، التحصيل العلمي) إذا اخترت إضافتها (الأساس: الموافقة)؛ بيانات طبية حساسة مثل الأدوية والحالات الطبية المستهدفة (الأساس: الموافقة والغرض الطبي)؛ معلومات تواصل الطوارئ (الأساس: السلامة).',
    },
    {
      title: '٣. مشاركة البيانات',
      body: 'لا نبيع أو نشارك بياناتك مع أطراف ثالثة للتسويق. البيانات قد تُشارك فقط مع: (أ) المختص النفسي المُعيَّن إذا وافقت؛ (ب) معالجات البيانات الموثوقة (Supabase، Vercel)؛ (ج) السلطات القانونية إذا اقتضت ضرورة قانونية أو سلامة؛ (د) في حالة عملية بيع الشركة، قد تنتقل بياناتك مع الأصول مع حقوقك محفوظة.',
    },
    {
      title: '٤. مدة احتفاظنا ببياناتك',
      body: 'نحتفظ بحسابك وبياناتك طالما كان نشطاً. عند حذف حسابك: بيانات التقييم تُحتفظ لمدة 30 يوم للاسترجاع؛ سجل المزاج والمذكرات تُحذف فوراً؛ بيانات الدعم والفواتير تُحتفظ لمدة 7 سنوات (متطلبات قانونية)؛ سجلات المراجعة (الوصول، الأخطاء) تُحتفظ لمدة 90 يوماً.',
    },
    {
      title: '٥. حقوقك بموجب القانون',
      body: 'لديك الحق في: (أ) الوصول إلى بياناتك (طلب SAR)؛ (ب) تصحيح البيانات غير الدقيقة؛ (ج) طلب الحذف ("الحق في أن تُنسى")؛ (د) تقييد المعالجة؛ (هـ) نقل بياناتك (البيانات المحمولة)؛ (و) الاعتراض على المعالجة. للممارسة: info@vwelfare.com.',
    },
    {
      title: '٦. أمان البيانات',
      body: 'نستخدم: TLS 1.3 للنقل، AES-256 للتخزين، المصادقة الآمنة (JWT)، RLS في قاعدة البيانات، المراجعة المستمرة للأمان. الموظفون فقط لديهم وصول محدود بالضرورة. لا نوصي أبداً برسالة بكلمة المرور.',
    },
    {
      title: '٧. ملفات تعريف الارتباط',
      body: 'نستخدم فقط ملفات "strictly necessary" لجلسات التسجيل واللغة والمظهر. لا توجد ملفات تتبعية أو إعلانات. انقر "إدارة التفضيلات" لضبط الموافقة.',
    },
    {
      title: '٨. بيانات الأطفال',
      body: 'الخدمة للبالغين فقط (18+). لا نقبل البيانات من الأطفال تحت 16 سنة عن قصد. إذا علمنا بخرق هذا، نحذف البيانات فوراً.',
    },
    {
      title: '٩. التحويلات الدولية',
      body: 'قد تُعالج بيانات في دول أخرى (مثل US لـ Vercel). نلتزم ببروتوكولات الحماية (اتفاقات معالجة، الشروط الالتزام).',
    },
    {
      title: '١٠. التنبيهات والتغييرات',
      body: 'قد نحدث هذه السياسة. سنُخطرك بالبريد الإلكتروني للتغييرات المادية. استخدام الخدمة بعد التغييرات يعني الموافقة.',
    },
    {
      title: '١١. بيان إخلاء المسؤولية الطبي',
      body: 'هذه الخدمة لا تحل محل التشخيص أو المشورة الطبية المهنية. إذا كنت في أزمة: اتصل بخدمات الطوارئ أو خط الأزمة المحلي فوراً.',
    },
  ] : [
    {
      title: '1. Data Controller & Processors',
      body: 'V Welfare is the data controller ("we", "us"). Email: info@vwelfare.com. We use trusted data processors: Supabase (database and storage), Vercel (application hosting), Google Gemini (AI-assisted clinical note processing).',
    },
    {
      title: '2. Data We Collect & Why',
      body: 'We collect personal data only with your consent: Account data (name, email) – basis: contract performance; assessment results, mood logs, journal entries – basis: service delivery; demographics (age, gender, education) – basis: consent; sensitive medical data (medications, diagnoses) – basis: consent and medical purpose; emergency contact – basis: safety.',
    },
    {
      title: '3. Data Sharing',
      body: 'We do not sell or share data for marketing. Data is shared only with: (a) your assigned clinician if you consent; (b) trusted data processors (Supabase, Vercel); (c) legal authorities if legally required or for safety; (d) in a corporate sale, data transfers with protections maintained.',
    },
    {
      title: '4. Data Retention',
      body: 'While your account is active, we retain all data. On deletion: assessment scores held 30 days for recovery; mood logs and journals deleted immediately; support records and invoices retained 7 years (legal requirements); audit logs retained 90 days.',
    },
    {
      title: '5. Your Rights',
      body: 'You have the right to: (a) access your data (Subject Access Request); (b) correct inaccurate data; (c) request deletion (right to be forgotten); (d) restrict processing; (e) data portability; (f) object to processing. To exercise: info@vwelfare.com.',
    },
    {
      title: '6. Data Security',
      body: 'We use: TLS 1.3 for transmission, AES-256 for storage, secure authentication (JWT), Row-Level Security (RLS) at database, continuous security audits. Staff access is limited by necessity. We never email your password.',
    },
    {
      title: '7. Cookies & Tracking',
      body: 'We use only strictly necessary cookies for login sessions and language/theme preferences. No tracking or advertising cookies. Click "Manage Preferences" to control consent.',
    },
    {
      title: '8. Children\'s Data',
      body: 'This service is for adults only (18+). We do not intentionally collect data from children under 16. If we become aware of such data, we delete it immediately.',
    },
    {
      title: '9. International Transfers',
      body: 'Data may be processed in other countries (e.g., US for Vercel). We comply with data transfer protections (Standard Contractual Clauses, adequacy agreements).',
    },
    {
      title: '10. Policy Updates',
      body: 'We may update this policy. Material changes are notified by email. Continued use after changes means acceptance.',
    },
    {
      title: '11. Medical Disclaimer',
      body: 'This service does not replace professional medical diagnosis or advice. If in crisis, contact emergency services or your local crisis line immediately.',
    },
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
          {isRtl ? 'آخر تحديث: ٣٠ يونيو ٢٠٢٦' : 'Last updated: June 30, 2026'}
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
