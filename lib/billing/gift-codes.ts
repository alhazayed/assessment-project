import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/send'
import { giftCodeEmail } from '@/lib/email/templates'
import { absoluteUrl } from '@/lib/site-url'

/**
 * One-time gift codes for packages bought for someone else.
 *
 * A code is 12 characters from an alphabet without look-alikes (no 0/O, 1/I/L),
 * shown as XXXX-XXXX-XXXX: about 59 bits, so a plain SHA-256 is enough to
 * store it (only the hash is kept). Redemption is atomic in the database
 * (redeem_package_gift_code) and rate limited per user.
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LEN = 12

export function generateGiftCode(): string {
  const bytes = crypto.randomBytes(CODE_LEN)
  let raw = ''
  // 256 % 31 != 0; reject bytes >= 248 to keep the distribution uniform.
  for (let i = 0; raw.length < CODE_LEN; i++) {
    const b = i < bytes.length ? bytes[i] : crypto.randomBytes(1)[0]
    if (b < 248) raw += ALPHABET[b % ALPHABET.length]
  }
  return formatGiftCode(raw)
}

export function formatGiftCode(raw: string): string {
  return raw.match(/.{1,4}/g)!.join('-')
}

/** Uppercase, drop spaces and dashes. Returns null if it cannot be a code. */
export function normalizeGiftCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.toUpperCase().replace(/[\s-]/g, '')
  if (s.length !== CODE_LEN) return null
  for (const ch of s) if (!ALPHABET.includes(ch)) return null
  return s
}

export function hashGiftCode(normalized: string): string {
  return crypto.createHash('sha256').update(`vw-gift:${normalized}`).digest('hex')
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/

export function normalizeGiftEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim().toLowerCase()
  if (s.length > 254 || !EMAIL_RE.test(s)) return null
  return s
}

/**
 * Give a gift row a fresh code and email it to the recipient. Used when the
 * gift is first created and when the buyer asks to resend (the old code stops
 * working, since only the newest hash is stored). Never call it on a redeemed
 * gift. Returns whether the email went out.
 */
export async function issueGiftCode(
  db: SupabaseClient,
  gift: { id: string; recipient_email: string; package_id: string }
): Promise<boolean> {
  const code = generateGiftCode()
  const normalized = normalizeGiftCode(code)!
  const { error } = await db
    .from('package_gift_codes')
    .update({ code_hash: hashGiftCode(normalized), code_hint: normalized.slice(-4), emailed_at: null })
    .eq('id', gift.id)
    .is('redeemed_at', null)
  if (error) throw new Error(`Failed to store gift code: ${error.message}`)

  const { data: pkg } = await db.from('packages').select('name_en, name_ar').eq('id', gift.package_id).maybeSingle()
  const sent = await sendEmail(
    giftCodeEmail({
      to: gift.recipient_email,
      pkg: { en: pkg?.name_en ?? 'Assessment package', ar: pkg?.name_ar ?? 'باقة تقييم' },
      code,
      redeemUrl: absoluteUrl(`/redeem?code=${encodeURIComponent(code)}`),
    })
  )
  if (sent.ok) {
    await db.from('package_gift_codes').update({ emailed_at: new Date().toISOString() }).eq('id', gift.id)
  }
  return sent.ok
}
