const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const RETRYABLE_STATUS = new Set([429, 500, 502, 503])
const MAX_ATTEMPTS = 3

export async function callGemini(
  apiKey: string,
  body: object,
  attempt = 1
): Promise<Response> {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok && RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
    const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
    await new Promise(r => setTimeout(r, backoffMs))
    return callGemini(apiKey, body, attempt + 1)
  }

  return res
}
