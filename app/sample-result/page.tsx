import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'
import { ArrowLeft, AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, Info } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'
import DarkModeToggle from '@/components/dark-mode-toggle'
import LanguageToggle from '@/components/language-toggle'

export default function SampleResultPage() {
  const lang = getLanguage()
  const isRtl = lang === 'ar'

  const recommendations = isRtl ? [
    'تحدّث مع طبيبك أو مختص نفسي حول نتائج هذا التقييم',
    'فكّر في الانضمام إلى جلسات العلاج المعرفي السلوكي (CBT)',
    'مارس نشاطاً بدنياً منتظماً لمدة 30 دقيقة على الأقل يومياً',
    'حافظ على نظام نوم منتظم وتجنب الكافيين قبل النوم',
  ] : [
    'Speak with your doctor or a mental health professional about these results',
    'Consider joining Cognitive Behavioral Therapy (CBT) sessions',
    'Engage in regular physical activity for at least 30 minutes daily',
    'Maintain a consistent sleep schedule and avoid caffeine before bedtime',
  ]

  const followUps = isRtl ? [
    { name: 'مقياس القلق العام - GAD-7', desc: 'لتقييم مستوى القلق المصاحب للاكتئاب', href: '/assessments' },
    { name: 'مقياس الاكتئاب والقلق والضغط - DASS-21', desc: 'تقييم شامل لثلاثة أبعاد نفسية', href: '/assessments' },
  ] : [
    { name: 'Generalized Anxiety Disorder Scale - GAD-7', desc: 'To assess anxiety levels accompanying depression', href: '/assessments' },
    { name: 'Depression Anxiety Stress Scale - DASS-21', desc: 'Comprehensive assessment across three psychological dimensions', href: '/assessments' },
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
            <Link href="/register" className="btn-accent">{isRtl ? 'إنشاء حساب' : 'Create account'}</Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium mb-8 hover:opacity-80 transition-opacity" style={{ color: '#1D6296' }}>
          <ArrowLeft className="w-4 h-4" />
          {isRtl ? 'العودة للرئيسية' : 'Back to home'}
        </Link>

        {/* Sample badge */}
        <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold mb-6" style={{ background: '#FEF2EC', color: '#F3650A', border: '1px solid #FBC29D' }}>
          <Info className="w-3.5 h-3.5" />
          {isRtl ? 'نتيجة تجريبية — هذا مثال توضيحي' : 'Sample result — this is a demonstration'}
        </div>

        {/* Assessment header */}
        <div className="card p-7 mb-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[12.5px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                {isRtl ? 'مقياس فيلادلفيا للاكتئاب' : 'Patient Health Questionnaire'}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                PHQ-9
              </h1>
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {isRtl ? 'تاريخ التقييم: ١٥ يونيو ٢٠٢٥' : 'Assessment date: June 15, 2025'}
              </p>
            </div>
            <span className="badge-moderate flex-shrink-0">
              {isRtl ? 'اكتئاب متوسط' : 'Moderate Depression'}
            </span>
          </div>

          {/* Score display */}
          <div className="flex items-center gap-6 py-5" style={{ borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)' }}>
            <div className="text-center">
              <p className="text-5xl font-black" style={{ color: '#1D6296', letterSpacing: '-0.03em' }}>12</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {isRtl ? 'النتيجة' : 'Score'}
              </p>
            </div>
            <div className="text-center" style={{ color: 'var(--text-muted)' }}>
              <p className="text-2xl font-bold">/</p>
            </div>
            <div className="text-center">
              <p className="text-5xl font-black" style={{ color: 'var(--text-muted)', letterSpacing: '-0.03em' }}>27</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {isRtl ? 'الحد الأقصى' : 'Maximum'}
              </p>
            </div>
            <div className="flex-1 ms-4">
              <div className="progress-track" style={{ height: '10px' }}>
                <div className="progress-fill" style={{ width: `${(12/27)*100}%`, background: '#F59E0B' }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{isRtl ? 'لا يوجد' : 'None'}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{isRtl ? 'شديد جداً' : 'Severe'}</span>
              </div>
            </div>
          </div>

          {/* Severity scale */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {(isRtl
              ? [
                  { range: '0–4', label: 'لا يوجد', cls: 'badge-minimal' },
                  { range: '5–9', label: 'خفيف', cls: 'badge-mild' },
                  { range: '10–14', label: 'متوسط', cls: 'badge-moderate' },
                  { range: '15–27', label: 'شديد', cls: 'badge-severe' },
                ]
              : [
                  { range: '0–4', label: 'None', cls: 'badge-minimal' },
                  { range: '5–9', label: 'Mild', cls: 'badge-mild' },
                  { range: '10–14', label: 'Moderate', cls: 'badge-moderate' },
                  { range: '15–27', label: 'Severe', cls: 'badge-severe' },
                ]
            ).map((band) => (
              <div key={band.range} className="text-center py-2 rounded-[8px]" style={{ background: 'var(--surface-alt)' }}>
                <span className={`${band.cls} text-[11px]`}>{band.label}</span>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{band.range}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical explanation */}
        <div className="card p-6 mb-5">
          <h2 className="text-[15px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {isRtl ? 'التفسير السريري' : 'Clinical Explanation'}
          </h2>
          <p className="text-[14px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'نتيجتك تشير إلى مستوى متوسط من أعراض الاكتئاب. هذا يعني أن الأعراض تؤثر بشكل ملموس على حياتك اليومية وتستدعي الاهتمام المهني.'
              : 'Your score indicates a moderate level of depressive symptoms. This means symptoms are having a noticeable impact on your daily functioning and warrant professional attention.'}
          </p>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'مقياس PHQ-9 هو أداة فحص مستخدمة على نطاق واسع في البحث السريري والرعاية الصحية الأولية. الدرجات بين 10 و14 مرتبطة بانخفاض ملحوظ في الأداء الوظيفي اليومي.'
              : 'The PHQ-9 is a widely used screening tool in clinical research and primary care. Scores between 10 and 14 are associated with a notable decrease in daily functional performance.'}
          </p>
        </div>

        {/* Recommendations */}
        <div className="card p-6 mb-5">
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {isRtl ? 'التوصيات' : 'Recommendations'}
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#E6F4EC' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#1B8A5A' }} />
                </div>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Crisis notice */}
        <div className="safety-strip mb-5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F3650A' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
            {isRtl
              ? 'إذا كانت لديك أفكار لإيذاء نفسك، يرجى التواصل مع خدمات الطوارئ فوراً أو الذهاب إلى أقرب طوارئ.'
              : 'If you are having thoughts of self-harm, please contact emergency services immediately or go to your nearest emergency department.'}
          </p>
        </div>

        {/* Suggested follow-ups */}
        <div className="card p-6 mb-8">
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {isRtl ? 'تقييمات مقترحة للمتابعة' : 'Suggested Follow-up Assessments'}
          </h2>
          <div className="space-y-3">
            {followUps.map((fu) => (
              <div key={fu.name} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
                <div>
                  <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{fu.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{fu.desc}</p>
                </div>
                <Link href={fu.href} className="text-[12.5px] font-semibold flex items-center gap-1 flex-shrink-0" style={{ color: '#1D6296' }}>
                  {isRtl ? 'ابدأ' : 'Start'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="card p-8 text-center" style={{ background: 'linear-gradient(135deg, #EAF2F9 0%, #E6F4EC 100%)' }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-4" style={{ color: '#1D6296' }} />
          <h2 className="text-xl font-extrabold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {isRtl ? 'جاهز لتتبع صحتك النفسية؟' : 'Ready to track your mental health?'}
          </h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-secondary)' }}>
            {isRtl
              ? 'أنشئ حساباً مجانياً لحفظ نتائجك، تتبع تقدمك، والتواصل مع مختص.'
              : 'Create a free account to save your results, track progress over time, and connect with a clinician.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-accent gap-2">
              {isRtl ? 'إنشاء حساب مجاني' : 'Create free account'}
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/assessments" className="btn-ghost gap-2">
              <ClipboardList className="w-4 h-4" />
              {isRtl ? 'تصفح التقييمات' : 'Browse assessments'}
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-8 px-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {isRtl
            ? `© ${new Date().getFullYear()} V Welfare. للفحص فقط — ليس بديلاً عن التشخيص السريري.`
            : `© ${new Date().getFullYear()} V Welfare. For screening only — not a substitute for clinical diagnosis.`}
        </p>
      </footer>
    </div>
  )
}
