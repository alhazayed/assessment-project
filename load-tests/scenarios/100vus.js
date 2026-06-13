/**
 * Load test — 100 concurrent virtual users
 * Duration: 3 minutes ramp-up + 5 minutes steady state + 1 minute ramp-down
 *
 * Run: npm run load:100
 * Or:  k6 run load-tests/scenarios/100vus.js -e BASE_URL=https://vwelfare.vercel.app
 */

import { sleep } from 'k6'
import { scenarioLanding, scenarioAIRecommend, scenarioGuestSubmit, scenarioForgotPassword, THRESHOLDS, GUEST_DEF_ID } from '../base.js'

export const options = {
  stages: [
    { duration: '3m', target: 100 },   // ramp up
    { duration: '5m', target: 100 },   // steady state
    { duration: '1m', target: 0 },     // ramp down
  ],
  thresholds: {
    ...THRESHOLDS,
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
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
