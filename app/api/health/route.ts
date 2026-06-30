import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface HealthCheck {
  status: 'ok' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: { status: 'ok' | 'error'; latency_ms?: number }
    ai_service: { status: 'ok' | 'unconfigured' }
    environment: { status: 'ok' | 'missing_vars' }
  }
}

export async function GET() {
  const startTime = Date.now()
  const checks = {
    database: { status: 'error' as const },
    ai_service: { status: 'unconfigured' as const },
    environment: { status: 'ok' as const },
  }

  // Check database connectivity
  try {
    const admin = createAdminClient()
    const dbStart = Date.now()
    const { error } = await admin.from('assessment_definitions').select('id').limit(1)
    const latency = Date.now() - dbStart

    if (!error) {
      checks.database.status = 'ok'
      checks.database.latency_ms = latency
    }
  } catch (err) {
    checks.database.status = 'error'
  }

  // Check AI service configuration
  const hasAiKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here')
  if (hasAiKey) {
    checks.ai_service.status = 'ok'
  }

  // Check required environment variables
  const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  const missingVars = requiredVars.filter((v) => !process.env[v])
  if (missingVars.length > 0) {
    checks.environment.status = 'missing_vars'
  }

  // Determine overall status
  const hasError = checks.database.status === 'error' || checks.environment.status === 'missing_vars'
  const overallStatus = hasError ? 'unhealthy' : 'ok'

  const response: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  }

  return NextResponse.json(response, {
    status: hasError ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json',
    },
  })
}
