import { track } from '@vercel/analytics/server'

/**
 * Server-side funnel events (Vercel Web Analytics custom events). Best effort:
 * analytics never breaks a payment or a redeem. Properties must stay free of
 * personal or health data: no emails, names, user ids or scores.
 */
export type ServerEvent = 'package_paid' | 'package_redeemed'

export async function trackServer(
  event: ServerEvent,
  props: Record<string, string | number | boolean | null> = {}
): Promise<void> {
  try {
    await track(event, props)
  } catch (err) {
    console.error('[analytics] track failed:', event, err instanceof Error ? err.message : err)
  }
}
