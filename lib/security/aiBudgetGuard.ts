import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Global AI cost circuit breaker.
 *
 * Tracks total AI requests per 24-hour rolling window using the existing
 * rate_limit_log table. When estimated daily spend exceeds AI_DAILY_BUDGET_USD,
 * all Gemini endpoints return HTTP 503.
 *
 * Set AI_DAILY_BUDGET_USD in your environment. Default: $50/day.
 * Set AI_COST_PER_REQUEST_USD to override the average cost estimate. Default: $0.0003.
 */

const RATE_LIMIT_KEY = 'ai-global:daily'
const DEFAULT_BUDGET_USD = 50
const DEFAULT_COST_PER_REQUEST_USD = 0.0003

export interface BudgetCheckResult {
  allowed: boolean
  estimatedSpendUsd: number
  budgetUsd: number
  requestsToday: number
}

export async function checkAiBudget(): Promise<BudgetCheckResult> {
  const budgetUsd = parseFloat(process.env.AI_DAILY_BUDGET_USD ?? String(DEFAULT_BUDGET_USD))
  const costPerRequest = parseFloat(process.env.AI_COST_PER_REQUEST_USD ?? String(DEFAULT_COST_PER_REQUEST_USD))

  // Budget guard disabled if env var is unset or invalid
  if (!isFinite(budgetUsd) || budgetUsd <= 0 || !isFinite(costPerRequest) || costPerRequest <= 0) {
    return { allowed: true, estimatedSpendUsd: 0, budgetUsd: 0, requestsToday: 0 }
  }

  const maxRequests = Math.floor(budgetUsd / costPerRequest)
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const db = createAdminClient()
  const { count } = await db
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('key', RATE_LIMIT_KEY)
    .gte('created_at', windowStart)

  const requestsToday = count ?? 0
  const estimatedSpendUsd = requestsToday * costPerRequest

  if (requestsToday >= maxRequests) {
    console.warn('[aiBudgetGuard] daily budget exceeded — requests today:', requestsToday, '— estimated spend: $' + estimatedSpendUsd.toFixed(4))
    return { allowed: false, estimatedSpendUsd, budgetUsd, requestsToday }
  }

  // Record this request
  await db.from('rate_limit_log').insert({ key: RATE_LIMIT_KEY })

  return { allowed: true, estimatedSpendUsd, budgetUsd, requestsToday }
}
