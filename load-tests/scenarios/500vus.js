/**
 * Load test — 500 concurrent virtual users
 * Stress test: expect rate limit saturation and potential DB pool exhaustion.
 * Monitor Supabase connection pool utilisation during this run.
 *
 * Run: npm run load:500
 */

import { sleep } from 'k6'
import { scenarioLanding, scenarioAIRecommend, scenarioGuestSubmit, scenarioForgotPassword, THRESHOLDS, GUEST_DEF_ID } from '../base.js'

export const options = {
  stages: [
    { duration: '4m', target: 500 },
    { duration: '8m', target: 500 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS,
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.10'],  // allow higher error rate at stress level
    error_rate: ['rate<0.10'],
  },
}

export default function () {
  const scenario = Math.random()
  if (scenario < 0.4) {
    scenarioLanding()
  } else if (scenario < 0.60) {
    scenarioAIRecommend()
  } else if (scenario < 0.80) {
    scenarioGuestSubmit(GUEST_DEF_ID, [])
  } else {
    scenarioForgotPassword()
  }
  sleep(1.5)
}
