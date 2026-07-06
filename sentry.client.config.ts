import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // Enable performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Set sample rate for error events
  sampleRate: 1.0,

  // Enable profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Client options
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  beforeSend(event) {
    // Filter out non-critical errors
    if (event.exception) {
      const exception = event.exception.values?.[0]?.value || ''
      // Ignore network timeouts as they're often environmental
      if (exception.includes('timeout') && process.env.NODE_ENV === 'production') {
        return null
      }
    }
    return event
  },
})
