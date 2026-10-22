// Single source of truth for the Gemini model. `gemini-1.5-flash` is retired;
// override with GEMINI_MODEL (e.g. a newer flash model) without a code change.
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
  GEMINI_MODEL
)}:generateContent`

const RETRYABLE_STATUS = new Set([429, 500, 502, 503])
const MAX_ATTEMPTS = 3
const TIMEOUT_MS = 25_000

// 2.5-series models "think" by default, and thinking tokens count against
// maxOutputTokens. Our callers use small budgets (300–1200), so thinking could
// use all of it and return no text. Turn it off unless a caller asks for it.
function withThinkingOff(body: object): object {
  const b = body as { generationConfig?: { thinkingConfig?: unknown } & Record<string, unknown> }
  if (b.generationConfig?.thinkingConfig !== undefined) return body
  return {
    ...b,
    generationConfig: { ...(b.generationConfig ?? {}), thinkingConfig: { thinkingBudget: 0 } },
  }
}

export async function callGemini(
  apiKey: string,
  body: object,
  attempt = 1
): Promise<Response> {
  if (attempt === 1) body = withThinkingOff(body)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    // The key goes in a header, never the URL, so it can't leak into logs.
    res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok && RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
    const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
    await new Promise(r => setTimeout(r, backoffMs))
    return callGemini(apiKey, body, attempt + 1)
  }

  return res
}
