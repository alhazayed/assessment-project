'use client'

import { useEffect } from 'react'
import { trackEvent, type ClientEvent } from '@/lib/analytics'

/** Sends one analytics event when the page shows (no personal or health data). */
export default function TrackOnView({ event, props }: { event: ClientEvent; props?: Record<string, string | number | boolean | null> }) {
  const key = JSON.stringify(props ?? {})
  useEffect(() => {
    trackEvent(event, JSON.parse(key))
  }, [event, key])
  return null
}
