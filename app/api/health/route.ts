import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/health
 *
 * Public liveness/readiness probe. Intentionally minimal: it returns only an
 * overall status and timestamp so anonymous callers cannot enumerate
 * infrastructure internals (DB latency, which env vars are missing, AI
 * configuration, app version). Uptime monitors only need the 200 vs 503 signal.
 */
export async function GET() {
  let databaseOk = false

  // Check database connectivity.
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('assessment_definitions').select('id').limit(1)
    databaseOk = !error
  } catch {
    databaseOk = false
  }

  // Required environment variables must be present.
  const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  const envOk = requiredVars.every((v) => !!process.env[v])

  const healthy = databaseOk && envOk

  return NextResponse.json(
    { status: healthy ? 'ok' : 'unhealthy', timestamp: new Date().toISOString() },
    {
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    }
  )
}
