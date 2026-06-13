/**
 * Shared helpers and scenario definitions for vwelfare load tests.
 * Run individual scenario files with: k6 run load-tests/scenarios/<file>.js
 *
 * Required env vars (pass via -e flag or .env):
 *   BASE_URL        — e.g. https://vwelfare.vercel.app (no trailing slash)
 *   GUEST_DEF_ID    — UUID of an active assessment definition for guest tests
 *   USER_EMAIL      — registered patient email for auth tests
 *   USER_PASSWORD   — registered patient password
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
export const GUEST_DEF_ID = __ENV.GUEST_DEF_ID || ''
export const USER_EMAIL = __ENV.USER_EMAIL || ''
export const USER_PASSWORD = __ENV.USER_PASSWORD || ''

// Custom metrics
export const errorRate = new Rate('error_rate')
export const ai_latency = new Trend('ai_request_duration_ms')
export const submit_latency = new Trend('submit_duration_ms')
export const report_latency = new Trend('report_duration_ms')

export const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** GET the landing page */
export function scenarioLanding() {
  const res = http.get(`${BASE_URL}/`)
  const ok = check(res, { 'landing 200': r => r.status === 200 })
  errorRate.add(!ok)
  sleep(0.5)
}

/** Guest: submit a minimal assessment */
export function scenarioGuestSubmit(definitionId, items) {
  if (!definitionId || !items || items.length === 0) return
  const responses = items.slice(0, 5).map(item => ({
    item_id: item.id,
    value: item.response_options?.[0]?.value ?? 0,
  }))
  const payload = JSON.stringify({
    definition_id: definitionId,
    responses,
    demographics: {
      gender: 'prefer_not_to_say',
      country: 'SA',
      dob: '1990-01-01',
      marital: 'single',
      education: 'bachelors',
    },
  })
  const start = Date.now()
  const res = http.post(`${BASE_URL}/api/submit-assessment-guest`, payload, { headers: JSON_HEADERS })
  submit_latency.add(Date.now() - start)
  const ok = check(res, {
    'guest submit 200 or 429': r => r.status === 200 || r.status === 429,
  })
  errorRate.add(!ok)
  sleep(1)
}

/** AI: recommend assessments (symptom text) */
export function scenarioAIRecommend() {
  const payload = JSON.stringify({ text: 'I have been feeling very anxious and cannot sleep well for the past month.' })
  const start = Date.now()
  const res = http.post(`${BASE_URL}/api/recommend-assessments`, payload, { headers: JSON_HEADERS })
  ai_latency.add(Date.now() - start)
  const ok = check(res, { 'recommend 200 or 429': r => r.status === 200 || r.status === 429 })
  errorRate.add(!ok)
  sleep(2)
}

/** Auth: forgot-password (rate-limited endpoint) */
export function scenarioForgotPassword() {
  const payload = JSON.stringify({
    email: `test${Math.floor(Math.random() * 10000)}@example.com`,
    redirectTo: `${BASE_URL}/reset-password`,
  })
  const res = http.post(`${BASE_URL}/api/auth/forgot-password`, payload, { headers: JSON_HEADERS })
  const ok = check(res, { 'forgot-pw 200 or 429': r => r.status === 200 || r.status === 429 })
  errorRate.add(!ok)
  sleep(1)
}

/** Notifications: fetch user notifications (requires auth cookie) */
export function scenarioNotifications(sessionCookie) {
  if (!sessionCookie) return
  const res = http.get(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: sessionCookie },
  })
  const ok = check(res, { 'notifications 200 or 401': r => r.status === 200 || r.status === 401 })
  errorRate.add(!ok)
  sleep(0.3)
}

export const THRESHOLDS = {
  http_req_duration: ['p(95)<3000', 'p(99)<8000'],
  http_req_failed: ['rate<0.05'],
  error_rate: ['rate<0.05'],
}
