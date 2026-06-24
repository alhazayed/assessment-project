'use client'

/**
 * Offline detection and basic cache utilities.
 *
 * Provides:
 *  - isOnline()       — current connectivity state
 *  - onConnectivityChange() — listener for online/offline transitions
 *  - cacheProfile()   — persist profile data for offline display
 *  - getCachedProfile()
 *  - cacheAssessmentList()
 *  - getCachedAssessmentList()
 */

import { secureGet, secureSet } from './secure-storage'

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

export function onConnectivityChange(
  callback: (online: boolean) => void
): () => void {
  function handleOnline()  { callback(true)  }
  function handleOffline() { callback(false) }

  window.addEventListener('online',  handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online',  handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

const CACHE_KEYS = {
  PROFILE:         'vw_cache_profile',
  ASSESSMENTS:     'vw_cache_assessments',
  LAST_SYNC:       'vw_cache_last_sync',
}

export async function cacheProfile(profile: Record<string, unknown>): Promise<void> {
  await secureSet(CACHE_KEYS.PROFILE, JSON.stringify(profile))
  await secureSet(CACHE_KEYS.LAST_SYNC, new Date().toISOString())
}

export async function getCachedProfile(): Promise<Record<string, unknown> | null> {
  const raw = await secureGet(CACHE_KEYS.PROFILE)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function cacheAssessmentList(
  assessments: Record<string, unknown>[]
): Promise<void> {
  await secureSet(CACHE_KEYS.ASSESSMENTS, JSON.stringify(assessments))
}

export async function getCachedAssessmentList(): Promise<
  Record<string, unknown>[] | null
> {
  const raw = await secureGet(CACHE_KEYS.ASSESSMENTS)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function getLastSyncTime(): Promise<Date | null> {
  const raw = await secureGet(CACHE_KEYS.LAST_SYNC)
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}
