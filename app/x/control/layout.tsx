import type { Metadata } from 'next'

// The whole admin tree (/x/control, including the login page) must never be
// indexed or have its links followed. Setting it here covers every child
// route, so the path does not need to be named in robots.txt.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default function AdminControlRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
