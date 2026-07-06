'use client'

import { Capacitor } from '@capacitor/core'

/**
 * Client-side helpers for detecting whether the web app is running inside the
 * Capacitor native shell (the iOS/Android app) versus a normal browser.
 *
 * The platform is served remotely (see capacitor/capacitor.config.ts,
 * `server.url`). When Capacitor loads it in the native WebView it injects a
 * bridge so `Capacitor.isNativePlatform()` returns true and native plugins are
 * callable. In a regular browser these return `false` / `'web'` and every
 * native call must be guarded.
 *
 * All helpers are SSR-safe: during server rendering `window` is undefined and
 * Capacitor reports `web`, so nothing native runs until hydration on a device.
 */

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return Capacitor.isNativePlatform()
}

export function getNativePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  const p = Capacitor.getPlatform()
  return p === 'ios' || p === 'android' ? p : 'web'
}

export function isIOSApp(): boolean {
  return getNativePlatform() === 'ios'
}

export function isAndroidApp(): boolean {
  return getNativePlatform() === 'android'
}
