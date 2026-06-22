'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

export default function LandingMobileMenu({ lang, isLoggedIn = false }: { lang: Lang; isLoggedIn?: boolean }) {
  const [open, setOpen] = useState(false)
  const isRtl = lang === 'ar'

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--surface-alt)]"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={close}
          />
          {/* Drawer */}
          <div
            className={`fixed top-0 ${isRtl ? 'left-0' : 'right-0'} z-50 h-full w-72 flex flex-col shadow-2xl`}
            style={{ backgroundColor: 'var(--surface)' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-16 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="font-extrabold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                V Welfare
              </span>
              <button
                onClick={close}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[var(--surface-alt)]"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1 p-4">
              {[
                { href: '#services', labelKey: 'nav.services' as const },
                { href: '#assessments', labelKey: 'nav.assessments' as const },
                { href: '#about', labelKey: 'nav.about' as const },
              ].map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-alt)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t(item.labelKey, lang)}
                </a>
              ))}
            </nav>

            {/* Auth / dashboard buttons */}
            <div className="mt-auto p-4 flex flex-col gap-3 border-t" style={{ borderColor: 'var(--border)' }}>
              {isLoggedIn ? (
                <Link href="/dashboard" onClick={close} className="btn-accent w-full justify-center text-center">
                  {t('nav.dashboard', lang)}
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={close} className="btn-ghost w-full justify-center text-center">
                    {t('nav.signin', lang)}
                  </Link>
                  <Link href="/register" onClick={close} className="btn-accent w-full justify-center text-center">
                    {t('nav.signup', lang)}
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
