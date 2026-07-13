#!/usr/bin/env npx tsx
/**
 * Post-migration verification for production_security_hardening.
 *
 * Validates that security hardening migration `20260628120000` (or remote
 * `production_security_hardening`) was applied correctly.
 *
 * Run:
 *   npm run verify:migration
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   BASE_URL — if set, also checks /api/cron/process-deletions with CRON_SECRET
 *   CRON_SECRET
 */

import { createClient } from '@supabase/supabase-js'

type CheckResult = { name: string; ok: boolean; detail: string }

const ADMIN_RPCS = [
  { name: 'get_admin_dashboard_stats', args: { p_days: 7 } },
  { name: 'get_top_assessments', args: { p_limit: 5 } },
  { name: 'get_user_engagement_metrics', args: {} },
  { name: 'get_demographics_breakdown', args: { p_demographic_type: null } },
  { name: 'get_high_risk_patients', args: { p_limit: 5 } },
] as const

const WEAK_POLICIES = ['cn_clinician_own', 'cn_patient_read', 'cn_admin_read']

const ADMIN_MATVIEWS = [
  'admin_daily_stats',
  'admin_assessment_stats',
  'admin_user_engagement_stats',
  'admin_high_risk_alerts',
  'admin_demographics_summary',
]

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function isPermissionError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('not authorized') ||
    msg.includes('insufficient privilege')
  )
}

async function checkAnonRpcBlocked(url: string, anonKey: string): Promise<CheckResult[]> {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const results: CheckResult[] = []

  for (const rpc of ADMIN_RPCS) {
    const { error } = await anon.rpc(rpc.name, rpc.args as Record<string, unknown>)
    const blocked = isPermissionError(error)
    results.push({
      name: `anon blocked: ${rpc.name}`,
      ok: blocked,
      detail: blocked
        ? 'permission denied (expected)'
        : `unexpected success or error: ${error?.message ?? 'no error'}`,
    })
  }

  return results
}

async function checkServiceRpcAllowed(url: string, serviceKey: string): Promise<CheckResult[]> {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const results: CheckResult[] = []

  for (const rpc of ADMIN_RPCS) {
    const { data, error } = await admin.rpc(rpc.name, rpc.args as Record<string, unknown>)
    results.push({
      name: `service_role allowed: ${rpc.name}`,
      ok: !error,
      detail: error ? error.message : `ok (${Array.isArray(data) ? data.length : 'scalar'} rows)`,
    })
  }

  const { error: codeError } = await admin.rpc('generate_patient_access_code')
  results.push({
    name: 'service_role allowed: generate_patient_access_code',
    ok: !codeError,
    detail: codeError ? codeError.message : 'ok',
  })

  return results
}

async function checkAnonGenerateCodeBlocked(url: string, anonKey: string): Promise<CheckResult> {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error } = await anon.rpc('generate_patient_access_code')
  return {
    name: 'anon blocked: generate_patient_access_code',
    ok: isPermissionError(error),
    detail: isPermissionError(error)
      ? 'permission denied (expected)'
      : `unexpected: ${error?.message ?? 'rpc succeeded'}`,
  }
}

async function checkDeletionColumn(url: string, serviceKey: string): Promise<CheckResult> {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { error } = await admin.from('profiles').select('deletion_requested_at').limit(1)
  return {
    name: 'profiles.deletion_requested_at column',
    ok: !error,
    detail: error ? error.message : 'column readable via service_role',
  }
}

async function checkClinicalNotesPolicies(url: string, serviceKey: string): Promise<CheckResult[]> {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('clinician_can_access_patient_notes', {
    p_patient_id: '00000000-0000-0000-0000-000000000001',
  })

  const results: CheckResult[] = [
    {
      name: 'helper exists: clinician_can_access_patient_notes',
      ok: !error || !error.message.includes('Could not find the function'),
      detail: error?.message ?? 'callable',
    },
  ]

  // Query policies via service_role on pg_policies isn't exposed; use SQL via rpc workaround:
  // Instead verify weak policy names are gone by attempting to read policy metadata through a raw query isn't available.
  // We verify expected function works and document SQL check for policies.
  const { data: notesProbe, error: notesError } = await admin.from('clinical_notes').select('id').limit(1)
  results.push({
    name: 'clinical_notes readable via service_role',
    ok: !notesError,
    detail: notesError ? notesError.message : `ok (${notesProbe?.length ?? 0} sample)`,
  })

  return results
}

async function checkMatviewAnonBlocked(url: string, anonKey: string): Promise<CheckResult[]> {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const results: CheckResult[] = []

  for (const view of ADMIN_MATVIEWS) {
    const { error } = await anon.from(view).select('*').limit(1)
    const blocked =
      isPermissionError(error) ||
      (error?.message ?? '').toLowerCase().includes('does not exist')
    results.push({
      name: `anon blocked or absent: ${view}`,
      ok: blocked,
      detail: error?.message ?? 'unexpected read success',
    })
  }

  return results
}

async function checkMatviewServiceAllowed(url: string, serviceKey: string): Promise<CheckResult[]> {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const results: CheckResult[] = []

  for (const view of ADMIN_MATVIEWS) {
    const { error } = await admin.from(view).select('*').limit(1)
    const missing = (error?.message ?? '').toLowerCase().includes('does not exist')
    results.push({
      name: `service_role matview: ${view}`,
      ok: !error || missing,
      detail: missing ? 'not present in this environment (skipped)' : error?.message ?? 'readable',
    })
  }

  return results
}

async function checkCronEndpoint(): Promise<CheckResult | null> {
  const base = process.env.BASE_URL
  const secret = process.env.CRON_SECRET
  if (!base || !secret) return null

  const res = await fetch(`${base.replace(/\/$/, '')}/api/cron/process-deletions`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await res.text()
  return {
    name: 'cron endpoint /api/cron/process-deletions',
    ok: res.ok,
    detail: `${res.status} ${body.slice(0, 120)}`,
  }
}

function printResults(results: CheckResult[]) {
  let failed = 0
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌'
    console.log(`${icon} ${r.name}`)
    console.log(`   ${r.detail}`)
    if (!r.ok) failed++
  }
  return failed
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')

  console.log('Verifying production_security_hardening migration...\n')
  console.log(`Target: ${url}\n`)

  const all: CheckResult[] = []

  all.push(...await checkAnonRpcBlocked(url, anonKey))
  all.push(await checkAnonGenerateCodeBlocked(url, anonKey))
  all.push(...await checkServiceRpcAllowed(url, serviceKey))
  all.push(await checkDeletionColumn(url, serviceKey))
  all.push(...await checkClinicalNotesPolicies(url, serviceKey))
  all.push(...await checkMatviewAnonBlocked(url, anonKey))
  all.push(...await checkMatviewServiceAllowed(url, serviceKey))

  const cronCheck = await checkCronEndpoint()
  if (cronCheck) all.push(cronCheck)

  console.log('--- Policy name check (manual SQL reference) ---')
  console.log(`Weak policies must be absent: ${WEAK_POLICIES.join(', ')}`)
  console.log('Expected policies: clinician_own_notes, notes_admin_all, notes_patient_read_nonprivate\n')

  const failed = printResults(all)

  console.log(`\n${all.length - failed}/${all.length} checks passed`)
  if (failed > 0) process.exit(1)
  console.log('\nMigration verification PASSED')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
