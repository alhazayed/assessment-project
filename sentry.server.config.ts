import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // Enable performance monitoring on server
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  sampleRate: 1.0,

  // HTTP request tracing is a default integration in the Sentry Next.js SDK
  // (the removed Sentry.Integrations.Http namespace API is no longer needed).

  beforeSend(event) {
    // Don't report health checks (they're noise)
    if (event.request?.url?.includes('/api/health')) {
      return null
    }

    // Filter rate limiting errors (user behavior, not platform issue)
    if (event.exception) {
      const exception = event.exception.values?.[0]?.value || ''
      if (exception.includes('429') || exception.includes('rate limit')) {
        return null
      }
    }

    return event
  },
})
