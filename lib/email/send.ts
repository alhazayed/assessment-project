/**
 * Transactional email through Resend's HTTP API (no SDK dependency).
 *
 * Needs RESEND_API_KEY, and EMAIL_FROM set to a sender on a domain verified
 * in Resend (e.g. "V Welfare <no-reply@vwelfare.com>"). Without a key it sends
 * nothing and reports `not_configured`, so local and preview builds work.
 *
 * Never log the email body: gift emails carry a redeemable code.
 */

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export type SendResult = { ok: true; id: string | null } | { ok: false; reason: 'not_configured' | 'failed' }

const DEFAULT_FROM = 'V Welfare <no-reply@vwelfare.com>'

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY is not set; email not sent')
    return { ok: false, reason: 'not_configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    })
    if (!res.ok) {
      console.error(`[email] Resend returned ${res.status}`)
      return { ok: false, reason: 'failed' }
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: data.id ?? null }
  } catch (err) {
    console.error('[email] send failed:', err instanceof Error ? err.message : 'unknown error')
    return { ok: false, reason: 'failed' }
  }
}
