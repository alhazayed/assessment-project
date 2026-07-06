import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter, Tajawal } from 'next/font/google'
import './globals.css'
import { getLanguage } from '@/lib/get-language'
import NativeBootstrap from '@/components/native/NativeBootstrap'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'V Welfare — Mental Health Assessment Platform',
    template: '%s | V Welfare',
  },
  description: 'Compassionate, science-backed mental health assessments and wellbeing tools. Take validated psychometric assessments in Arabic and English.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vwelfare.vercel.app'),
  alternates: {
    canonical: '/',
    languages: {
      'en': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vwelfare.vercel.app',
      'ar': `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vwelfare.vercel.app'}/?lang=ar`,
      'x-default': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vwelfare.vercel.app',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'V Welfare',
    title: 'V Welfare — Mental Health Assessment Platform',
    description: 'Science-backed mental health assessments and wellbeing tools in Arabic and English.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vwelfare.vercel.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'V Welfare Mental Health Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'V Welfare — Mental Health Assessment Platform',
    description: 'Science-backed mental health assessments and wellbeing tools.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLanguage()
  const headersList = headers()
  const nonce = headersList.get('x-nonce') || ''

  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`${inter.variable} ${tajawal.variable}`} suppressHydrationWarning>
      {/* Anti-flash: apply saved dark preference before first paint */}
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('vw-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      </head>
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded focus:shadow-lg"
        >
          {lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
        </a>
        {children}
        <NativeBootstrap />
      </body>
    </html>
  )
}
