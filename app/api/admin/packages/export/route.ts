import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContentDisposition, getMimeTypeForFormat } from '@/lib/security/file-export'

export async function GET(req: Request) {
  const { user: adminUser } = await requireAdmin()

  const rl = await checkRateLimit(`admin-export-packages:${adminUser.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Export rate limit reached. Please wait before exporting again.' }, { status: 429, headers: { 'Retry-After': '3600' } })
  }

  const { searchParams } = new URL(req.url)
  const packageId = searchParams.get('package_id')
  const status = searchParams.get('status') ?? 'completed'

  const db = createAdminClient()

  let query = db
    .from('package_results')
    .select(`
      id,
      composite_score,
      band_en,
      status,
      completed_at,
      created_at,
      package_id,
      user_id,
      packages(name_en, category),
      individual_scores,
      strengths_en,
      risk_indicators_en,
      recommendations_en
    `)
    .eq('status', status)
    .order('completed_at', { ascending: false })

  if (packageId) {
    query = query.eq('package_id', packageId)
  }

  const { data: results, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }

  // Fetch user emails for the user_ids present
  const userIds = Array.from(new Set((results ?? []).map(r => r.user_id)))
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // Build CSV
  const headers = [
    'Result ID',
    'Package Name',
    'Category',
    'User ID',
    'User Name',
    'User Email',
    'Composite Score',
    'Band',
    'Status',
    'Completed At',
    'Individual Scores (JSON)',
    'Strengths',
    'Risk Indicators',
    'Recommendations',
  ]

  const escape = (v: unknown): string => {
    let s = v === null || v === undefined ? '' : String(v)
    // Guard against CSV formula injection: a leading =, +, -, @, |, %, or control
    // char is treated as a formula by spreadsheet apps. Prefix with an apostrophe
    // so the cell is imported as text. Applied before quoting so values that also
    // contain a comma/quote still keep the guard.
    if (/^[=+\-@|%\t\r]/.test(s)) s = `'${s}`
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const rows = (results ?? []).map(r => {
    const pkg = (r.packages as unknown) as { name_en: string; category: string } | null
    const profile = profileMap.get(r.user_id)
    const indScores = r.individual_scores
      ? Object.entries(r.individual_scores as Record<string, number>)
          .map(([k, v]) => `${k}:${v}`)
          .join('; ')
      : ''
    return [
      r.id,
      pkg?.name_en ?? '',
      pkg?.category ?? '',
      r.user_id,
      profile?.full_name ?? '',
      profile?.email ?? '',
      r.composite_score ?? '',
      r.band_en ?? '',
      r.status,
      r.completed_at ?? '',
      indScores,
      Array.isArray(r.strengths_en) ? r.strengths_en.join(' | ') : '',
      Array.isArray(r.risk_indicators_en) ? r.risk_indicators_en.join(' | ') : '',
      Array.isArray(r.recommendations_en) ? r.recommendations_en.join(' | ') : '',
    ].map(escape).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\r\n')
  const filename = packageId
    ? `package_results_${packageId}_${new Date().toISOString().slice(0, 10)}.csv`
    : `package_results_all_${new Date().toISOString().slice(0, 10)}.csv`

  // Audit log — record who exported what and how many rows
  try {
    await db.from('audit_log').insert({
      actor_id: adminUser.id,
      action: 'data_export',
      target_type: 'package_results',
      target_id: packageId ?? adminUser.id,
      details: { format: 'csv', row_count: rows.length, filters: { package_id: packageId, status } },
    })
  } catch (auditErr) {
    console.error('[admin/packages/export] audit log failed (non-fatal):', auditErr instanceof Error ? auditErr.message : 'unknown')
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': getMimeTypeForFormat('csv'),
      'Content-Disposition': buildContentDisposition(filename),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}
