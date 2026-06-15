/**
 * Multi-provider AI client with automatic fallback.
 *
 * Providers are tried in priority order. If one returns a non-2xx status,
 * an empty response, or throws a network error, the next provider is tried.
 * An AbortController limits each individual call to 4 s so a hanging
 * provider doesn't eat the entire request timeout budget.
 *
 * Configure providers via environment variables:
 *   ANTHROPIC_API_KEY        — Anthropic Claude (primary)
 *   GLM_API_KEY              — Zhipu AI GLM (second)
 *   OPENAI_API_KEY           — OpenAI (third)
 *   DEEPSEEK_API_KEY         — DeepSeek (fourth)
 *   XAI_API_KEY              — xAI Grok (fifth)
 *   FALLBACK_AI_API_KEY      — Any OpenAI-compatible endpoint (sixth)
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

const PROVIDER_TIMEOUT_MS = 4_000

type ProviderType = 'openai-compatible' | 'anthropic'

interface Provider {
  name: string
  type: ProviderType
  url: string
  apiKey: string
  model: string
}

function getProviders(): Provider[] {
  const candidates: (Provider | null)[] = [
    process.env.ANTHROPIC_API_KEY
      ? {
          name: 'Anthropic',
          type: 'anthropic',
          url: 'https://api.anthropic.com/v1/messages',
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
        }
      : null,
    process.env.GLM_API_KEY
      ? {
          name: 'GLM',
          type: 'openai-compatible',
          url: 'https://open.bigmodel.cn/api/paige/v4/chat/completions',
          apiKey: process.env.GLM_API_KEY,
          model: process.env.GLM_MODEL ?? 'glm-4-flash',
        }
      : null,
    process.env.OPENAI_API_KEY
      ? {
          name: 'OpenAI',
          type: 'openai-compatible',
          url: 'https://api.openai.com/v1/chat/completions',
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        }
      : null,
    process.env.DEEPSEEK_API_KEY
      ? {
          name: 'DeepSeek',
          type: 'openai-compatible',
          url: 'https://api.deepseek.com/v1/chat/completions',
          apiKey: process.env.DEEPSEEK_API_KEY,
          model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
        }
      : null,
    process.env.XAI_API_KEY
      ? {
          name: 'xAI',
          type: 'openai-compatible',
          url: 'https://api.x.ai/v1/chat/completions',
          apiKey: process.env.XAI_API_KEY,
          model: process.env.XAI_MODEL ?? 'grok-3',
        }
      : null,
    process.env.FALLBACK_AI_API_KEY && process.env.FALLBACK_AI_API_URL
      ? {
          name: 'Fallback',
          type: 'openai-compatible',
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

function buildRequest(provider: Provider, options: AICallOptions): { url: string; init: RequestInit } {
  const { messages, temperature = 0.3, maxTokens = 512 } = options

  if (provider.type === 'anthropic') {
    const systemMsg = messages.find(m => m.role === 'system')?.content ?? ''
    const userMessages = messages.filter(m => m.role !== 'system')
    return {
      url: provider.url,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: maxTokens,
          temperature,
          system: systemMsg,
          messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      },
    }
  }

  return {
    url: provider.url,
    init: {
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
    },
  }
}

function extractContent(provider: Provider, data: Record<string, unknown>): string {
  if (provider.type === 'anthropic') {
    const contentArr = data?.content as Array<{ type: string; text: string }> | undefined
    return contentArr?.[0]?.text ?? ''
  }
  const choices = data?.choices as Array<{ message: { content: string } }> | undefined
  return choices?.[0]?.message?.content ?? ''
}

/**
 * Call AI with automatic provider fallback.
 * Throws if all providers fail or none are configured.
 */
export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const providers = getProviders()
  console.log(`[ai-client] providers: ${providers.length > 0 ? providers.map(p => p.name).join(', ') : 'NONE'}`)
  if (providers.length === 0) {
    throw new AIConfigError('No AI providers configured')
  }

  const errors: string[] = []

  for (const provider of providers) {
    console.log(`[ai-client] trying ${provider.name} (${provider.model})`)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

    try {
      const { url, init } = buildRequest(provider, options)
      const res = await fetch(url, { ...init, signal: controller.signal })

      clearTimeout(timer)

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        const msg = `${provider.name}: HTTP ${res.status}`
        errors.push(msg)
        console.warn(`[ai-client] ${msg} — ${body.slice(0, 200)} — trying next provider`)
        continue
      }

      const data = await res.json() as Record<string, unknown>
      const content = extractContent(provider, data)

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

  console.error(`[ai-client] all ${providers.length} provider(s) exhausted — errors: ${errors.join(' | ')}`)
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
