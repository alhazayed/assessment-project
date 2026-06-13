/**
 * Load test — 250 concurrent virtual users
 * This level targets connection pool pressure on rate_limit_log.
 *
 * Run: npm run load:250
 */

import { sleep } from 'k6'
import { scenarioLanding, scenarioAIRecommend, scenarioGuestSubmit, scenarioForgotPassword, THRESHOLDS, GUEST_DEF_ID } from '../base.js'

export const options = {
  stages: [
    { duration: '3m', target: 250 },
    { duration: '7m', target: 250 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS,
    http_req_duration: ['p(95)<3000', 'p(99)<7000'],
  },
}

export default function () {
  const scenario = Math.random()
  if (scenario < 0.4) {
    scenarioLanding()
  } else if (scenario < 0.65) {
    scenarioAIRecommend()
  } else if (scenario < 0.85) {
    scenarioGuestSubmit(GUEST_DEF_ID, [])
  } else {
    scenarioForgotPassword()
  }
  sleep(1)
}
