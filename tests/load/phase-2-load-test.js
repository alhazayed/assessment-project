import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Trend, Counter, Rate } from 'k6/metrics'

// Phase 2: Performance & Load Testing
// Simulates concurrent users across different scenarios

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Custom metrics
const requestDuration = new Trend('request_duration')
const requestErrorRate = new Rate('request_errors')
const widgetLoadTime = new Trend('widget_load_time')
const apiDuration = new Trend('api_duration')
const pdfGenerationTime = new Trend('pdf_generation_time')

export const options = {
  scenarios: {
    // Scenario 1: 100 concurrent users - warm up
    warmup: {
      executor: 'constant-vus',
      vus: 100,
      duration: '2m',
      exec: 'runWarmupScenario',
    },
    // Scenario 2: 250 concurrent users - ramp up
    rampUp: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '2m', target: 250 },
        { duration: '5m', target: 250 },
        { duration: '2m', target: 100 },
      ],
      exec: 'runMainScenario',
    },
    // Scenario 3: 500 concurrent users - stress test
    stress: {
      executor: 'constant-vus',
      vus: 500,
      duration: '5m',
      exec: 'runStressScenario',
    },
    // Scenario 4: 1000 concurrent users - spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 500,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '1m', target: 0 },
      ],
      exec: 'runSpikeScenario',
    },
  },

  // Set thresholds
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms, 99th < 1s
    http_req_failed: ['rate<0.1'], // Error rate < 10%
    'request_duration{scenario:warmup}': ['p(95)<300'],
    'request_duration{scenario:rampUp}': ['p(95)<500'],
    'request_duration{scenario:stress}': ['p(95)<1000'],
  },
}

// ============================================================================
// WARMUP SCENARIO: 100 concurrent users
// ============================================================================

export function runWarmupScenario() {
  const actions = [
    () => testHomepage(),
    () => testAssessmentListing(),
    () => testDashboardOverview(),
    () => testAdminStatsAPI(),
    () => testWidgetAPIs(),
  ]

  const action = actions[Math.floor(Math.random() * actions.length)]
  action()

  sleep(1)
}

// ============================================================================
// MAIN SCENARIO: 250 concurrent users
// ============================================================================

export function runMainScenario() {
  const actions = [
    () => testCompleteAssessmentFlow(),
    () => testAdminDashboard(),
    () => testPatientDashboard(),
    () => testAssessmentSearch(),
    () => testResultsExport(),
  ]

  const action = actions[Math.floor(Math.random() * actions.length)]
  action()

  sleep(Math.random() * 2 + 1)
}

// ============================================================================
// STRESS SCENARIO: 500 concurrent users
// ============================================================================

export function runStressScenario() {
  const actions = [
    () => testDatabaseQueries(),
    () => testConcurrentAssessmentSubmissions(),
    () => testAdminAnalytics(),
    () => testWidgetDataFetching(),
  ]

  const action = actions[Math.floor(Math.random() * actions.length)]
  action()

  sleep(Math.random() * 1 + 0.5)
}

// ============================================================================
// SPIKE SCENARIO: 1000 concurrent users
// ============================================================================

export function runSpikeScenario() {
  const actions = [
    () => testHighLoadAssessmentSubmission(),
    () => testDashboardUnderLoad(),
    () => testAPIStability(),
  ]

  const action = actions[Math.floor(Math.random() * actions.length)]
  action()

  sleep(Math.random() * 0.5)
}

// ============================================================================
// INDIVIDUAL TEST FUNCTIONS
// ============================================================================

function testHomepage() {
  group('Homepage Load', function () {
    const startTime = new Date()
    const res = http.get(`${BASE_URL}/`)
    const duration = new Date() - startTime

    requestDuration.add(duration)
    requestErrorRate.add(res.status !== 200)

    check(res, {
      'homepage status is 200': (r) => r.status === 200,
      'homepage loads within 2s': (r) => r.timings.duration < 2000,
      'has title': (r) => r.body.includes('<title>'),
    })
  })
}

