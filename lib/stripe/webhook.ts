import crypto from 'crypto'

/**
 * Stripe webhook signature verification — implemented without the Stripe SDK.
 *
 * Stripe signs each webhook with the endpoint's signing secret (whsec_...).
 * The `Stripe-Signature` header looks like:
 *
 *   t=1492774577,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd,v0=...
 *
 * Verification recreates the signed payload (`${timestamp}.${rawBody}`),
 * computes an HMAC-SHA256 with the signing secret, and compares it against
 * the `v1` signature using a constant-time comparison. We also enforce a
 * timestamp tolerance to mitigate replay attacks.
 *
 * Docs: https://stripe.com/docs/webhooks/signatures
 */

export interface StripeEvent {
  id: string
  type: string
  created: number
  data: {
    object: Record<string, any>
  }
  [key: string]: any
}

export class StripeWebhookError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StripeWebhookError'
  }
}

interface SignatureParts {
  timestamp: number
  signatures: string[]
}

function parseSignatureHeader(header: string): SignatureParts {
  const parts = header.split(',')
  let timestamp = -1
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 't') {
      timestamp = parseInt(value, 10)
    } else if (key === 'v1') {
      signatures.push(value)
    }
  }

  if (timestamp === -1 || signatures.length === 0) {
    throw new StripeWebhookError('Unable to extract timestamp and signatures from header')
  }

  return { timestamp, signatures }
}

function computeSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')
}

/**
 * Verify a Stripe webhook payload and return the parsed event.
 *
 * @param rawBody   The exact raw request body string (do NOT re-stringify JSON).
 * @param signature The value of the `Stripe-Signature` header.
 * @param secret    The webhook signing secret (whsec_...).
 * @param tolerance Allowed clock skew in seconds (default 300).
 * @throws StripeWebhookError if verification fails.
 */
export function constructEvent(
  rawBody: string,
  signature: string | null,
  secret: string,
  tolerance = 300
): StripeEvent {
  if (!signature) {
    throw new StripeWebhookError('Missing Stripe-Signature header')
  }
  if (!secret) {
    throw new StripeWebhookError('Missing webhook signing secret')
  }

  const { timestamp, signatures } = parseSignatureHeader(signature)

  // Recreate the signed payload and compute the expected signature.
  const signedPayload = `${timestamp}.${rawBody}`
  const expectedSignature = computeSignature(signedPayload, secret)

  // Constant-time comparison against each provided v1 signature.
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const matched = signatures.some((sig) => {
    const sigBuffer = Buffer.from(sig, 'hex')
    if (sigBuffer.length !== expectedBuffer.length) return false
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  })

  if (!matched) {
    throw new StripeWebhookError('Signature verification failed')
  }

  // Replay protection: reject events outside the tolerance window.
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > tolerance) {
    throw new StripeWebhookError('Timestamp outside the tolerance window')
  }

  try {
    return JSON.parse(rawBody) as StripeEvent
  } catch {
    throw new StripeWebhookError('Invalid JSON payload')
  }
}
