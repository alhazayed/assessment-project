import { NextResponse } from 'next/server'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContentDisposition, getMimeTypeForFormat } from '@/lib/security/file-export'

// Formula-injection guard: a leading =,+,-,@ etc. is neutralised so spreadsheet
// apps don't execute a cell on import.
function csvSafe(value: string): string {
  if (/^[=+\-@|%\t\r]/.test(String(value))) return `'${value}`
  return String(value)
}
function rowsToCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  const esc = (v: unknown) => {
    const s = csvSafe(String(v ?? ''))
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

function ageGroup(dob: string | null): string {
  if (!dob) return 'Unknown'
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return 'Unknown'
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  if (age < 0) return 'Unknown'
  if (age < 18) return 'Under 18'
  if (age <= 24) return '18–24'
  if (age <= 34) return '25–34'
  if (age <= 44) return '35–44'
  if (age <= 54) return '45–54'
  return '55+'
}

/**
 * GET /api/admin/assessments/[id]/answers-export?gender=&ageGroup=
 *
 * One row per individual answer for an assessment, enriched with the submission
 * score/band and pseudonymous patient/demographic fields, so a superadmin can
 * analyse answer-level patterns (incl. per-person longitudinal change) in an
 * external stats tool. Superadmin only; rate-limited; CSV-injection hardened.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user, role } = await requireAdmin()
    if (role !== 'superadmin') return NextResponse.json({ error: 'Superadmin only' }, { status: 403 })

    const rl = await checkRateLimit(`answers-export:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Export rate limit reached. Please wait before exporting again.' }, { status: 429, headers: { 'Retry-After': '3600' } })
    }

    const { id: definitionId } = await ctx.params
    const { searchParams } = new URL(request.url)
    const genderFilter = searchParams.get('gender') || ''
    const ageFilter = searchParams.get('ageGroup') || ''

    const db = createAdminClient()

    const [defRes, itemsRes, subsRes] = await Promise.all([
      db.from('assessment_definitions').select('id, code').eq('id', definitionId).single(),
      db.from('assessment_items').select('id, item_number, subscale, question_en').eq('definition_id', definitionId),
      db.from('assessment_submissions')
        .select('id, patient_id, total_score, severity_band, high_risk_flag, submitted_at, profiles(gender, date_of_birth, country_of_residence, educational_status)')
        .eq('definition_id', definitionId),
    ])

    if (defRes.error || !defRes.data) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    const code = defRes.data.code
    const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i]))

    type ProfileLite = { gender: string | null; date_of_birth: string | null; country_of_residence: string | null; educational_status: string | null }
    type Sub = { id: string; patient_id: string; total_score: number; severity_band: string | null; high_risk_flag: boolean; submitted_at: string; profiles: ProfileLite | null }
    // Supabase types a to-one embed as an array; normalise to a single object.
    const oneProfile = (p: ProfileLite | ProfileLite[] | null): ProfileLite | null => Array.isArray(p) ? (p[0] ?? null) : p
    const subs = ((subsRes.data ?? []) as unknown as Array<Omit<Sub, 'profiles'> & { profiles: ProfileLite | ProfileLite[] | null }>)
      .map(s => ({ ...s, profiles: oneProfile(s.profiles) }))
      .filter(s => {
      const g = s.profiles?.gender ?? 'Unknown'
      const ag = ageGroup(s.profiles?.date_of_birth ?? null)
      if (genderFilter && g !== genderFilter) return false
      if (ageFilter && ag !== ageFilter) return false
      return true
    })
    const subMap = new Map(subs.map(s => [s.id, s]))
    const submissionIds = subs.map(s => s.id)

    const responses: Array<{ submission_id: string; item_id: string; response_value: number; response_label_en: string }> = []
    const CHUNK = 500
    for (let i = 0; i < submissionIds.length; i += CHUNK) {
      const { data } = await db
        .from('assessment_responses')
        .select('submission_id, item_id, response_value, response_label_en')
        .in('submission_id', submissionIds.slice(i, i + CHUNK))
      if (data) responses.push(...data)
    }

    const headers = [
      'submission_id', 'patient_id', 'submitted_at', 'assessment_code',
      'total_score', 'severity_band', 'high_risk',
      'gender', 'age_group', 'country', 'education',
      'item_number', 'subscale', 'question_en', 'response_value', 'response_label_en',
    ]
    const rows: (string | number | boolean)[][] = []
    for (const r of responses) {
      const s = subMap.get(r.submission_id)
      if (!s) continue
      const it = itemMap.get(r.item_id)
      rows.push([
        s.id, s.patient_id, s.submitted_at, code,
        s.total_score, s.severity_band ?? '', s.high_risk_flag,
        s.profiles?.gender ?? 'Unknown', ageGroup(s.profiles?.date_of_birth ?? null),
        s.profiles?.country_of_residence ?? '', s.profiles?.educational_status ?? '',
        it?.item_number ?? '', it?.subscale ?? '', it?.question_en ?? '',
        r.response_value, r.response_label_en ?? '',
      ])
    }
    // Stable order: by submission time, then item number.
    rows.sort((a, b) => String(a[2]).localeCompare(String(b[2])) || Number(a[11]) - Number(b[11]))

    const dateStr = new Date().toISOString().slice(0, 10)
    const csv = rowsToCsv(headers, rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': getMimeTypeForFormat('csv'),
        'Content-Disposition': buildContentDisposition(`${code}-answers-${dateStr}.csv`),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (isAuthRedirectError(error)) return adminRouteError(error)
    console.error('[answers-export] error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
