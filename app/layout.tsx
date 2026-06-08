import type { Metadata } from 'next'
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { getLanguage } from '@/lib/get-language'

const inter = Inter({
  subsets: ['latin'],
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
  title: 'vWelfare — Mental Health Platform',
  description: 'Compassionate mental health support and assessment platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLanguage()
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`${inter.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  )
}
