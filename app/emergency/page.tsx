import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Phone, ExternalLink, ArrowLeft } from 'lucide-react'
import { getLanguage } from '@/lib/get-language'
import { CRISIS_LINES, CRISIS_HELPLINE_URL } from '@/lib/crisis-resources'

export const metadata: Metadata = {
  title: 'Emergency Resources · موارد الطوارئ | V Welfare',
  description:
    'Crisis support and emergency mental health resources. If you are in immediate danger, contact emergency services. الدعم في الأزمات وموارد الصحة النفسية الطارئة.',
  robots: { index: true, follow: true },
}

/**
 * Public emergency/crisis-support page. Server component: reads language via the
 * Next 16 async getLanguage() and renders fully bilingual, RTL-aware content.
 * This is informational only — not an emergency service.
 *
 * Colours are pinned to a light palette with inline styles on purpose: the
 * global `.dark .bg-white` / `.dark .text-gray-*` remaps (globals.css) turned
 * the cards navy while the phone numbers stayed dark blue (~1.5:1), making the
 * numbers unreadable for anyone whose OS is in dark mode. Inline styles are not
 * touched by those class remaps, so this page always reads the same.
 */
const C = {
  page: '#FFF5F5',
  card: '#FFFFFF',
  heading: '#7F1D1D',
  body: '#374151',
  muted: '#4B5563',
  phone: '#1E3A8A',
  phoneBorder: '#1E40AF',
  danger: '#DC2626',
  calm: '#EFF6FF',
  border: '#E5E7EB',
}
export default async function EmergencyPage() {
  const lang = await getLanguage()
  const isAr = lang === 'ar'

  const copy = {
    back: isAr ? 'العودة إلى الصفحة الرئيسية' : 'Back to home',
    heading: isAr ? 'الطوارئ ودعم الأزمات' : 'Emergency & Crisis Support',
    intro: isAr
      ? 'إذا كنت أنت أو شخص تعرفه في خطر مباشر، فيرجى الاتصال بخدمات الطوارئ فوراً. «V Welfare» أداة فحص وليست رعاية طارئة.'
      : 'If you or someone you know is in immediate danger, please contact emergency services right away. V Welfare is a screening tool — not emergency care.',
    reassure: isAr
      ? 'أنت لست وحدك. طلب المساعدة علامة قوة. مستشارو الأزمات المدرَّبون متاحون على مدار الساعة. إذا كنت تفكر في إيذاء نفسك، فاتصل بأحد الأرقام أدناه فوراً.'
      : 'You are not alone. Reaching out for help is a sign of strength. Trained crisis counselors are available 24/7. If you are thinking about harming yourself, please call one of the numbers below immediately.',
    findHelpline: isAr ? 'ابحث عن خط مساعدة في بلدك' : 'Find a helpline in your country',
    wellbeing: isAr
      ? 'صحتك النفسية مهمة. الدعم النفسي المتخصص متاح والتعافي ممكن.'
      : 'Your wellbeing matters. Professional mental health support is available and recovery is possible.',
    additional: isAr ? 'موارد إضافية' : 'Additional resources',
    textLine: isAr
      ? 'خط الرسائل للأزمات (الولايات المتحدة): أرسل HOME إلى 741741'
      : 'Crisis Text Line (US): Text HOME to 741741',
    iasp: isAr ? 'الرابطة الدولية للوقاية من الانتحار:' : 'International Association for Suicide Prevention:',
    disclaimer: isAr
      ? '«V Welfare» لا تقدّم خدمات طوارئ. هذه الصفحة لأغراض إعلامية فقط.'
      : 'V Welfare does not provide emergency services. This page is for informational purposes only.',
  }

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen" style={{ backgroundColor: C.page, colorScheme: 'light' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-11 text-sm hover:underline mb-6"
          style={{ color: C.muted }}
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} aria-hidden="true" />
          {copy.back}
        </Link>

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.danger }}>
            <AlertTriangle className="w-10 h-10 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: C.heading }}>{copy.heading}</h1>
          <p className="text-sm" style={{ color: C.muted }}>{copy.intro}</p>
        </div>

        <div
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: C.card, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderInlineStartWidth: 4, borderInlineStartStyle: 'solid', borderInlineStartColor: '#EF4444' }}
        >
          <p className="leading-relaxed" style={{ color: C.body }}>{copy.reassure}</p>
        </div>

        <div className="space-y-3 mb-8">
          {CRISIS_LINES.map(line => (
            <a
              key={line.number}
              href={`tel:${line.tel ?? line.number.replace(/\D/g, '')}`}
              className="flex items-center gap-4 rounded-2xl p-4 border-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: C.card, borderColor: C.phoneBorder, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.phoneBorder }}>
                <Phone className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm" style={{ color: C.muted }}>{isAr ? line.country_ar : line.country_en}</p>
                <p className="text-lg font-bold" style={{ color: C.phone }} dir="ltr">{line.number}</p>
              </div>
            </a>
          ))}
        </div>

        <a
          href={CRISIS_HELPLINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-semibold mb-6 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1D6296' }}
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          {copy.findHelpline}
        </a>

        <div className="rounded-2xl p-6 text-center mb-6" style={{ backgroundColor: C.calm }}>
          <p className="text-3xl mb-2" aria-hidden="true">💙</p>
          <p className="font-medium leading-relaxed" style={{ color: C.phone }}>{copy.wellbeing}</p>
        </div>

        <div className="rounded-2xl p-5 border text-sm space-y-2" style={{ backgroundColor: C.card, borderColor: C.border, color: C.muted }}>
          <p className="font-semibold" style={{ color: C.body }}>{copy.additional}</p>
          <p>{copy.textLine}</p>
          <p>
            {copy.iasp}{' '}
            <a
              href="https://www.iasp.info/resources/Crisis_Centres/"
              className="underline"
              style={{ color: C.phoneBorder }}
              target="_blank"
              rel="noopener noreferrer"
            >
              iasp.info
            </a>
          </p>
          <p className="pt-2 text-sm border-t" style={{ color: C.muted, borderColor: C.border }}>{copy.disclaimer}</p>
        </div>
      </div>
    </main>
  )
}
