'use client'

/**
 * Analytics interface — no vendor lock-in.
 *
 * Swap the implementation by replacing the functions below.
 * Consumers import from this file only; never from a specific provider.
 *
 * Events are no-ops until a provider is wired in (Phase 6+).
 */

export interface AnalyticsEvent {
  name: string
  params?: Record<string, string | number | boolean>
}

export interface CrashReportContext {
  userId?: string
  screen?: string
  extras?: Record<string, string>
}

// ── Provider interface ──────────────────────────────────────────────────────

interface AnalyticsProvider {
  track(event: AnalyticsEvent): void
  identify(userId: string, traits?: Record<string, string>): void
  screen(name: string, properties?: Record<string, string>): void
  reportCrash(error: Error, context?: CrashReportContext): void
  setUserProperty(key: string, value: string): void
}

// ── No-op provider (default until Phase 6) ─────────────────────────────────

const noopProvider: AnalyticsProvider = {
  track:           () => {},
  identify:        () => {},
  screen:          () => {},
  reportCrash:     () => {},
  setUserProperty: () => {},
}

let activeProvider: AnalyticsProvider = noopProvider

// ── Public API ──────────────────────────────────────────────────────────────

export function registerAnalyticsProvider(provider: AnalyticsProvider) {
  activeProvider = provider
}

export function trackEvent(event: AnalyticsEvent) {
  try { activeProvider.track(event) } catch {}
}

export function identifyUser(userId: string, traits?: Record<string, string>) {
  try { activeProvider.identify(userId, traits) } catch {}
}

export function trackScreen(name: string, properties?: Record<string, string>) {
  try { activeProvider.screen(name, properties) } catch {}
}

export function reportCrash(error: Error, context?: CrashReportContext) {
  try { activeProvider.reportCrash(error, context) } catch {}
}

export function setUserProperty(key: string, value: string) {
  try { activeProvider.setUserProperty(key, value) } catch {}
}

// ── Typed event helpers ─────────────────────────────────────────────────────

export const Events = {
  assessmentStarted:   (code: string)    => trackEvent({ name: 'assessment_started',   params: { code } }),
  assessmentCompleted: (code: string, score: number) =>
    trackEvent({ name: 'assessment_completed', params: { code, score } }),
  loginSuccess:        ()                => trackEvent({ name: 'login_success' }),
  logoutSuccess:       ()                => trackEvent({ name: 'logout_success' }),
  pdfExported:         (assessmentCode: string) =>
    trackEvent({ name: 'pdf_exported', params: { assessmentCode } }),
  moodLogged:          (score: number)   => trackEvent({ name: 'mood_logged',   params: { score } }),
  journalEntryCreated: ()                => trackEvent({ name: 'journal_entry_created' }),
  messageSent:         ()                => trackEvent({ name: 'message_sent' }),
  notificationGranted: ()                => trackEvent({ name: 'notification_permission_granted' }),
  notificationDenied:  ()                => trackEvent({ name: 'notification_permission_denied' }),
}
