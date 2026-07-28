import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Check database connectivity using the anon client (RLS-restricted) rather
  // than the service-role client — a public, unauthenticated probe must not run
  // queries with the RLS-bypassing service role. assessment_definitions is
  // publicly readable, so this still verifies DB reachability.
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('assessment_definitions').select('id').limit(1)
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
