/**
 * Multi-provider AI client with automatic fallback.
 *
 * Providers are tried in priority order. If one returns a non-2xx status,
 * an empty response, or throws a network error, the next provider is tried.
 * An AbortController limits each individual call to 15 s so a hanging
 * provider doesn't eat the entire request timeout.
 *
 * Configure providers via environment variables:
 *   GLM_API_KEY              — Zhipu AI GLM (primary)
 *   OPENAI_API_KEY           — OpenAI (first fallback)
 *   DEEPSEEK_API_KEY         — DeepSeek (second fallback)
 *   XAI_API_KEY              — xAI Grok (third fallback)
 *   FALLBACK_AI_API_KEY      — Any OpenAI-compatible endpoint (fourth fallback)
 *   FALLBACK_AI_API_URL      — Base URL for the fallback provider
 *   FALLBACK_AI_MODEL        — Model name for the fallback provider
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICallOptions {
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
}

export interface AICallResult {
  content: string
  provider: string
}

const PROVIDER_TIMEOUT_MS = 15_000

interface Provider {
  name: string
  url: string
  apiKey: string
  model: string
}

function getProviders(): Provider[] {
  const candidates: (Provider | null)[] = [
    process.env.GLM_API_KEY
      ? {
          name: 'GLM',
          url: 'https://open.bigmodel.cn/api/paige/v4/chat/completions',
          apiKey: process.env.GLM_API_KEY,
          model: process.env.GLM_MODEL ?? 'glm-4-flash',
        }
      : null,
    process.env.OPENAI_API_KEY
      ? {
          name: 'OpenAI',
          url: 'https://api.openai.com/v1/chat/completions',
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        }
      : null,
    process.env.DEEPSEEK_API_KEY
      ? {
          name: 'DeepSeek',
          url: 'https://api.deepseek.com/v1/chat/completions',
          apiKey: process.env.DEEPSEEK_API_KEY,
          model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
        }
      : null,
    process.env.XAI_API_KEY
      ? {
          name: 'xAI',
          url: 'https://api.x.ai/v1/chat/completions',
          apiKey: process.env.XAI_API_KEY,
          model: process.env.XAI_MODEL ?? 'grok-3',
        }
      : null,
    process.env.FALLBACK_AI_API_KEY && process.env.FALLBACK_AI_API_URL
      ? {
          name: 'Fallback',
          url: process.env.FALLBACK_AI_API_URL,
          apiKey: process.env.FALLBACK_AI_API_KEY,
          model: process.env.FALLBACK_AI_MODEL ?? 'gpt-4o-mini',
        }
      : null,
  ]
  return candidates.filter((p): p is Provider => p !== null)
}

/** Returns true if at least one AI provider is configured. */
export function isAIConfigured(): boolean {
  return getProviders().length > 0
}

/**
 * Call AI with automatic provider fallback.
 * Throws if all providers fail or none are configured.
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const providers = getProviders()
  if (providers.length === 0) {
    throw new AIConfigError('No AI providers configured')
  }

  const { messages, temperature = 0.3, maxTokens = 512 } = options
  const errors: string[] = []

  for (const provider of providers) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

    try {
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const msg = `${provider.name}: HTTP ${res.status}`
        errors.push(msg)
        console.warn(`[ai-client] ${msg} — trying next provider`)
        continue
      }

      const data = await res.json()
      const content: string = data?.choices?.[0]?.message?.content ?? ''

      if (!content) {
        const msg = `${provider.name}: empty response`
        errors.push(msg)
        console.warn(`[ai-client] ${msg} — trying next provider`)
        continue
      }

      if (errors.length > 0) {
        console.warn(`[ai-client] succeeded with ${provider.name} after ${errors.length} failure(s):`, errors)
      }

      return { content, provider: provider.name }
    } catch (err) {
      clearTimeout(timer)
      const msg = `${provider.name}: ${err instanceof Error ? err.message : 'unknown error'}`
      errors.push(msg)
      console.warn(`[ai-client] ${msg} — trying next provider`)
    }
  }

  throw new AIServiceError(`All AI providers failed: ${errors.join(' | ')}`)
}

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIConfigError'
  }
}

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIServiceError'
  }
}