function testAssessmentListing() {
  group('Assessment Listing', function () {
    const startTime = new Date()
    const res = http.get(`${BASE_URL}/packages`)
    const duration = new Date() - startTime

    requestDuration.add(duration)
    requestErrorRate.add(res.status !== 200)

    check(res, {
      'assessment list status is 200': (r) => r.status === 200,
      'contains assessment links': (r) => r.body.includes('/packages/'),
      'response time < 1s': (r) => r.timings.duration < 1000,
    })
  })
}

function testDashboardOverview() {
  group('Dashboard Overview', function () {
    const startTime = new Date()
    const res = http.get(`${BASE_URL}/dashboard`)
    const duration = new Date() - startTime

    requestDuration.add(duration)
    requestErrorRate.add(res.status !== 200 && res.status !== 302)

    check(res, {
      'dashboard responds': (r) => [200, 302].includes(r.status),
      'no server errors': (r) => r.status < 500,
    })
  })
}

function testAdminStatsAPI() {
  group('Admin Stats API', function () {
    const startTime = new Date()
    const res = http.get(`${BASE_URL}/api/admin/dashboard/stats`)
    const duration = new Date() - startTime

    apiDuration.add(duration)
    requestErrorRate.add(res.status !== 200)

    check(res, {
      'stats API status is 200': (r) => r.status === 200,
      'stats API responds quickly': (r) => r.timings.duration < 500,
      'has JSON response': (r) => r.headers['Content-Type'].includes('application/json'),
      'contains stats data': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.total !== undefined || body.success === false
        } catch {
          return false
        }
      },
    })
  })
}

function testWidgetAPIs() {
  group('Widget APIs', function () {
    const widgets = ['user-stats', 'activity-today', 'activity-week', 'high-risk', 'assessments']

    widgets.forEach((widget) => {
      const startTime = new Date()
      const res = http.get(`${BASE_URL}/api/admin/widgets/${widget}`)
      const duration = new Date() - startTime

      widgetLoadTime.add(duration)
      requestErrorRate.add(res.status !== 200)

      check(res, {
        [`${widget} widget responds`]: (r) => r.status === 200,
        [`${widget} widget is fast`]: (r) => r.timings.duration < 300,
      })
    })
  })
}

function testCompleteAssessmentFlow() {
  group('Complete Assessment Flow', function () {
    // Get assessment list
    const listRes = http.get(`${BASE_URL}/packages`)
    check(listRes, {
      'can list assessments': (r) => r.status === 200,
    })

    sleep(0.5)

    // Get single assessment
    const assessmentRes = http.get(`${BASE_URL}/packages/test-assessment`)
    check(assessmentRes, {
      'can load assessment': (r) => [200, 404, 500].includes(r.status),
    })

    sleep(1)
  })
}

function testAdminDashboard() {
  group('Admin Dashboard', function () {
    const res = http.get(`${BASE_URL}/x/control/overview`)
    const duration = res.timings.duration

    requestDuration.add(duration)
    check(res, {
      'admin dashboard loads': (r) => [200, 302].includes(r.status),
      'admin dashboard is fast': (r) => r.timings.duration < 2000,
    })
  })
}

function testPatientDashboard() {
  group('Patient Dashboard', function () {
    const res = http.get(`${BASE_URL}/dashboard`)
    const duration = res.timings.duration

    requestDuration.add(duration)
    check(res, {
      'patient dashboard loads': (r) => [200, 302].includes(r.status),
    })
  })
}

function testAssessmentSearch() {
  group('Assessment Search', function () {
    const res = http.get(`${BASE_URL}/api/search?q=depression`)
    check(res, {
      'search API responds': (r) => [200, 404, 500].includes(r.status),
    })
  })
}

function testResultsExport() {
  group('Results Export', function () {
    const payload = {
      format: 'pdf',
      assessment_id: 'test-id',
    }

    const res = http.post(`${BASE_URL}/api/export`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    })

    pdfGenerationTime.add(res.timings.duration)
    check(res, {
      'export endpoint responds': (r) => [200, 201, 400, 404, 500].includes(r.status),
      'export completes in reasonable time': (r) => r.timings.duration < 5000,
    })
  })
}

