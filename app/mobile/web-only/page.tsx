import Link from 'next/link'
import { getLanguage } from '@/lib/get-language'

export const metadata = {
  robots: { index: false, follow: false },
}

// Shown to admin accounts opening the native app: admin surfaces are web-only.
// This route lives outside the (app) group so it is never itself subject to the
// admin→notice redirect (which would loop).
export default async function WebOnlyNoticePage() {
  const lang = await getLanguage()
  const isAr = lang === 'ar'

  const t = isAr
    ? {
        title: 'الوصول الإداري عبر الويب فقط',
        body: 'حسابات المشرفين لا يمكنها استخدام تطبيق الجوال لأسباب أمنية. يرجى تسجيل الدخول من متصفح على جهاز الكمبيوتر للوصول إلى لوحة الإدارة.',
        cta: 'افتح النسخة الإلكترونية',
      }
    : {
        title: 'Admin access is web-only',
        body: 'For security, administrator accounts cannot use the mobile app. Please sign in from a desktop browser to reach the admin console.',
        cta: 'Open the web app',
      }

  return (
    <main
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        textAlign: 'center',
        padding: '32px',
        backgroundColor: '#12273C',
        color: '#ffffff',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1D6296',
          fontSize: 32,
        }}
      >
        🔒
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.title}</h1>
      <p style={{ maxWidth: '26rem', lineHeight: 1.6, opacity: 0.85, margin: 0 }}>{t.body}</p>
      <Link
        href="https://app.vwelfare.com"
        style={{
          marginTop: 8,
          padding: '12px 24px',
          borderRadius: 10,
          backgroundColor: '#F3650A',
          color: '#ffffff',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        {t.cta}
      </Link>
    </main>
  )
}
