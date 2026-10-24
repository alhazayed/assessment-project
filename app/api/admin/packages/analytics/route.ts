import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, adminRouteError, isAuthRedirectError } from '@/lib/admin-auth'
import { fetchAll, fetchAllByIds } from '@/lib/admin/fetch-all'

export async function GET() {
  try {
    return await packageAnalytics()
  } catch (error) {
    if (!isAuthRedirectError(error)) console.error('[admin/packages/analytics] error:', error instanceof Error ? error.message : 'unknown')
    return adminRouteError(error)
  }
}

async function packageAnalytics() {
  await requireAdmin()
  const db = createAdminClient()

  // Paged past PostgREST's 1,000-row max_rows cap; throws on a query error.
  const pkgResults = await fetchAll(() => db
    .from('package_results')
    .select(`
      id,
      composite_score,
      package_id,
      user_id,
      packages(name_en, name_ar, category, color)
    `)
    .eq('status', 'completed')
    .order('id', { ascending: true }))

  if (!pkgResults?.length) {
    return NextResponse.json({
      packageStats: [],
      genderBreakdown: [],
      categoryStats: [],
      totalCompleted: 0,
    })
  }

  const uniqueUserIds = Array.from(new Set(pkgResults.map(r => r.user_id))) as string[]

  const profiles = await fetchAllByIds<{ id: string; gender: string | null }>(
    uniqueUserIds,
    ids => db
      .from('profiles')
      .select('id, gender')
      .in('id', ids)
      .order('id', { ascending: true }),
  )

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  // Per-package stats
  const pkgMap = new Map<string, {
    name_en: string; category: string; color: string;
    scores: number[]; count: number
  }>()

  for (const r of pkgResults) {
    const pkg = (r.packages as unknown) as { name_en: string; category: string; color: string } | null
    if (!pkg || r.composite_score === null) continue
    const existing = pkgMap.get(r.package_id)
    if (existing) {
      existing.scores.push(r.composite_score)
      existing.count++
    } else {
      pkgMap.set(r.package_id, {
        name_en: pkg.name_en,
        category: pkg.category,
        color: pkg.color,
        scores: [r.composite_score],
        count: 1,
      })
    }
  }

  const packageStats = Array.from(pkgMap.entries()).map(([id, p]) => ({
    package_id: id,
    name_en: p.name_en,
    category: p.category,
    color: p.color,
    count: p.count,
    avg_score: Math.round(p.scores.reduce((a, b) => a + b, 0) / p.scores.length),
    min_score: Math.min(...p.scores),
    max_score: Math.max(...p.scores),
  })).sort((a, b) => b.count - a.count)

  // Gender breakdown
  const genderMap = new Map<string, number[]>()
  for (const r of pkgResults) {
    if (r.composite_score === null) continue
    const profile = profileMap.get(r.user_id)
    const gender = profile?.gender ?? 'unspecified'
    const arr = genderMap.get(gender) ?? []
    arr.push(r.composite_score)
    genderMap.set(gender, arr)
  }
  const genderBreakdown = Array.from(genderMap.entries()).map(([gender, scores]) => ({
    gender,
    count: scores.length,
    avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  })).sort((a, b) => b.count - a.count)

  // Category stats
  const catMap = new Map<string, number[]>()
  for (const r of pkgResults) {
    const pkg = (r.packages as unknown) as { category: string } | null
    if (!pkg || r.composite_score === null) continue
    const arr = catMap.get(pkg.category) ?? []
    arr.push(r.composite_score)
    catMap.set(pkg.category, arr)
  }
  const categoryStats = Array.from(catMap.entries()).map(([category, scores]) => ({
    category,
    count: scores.length,
    avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  })).sort((a, b) => b.count - a.count)

  return NextResponse.json({
    packageStats,
    genderBreakdown,
    categoryStats,
    totalCompleted: pkgResults.length,
  })
}
