import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLanguage } from '@/lib/get-language'
import Link from 'next/link'
import { AlertCircle, Brain, ArrowLeft } from 'lucide-react'
import { t } from '@/lib/i18n'

export const metadata = {
  title: 'ADHD Zone Check-in',
  description: 'Quick daily ADHD zone check-in assessment',
}

export default async function ADHDCheckInPage() {
  const supabase = await createClient()
  const lang = await getLanguage()
  const isRtl = lang === 'ar'

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-alt)]"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('nav.adhd_checkin', lang)}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Brain className="w-8 h-8 text-amber-600 dark:text-amber-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {lang === 'ar' ? 'فحص منطقة ADHD' : 'ADHD Zone Check-in'}
          </h2>

          <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'ar'
              ? 'تقييم سريع يومي لمنطقة ADHD الخاصة بك'
              : 'Quick daily assessment of your ADHD zone'}
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 text-left" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {lang === 'ar' ? 'قريب جداً' : 'Coming Soon'}
                </p>
                <p>
                  {lang === 'ar'
                    ? 'ميزة فحص منطقة ADHD الديناميكية قيد التطوير. يسمح لك بسرعة وبشكل يومي بتقييم وتتبع أعراض ADHD لديك.'
                    : 'The dynamic ADHD Zone Check-in feature is currently under development. This will allow you to quickly and daily assess and track your ADHD symptoms.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {lang === 'ar' ? 'ما سيكون متاحاً:' : 'What will be available:'}
            </h3>
            <ul className="space-y-2 text-sm text-left" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>{lang === 'ar' ? 'تقييم يومي سريع لـ 5-10 دقائق' : 'Quick 5-10 minute daily assessment'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>{lang === 'ar' ? 'تتبع الأنماط والاتجاهات على مدار الوقت' : 'Track patterns and trends over time'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>{lang === 'ar' ? 'تنبيهات شخصية وتوصيات' : 'Personalized alerts and recommendations'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>{lang === 'ar' ? 'مشاركة مع الأخصائيين' : 'Share with healthcare providers'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>{lang === 'ar' ? 'رؤى قائمة على الذكاء الاصطناعي' : 'AI-powered insights'}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={user ? '/dashboard' : '/login'}
              className="btn-accent w-full justify-center"
            >
              {user
                ? (lang === 'ar' ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard')
                : (lang === 'ar' ? 'دخول للمتابعة' : 'Sign In to Continue')}
            </Link>
            <Link
              href="/"
              className="btn-ghost w-full justify-center"
            >
              {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
