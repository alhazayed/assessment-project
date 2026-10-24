import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContentDisposition, getMimeTypeForFormat } from '@/lib/security/file-export'
import { fetchAll, fetchAllByIds } from '@/lib/admin/fetch-all'
import { writeAdminAudit } from '@/lib/admin/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUS_RE = /^[a-z_]{1,32}$/

export async function GET(req: Request) {
  try {
    return await exportPackageResults(req)
  } catch (error) {
    if (!isAuthRedirectError(error)) console.error('[admin/packages/export] error:', error instanceof Error ? error.message : 'unknown')
    return adminRouteError(error)
  }
}

async function exportPackageResults(req: Request) {
  const { user: adminUser, role } = await requireAdmin()
  // This export includes user identifiers alongside clinical risk text, so it is
  // superadmin-only (matching the platform's other PHI/identifier exports).
  if (role !== 'superadmin') {
    return NextResponse.json({ error: 'Only a superadmin can export package results' }, { status: 403 })
  }

  const rl = await checkRateLimit(`admin-export-packages:${adminUser.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Export rate limit reached. Please wait before exporting again.' }, { status: 429, headers: { 'Retry-After': '3600' } })
  }

  const { searchParams } = new URL(req.url)
  const packageId = searchParams.get('package_id')
  const status = searchParams.get('status') ?? 'completed'
  if (packageId && !UUID_RE.test(packageId)) {
    return NextResponse.json({ error: 'package_id must be a UUID' }, { status: 400 })
  }
  if (!STATUS_RE.test(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const db = createAdminClient()

  const buildQuery = () => {
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
      .order('id', { ascending: true })

    if (packageId) {
      query = query.eq('package_id', packageId)
    }
    return query
  }

  // Paged past PostgREST's 1,000-row max_rows cap; throws on a query error.
  const results = await fetchAll(buildQuery)

  // Fetch user names (profiles.full_name/email don't exist — names are *_en/_ar
  // and email lives in auth.users). Build id -> {name, email} maps.
  const userIds = Array.from(new Set(results.map(r => r.user_id))) as string[]
  const profiles = await fetchAllByIds<{ id: string; full_name_en: string; full_name_ar: string | null }>(
    userIds,
    ids => db
      .from('profiles')
      .select('id, full_name_en, full_name_ar')
      .in('id', ids)
      .order('id', { ascending: true }),
  )

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  // Email lives in auth.users — resolve via the admin API (paginated).
  const emailMap = new Map<string, string>()
  const wanted = new Set(userIds)
  try {
    const perPage = 50
    for (let pageNum = 1; pageNum <= 200; pageNum++) {
      const { data: authData, error: authErr } = await db.auth.admin.listUsers({ page: pageNum, perPage })
      const authUsers = authData?.users || []
      if (authErr || authUsers.length === 0) break
      for (const au of authUsers) if (au.email && wanted.has(au.id)) emailMap.set(au.id, au.email)
      if (authUsers.length < perPage || emailMap.size >= wanted.size) break
    }
  } catch { /* email is best-effort */ }

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

  const rows = results.map(r => {
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
      (profile as { full_name_en?: string } | undefined)?.full_name_en ?? '',
      emailMap.get(r.user_id) ?? '',
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
  await writeAdminAudit({
    actorId: adminUser.id,
    action: 'data_export',
    targetType: 'package_results',
    targetId: packageId ?? adminUser.id,
    details: { format: 'csv', row_count: rows.length, filters: { package_id: packageId, status } },
  }, db)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': getMimeTypeForFormat('csv'),
      'Content-Disposition': buildContentDisposition(filename),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}
