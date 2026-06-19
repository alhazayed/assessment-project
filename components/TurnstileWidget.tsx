'use client'

import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileOptions {
  sitekey: string
  callback: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  language?: string
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
  language?: 'en' | 'ar'
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export default function TurnstileWidget({ onToken, onError, onExpire, theme = 'light', language }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const render = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !SITE_KEY) return
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current) } catch {}
    }
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onToken,
      'error-callback': onError,
      'expired-callback': onExpire,
      theme,
      size: 'normal',
      ...(language ? { language } : {}),
    })
  }, [onToken, onError, onExpire, theme, language])

  useEffect(() => {
    if (!SITE_KEY) return

    if (window.turnstile) {
      render()
      return
    }

    window.onTurnstileLoad = render

    const existing = document.querySelector('script[data-turnstile]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
      script.async = true
      script.defer = true
      script.setAttribute('data-turnstile', 'true')
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
      }
    }
  }, [render])

  if (!SITE_KEY) return null

  return <div ref={containerRef} className="mt-3" />
}
