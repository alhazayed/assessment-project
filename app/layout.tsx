import type { Metadata } from 'next'
import { Jost, IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { getLanguage } from '@/lib/get-language'

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-latin',
  display: 'swap',
})

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'V Welfare — Mental Health Platform',
  description: 'Compassionate mental health support and assessment platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLanguage()
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`${jost.variable} ${arabic.variable}`}>
      {/* Anti-flash: apply saved dark preference before first paint */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('vw-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