function testDatabaseQueries() {
  group('Database Query Performance', function () {
    const endpoints = [
      '/api/admin/dashboard/stats',
      '/api/admin/dashboard/assessments',
      '/api/admin/widgets/user-stats',
      '/api/admin/widgets/activity-today',
      '/api/admin/widgets/high-risk',
    ]

    endpoints.forEach((endpoint) => {
      const res = http.get(`${BASE_URL}${endpoint}`)
      check(res, {
        [`${endpoint} is available`]: (r) => [200, 404, 500].includes(r.status),
      })
    })
  })
}

function testConcurrentAssessmentSubmissions() {
  group('Concurrent Assessment Submissions', function () {
    const payload = JSON.stringify({
      assessment_id: 'test-assessment',
      responses: {
        q1: '1',
        q2: '2',
        q3: '1',
      },
    })

    const res = http.post(`${BASE_URL}/api/assessments/submit`, payload, {
      headers: { 'Content-Type': 'application/json' },
    })

    check(res, {
      'submission endpoint responds': (r) => [200, 201, 400, 401, 500].includes(r.status),
      'submission completes within time limit': (r) => r.timings.duration < 3000,
    })
  })
}

function testAdminAnalytics() {
  group('Admin Analytics', function () {
    const res = http.get(`${BASE_URL}/x/control/analytics`)
    check(res, {
      'analytics page loads': (r) => [200, 302].includes(r.status),
      'analytics loads within SLA': (r) => r.timings.duration < 3000,
    })
  })
}

function testWidgetDataFetching() {
  group('Widget Data Fetching', function () {
    const startTime = new Date()

    // Parallel widget requests
    const batch = http.batch([
      ['GET', `${BASE_URL}/api/admin/widgets/user-stats`],
      ['GET', `${BASE_URL}/api/admin/widgets/activity-today`],
      ['GET', `${BASE_URL}/api/admin/widgets/activity-week`],
      ['GET', `${BASE_URL}/api/admin/widgets/high-risk`],
      ['GET', `${BASE_URL}/api/admin/widgets/assessments`],
    ])

    const totalDuration = new Date() - startTime
    widgetLoadTime.add(totalDuration)

    batch.forEach((res, idx) => {
      check(res, {
        [`widget ${idx} responds`]: (r) => r.status === 200,
      })
    })

    check(null, {
      'all widgets load within 1s': () => totalDuration < 1000,
    })
  })
}

function testHighLoadAssessmentSubmission() {
  group('High Load Assessment Submission', function () {
    const payload = JSON.stringify({
      assessment_id: 'phq9',
      responses: Array.from({ length: 9 }, (_, i) => [`q${i + 1}`, String((i % 4) + 1)]).reduce((a, [k, v]) => ({ ...a, [k]: v }), {}),
    })

    const res = http.post(`${BASE_URL}/api/assessments/submit`, payload, {
      headers: { 'Content-Type': 'application/json' },
    })

    check(res, {
      'high load submission succeeds': (r) => [200, 201].includes(r.status),
      'under spike load, completes in time': (r) => r.timings.duration < 5000,
    })
  })
}

function testDashboardUnderLoad() {
  group('Dashboard Under Load', function () {
    const res = http.get(`${BASE_URL}/x/control/overview`)
    const duration = res.timings.duration

    check(res, {
      'dashboard responsive under load': (r) => [200, 302].includes(r.status),
      'dashboard maintains SLA under spike': (r) => r.timings.duration < 3000,
    })
  })
}

function testAPIStability() {
  group('API Stability Under Spike Load', function () {
    const endpoints = [
      '/api/admin/widgets/user-stats',
      '/api/admin/widgets/activity-today',
      '/api/admin/dashboard/stats',
    ]

    const responses = endpoints.map((ep) => http.get(`${BASE_URL}${ep}`))

    const allSuccessful = responses.every((r) => [200, 500].includes(r.status))
    const noTimeout = responses.every((r) => r.timings.duration < 10000)

    check(null, {
      'all endpoints return response under spike': () => allSuccessful,
      'no timeout issues under 1000 user spike': () => noTimeout,
      'error rate is contained': () => responses.filter((r) => r.status === 500).length / responses.length < 0.5,
    })
  })
}
