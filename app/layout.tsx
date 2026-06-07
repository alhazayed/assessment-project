import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getLanguage } from '@/lib/get-language'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'vWelfare — Mental Health Platform',
  description: 'Compassionate mental health support and assessment platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLanguage()
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
