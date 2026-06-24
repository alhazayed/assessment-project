'use client'

/**
 * Detects whether the app is running inside a Capacitor native shell.
 * Safe to call on server — returns false when window is undefined.
 */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.()
}

export function getPlatform(): 'web' | 'ios' | 'android' {
  if (typeof window === 'undefined') return 'web'
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  const p = cap?.getPlatform?.()
  if (p === 'ios') return 'ios'
  if (p === 'android') return 'android'
  return 'web'
}

export const IS_IOS     = typeof window !== 'undefined' && getPlatform() === 'ios'
export const IS_ANDROID = typeof window !== 'undefined' && getPlatform() === 'android'
export const IS_NATIVE  = typeof window !== 'undefined' && isNative()
