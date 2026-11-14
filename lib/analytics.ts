'use client'

import { track } from '@vercel/analytics'

/**
 * Client-side funnel events (Vercel Web Analytics custom events): did people
 * see a package, start checkout, see the free summary, click from it to a
 * package. Best effort. Properties must stay free of personal or health data:
 * no emails, names, user ids or scores.
 */
export type ClientEvent =
  | 'package_viewed'
  | 'checkout_started'
  | 'synthesis_viewed'
  | 'synthesis_package_click'

export function trackEvent(event: ClientEvent, props: Record<string, string | number | boolean | null> = {}): void {
  try {
    track(event, props)
  } catch {
    // Analytics must never break the page.
  }
}
