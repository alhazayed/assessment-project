import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}
  let healthy = true

  // Supabase connectivity check
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('assessment_definitions').select('id').limit(1)
    checks.database = error ? 'error' : 'ok'
    if (error) healthy = false
  } catch {
    checks.database = 'error'
    healthy = false
  }

  // Gemini API key presence (not a live call to avoid costs)
  const geminiKey = process.env.GEMINI_API_KEY
  checks.ai = geminiKey && geminiKey !== 'your-gemini-api-key-here' ? 'ok' : 'error'
  if (checks.ai === 'error') healthy = false

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      ts: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
