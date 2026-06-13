/**
 * Load test — 1000 concurrent virtual users
 * Spike / soak test. Do NOT run against production without Redis rate limiting enabled.
 * At this scale, DB-backed rate limiting WILL become a bottleneck.
 *
 * Run: npm run load:1000
 */

import { sleep } from 'k6'
import { scenarioLanding, scenarioAIRecommend, scenarioForgotPassword, THRESHOLDS } from '../base.js'

export const options = {
  stages: [
    { duration: '5m', target: 1000 },
    { duration: '10m', target: 1000 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS,
    http_req_duration: ['p(95)<8000', 'p(99)<15000'],
    http_req_failed: ['rate<0.20'],
    error_rate: ['rate<0.20'],
  },
}

export default function () {
  // At 1000 VUs, focus on read-heavy scenarios to avoid overwhelming the DB
  const scenario = Math.random()
  if (scenario < 0.6) {
    scenarioLanding()
  } else if (scenario < 0.85) {
    scenarioAIRecommend()
  } else {
    scenarioForgotPassword()
  }
  sleep(2)
}
