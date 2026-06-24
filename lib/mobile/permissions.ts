'use client'

/**
 * Unified native permission request layer.
 *
 * Checks and requests only permissions that are actually needed
 * at the time of use (not at app startup).
 */

import { isNative } from './platform'

export type PermissionResult = 'granted' | 'denied' | 'prompt' | 'unavailable'

/**
 * Camera permission — required for profile photo capture and document scanning.
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  if (!isNative()) return 'unavailable'
  try {
    const { Camera } = await import('@capacitor/camera')
    const status = await Camera.requestPermissions({ permissions: ['camera'] })
    return normaliseState(status.camera as string)
  } catch {
    return 'unavailable'
  }
}

/**
 * Photo library permission — for picking existing images.
 */
export async function requestPhotoLibraryPermission(): Promise<PermissionResult> {
  if (!isNative()) return 'unavailable'
  try {
    const { Camera } = await import('@capacitor/camera')
    const status = await Camera.requestPermissions({ permissions: ['photos'] })
    return normaliseState(status.photos as string)
  } catch {
    return 'unavailable'
  }
}

/**
 * Push notification permission.
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (!isNative()) {
    // Web Notification API
    if (!('Notification' in window)) return 'unavailable'
    const result = await Notification.requestPermission()
    return result === 'granted' ? 'granted' : 'denied'
  }
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const status = await PushNotifications.requestPermissions()
    return status.receive === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'unavailable'
  }
}

function normaliseState(state: string): PermissionResult {
  if (state === 'granted') return 'granted'
  if (state === 'denied')  return 'denied'
  if (state === 'prompt' || state === 'prompt-with-rationale') return 'prompt'
  return 'unavailable'
}
