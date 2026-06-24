import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  let healthy = true

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('assessment_definitions').select('id').limit(1)
    if (error) healthy = false
  } catch {
    healthy = false
  }

  // Check AI key presence without exposing configuration details
  const hasAiKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here')
  if (!hasAiKey) healthy = false

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
