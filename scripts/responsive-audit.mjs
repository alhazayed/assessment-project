#!/usr/bin/env node
/**
 * Responsive overflow audit harness.
 *
 * Loads every route at many breakpoints (portrait + landscape) with the native
 * mobile User-Agent and fails if any page has horizontal overflow
 * (document.documentElement.scrollWidth > innerWidth). This is the same harness
 * used to certify the public routes in RESPONSIVE_AUDIT.md; it additionally
 * certifies the AUTHENTICATED routes when login credentials are provided.
 *
 * Usage:
 *   # public routes only (no login), against a locally-running dev server:
 *   BASE_URL=http://localhost:3111 node scripts/responsive-audit.mjs
 *
 *   # full run incl. authenticated routes (credentials via env — never hardcode):
 *   BASE_URL=https://your-preview.vercel.app \
 *   E2E_EMAIL='...' E2E_PASSWORD='...' \
 *   node scripts/responsive-audit.mjs
 *
 * Requires Playwright (already a dev dependency). Exits non-zero on any overflow,
 * so it can gate CI.
 */
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3111'
const EMAIL = process.env.E2E_EMAIL || ''
const PASSWORD = process.env.E2E_PASSWORD || ''
const EXE = process.env.PW_CHROMIUM || undefined // set to a pinned Chromium path if needed

const WIDTHS = [320, 360, 375, 390, 412, 414, 430, 480, 540, 600, 768, 820, 912, 1024, 1280, 1366, 1440, 1920]
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 VWelfareApp'

const PUBLIC_ROUTES = [
  '/', '/login', '/register', '/forgot-password', '/reset-password', '/packages',
  '/clinicians', '/contact', '/privacy', '/terms', '/onboarding', '/sample-result',
  '/mobile/web-only', '/checkout', '/checkout/success', '/checkout/error', '/adhd-check-in',
]

// Certified only when a session is available (E2E_EMAIL/E2E_PASSWORD set).
const AUTHED_ROUTES = [
  '/dashboard', '/assessments', '/insights', '/journal', '/mood', '/messages',
  '/profile', '/billing', '/packages', '/patient/clinicians', '/patients',
  '/clinician/connect', '/clinician/verification', '/adhd-zones',
]

async function measure(page, route) {
  try {
    await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(600)
  } catch (e) {
    return { route, error: e.message.slice(0, 80) }
  }
  const bad = []
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 820 })
    await page.waitForTimeout(90)
    const over = await page.evaluate((vw) => document.documentElement.scrollWidth - vw, w)
    if (over > 1) bad.push(`@${w}:${over}px`)
  }
  await page.setViewportSize({ width: 844, height: 390 }) // landscape
  await page.waitForTimeout(90)
  const lo = await page.evaluate(() => document.documentElement.scrollWidth - 844)
  if (lo > 1) bad.push(`landscape:${lo}px`)
  return { route, bad }
}

async function login(context) {
  const page = await context.newPage()
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await Promise.all([
    page.waitForURL(/\/(dashboard|onboarding|assessments)/, { timeout: 45000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(1500)
  const ok = !/\/login/.test(page.url())
  await page.close()
  return ok
}

const run = async () => {
  const browser = await chromium.launch({ executablePath: EXE })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: MOBILE_UA })
  let failures = 0, checks = 0

  const runRoutes = async (routes, label) => {
    console.log(`\n── ${label} ──`)
    for (const route of routes) {
      const page = await context.newPage()
      const res = await measure(page, route)
      await page.close()
      if (res.error) { console.log(`ERR ${route}: ${res.error}`); failures++; continue }
      checks += WIDTHS.length + 1
      if (res.bad.length === 0) console.log(`OK  ${route}`)
      else { console.log(`BAD ${route}  ${res.bad.join('  ')}`); failures += res.bad.length }
    }
  }

  await runRoutes(PUBLIC_ROUTES, 'PUBLIC ROUTES')

  if (EMAIL && PASSWORD) {
    const ok = await login(context)
    if (!ok) { console.log('\n⚠️  Login failed — skipping authenticated routes. Check credentials / BASE_URL reachability.'); failures++ }
    else await runRoutes(AUTHED_ROUTES, 'AUTHENTICATED ROUTES')
  } else {
    console.log('\n(ℹ️  Set E2E_EMAIL and E2E_PASSWORD to also certify authenticated routes.)')
  }

  await browser.close()
  console.log(`\n=== ${checks} viewport checks · ${failures} overflow failure(s) ===`)
  process.exit(failures ? 1 : 0)
}

run()
