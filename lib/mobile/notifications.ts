'use client'

/**
 * Push notification infrastructure — interface layer only.
 *
 * Provider (FCM / APNs) is NOT wired here.
 * This file registers the device token and defines
 * the notification type contracts.
 *
 * Usage:
 *   import { requestPushPermission, getPushToken } from '@/lib/mobile/notifications'
 *   const token = await getPushToken()
 *   // Store token in Supabase profiles.push_token for server-side sending
 */

import { isNative } from './platform'

export type NotificationType =
  | 'appointment_reminder'
  | 'medication_reminder'
  | 'clinician_message'
  | 'assessment_invitation'
  | 'emergency'

export interface NotificationPayload {
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Request push notification permission and return the device token.
 * Returns null on web or if permission is denied.
 */
export async function requestPushPermission(): Promise<string | null> {
  if (!isNative()) return null

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const result = await PushNotifications.requestPermissions()
    if (result.receive !== 'granted') return null

    await PushNotifications.register()

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        resolve(token.value)
      })
      PushNotifications.addListener('registrationError', () => {
        resolve(null)
      })
    })
  } catch {
    return null
  }
}

/**
 * Get current push token without re-requesting permission.
 */
export async function getPushToken(): Promise<string | null> {
  return requestPushPermission()
}

/**
 * Listen for foreground notifications.
 * Returns a cleanup function.
 */
export function onForegroundNotification(
  handler: (notification: NotificationPayload) => void
): () => void {
  if (!isNative()) return () => {}

  let cleanup: (() => void) | undefined

  import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    const listenerPromise = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        handler({
          type: (notification.data?.type as NotificationType) ?? 'clinician_message',
          title: notification.title ?? '',
          body:  notification.body  ?? '',
          data:  notification.data,
        })
      }
    )
    listenerPromise.then(handle => {
      cleanup = () => handle.remove()
    })
  })

  return () => cleanup?.()
}

/**
 * Listen for notification tap (app opened from notification).
 * Returns a cleanup function.
 */
export function onNotificationTap(
  handler: (data: Record<string, string>) => void
): () => void {
  if (!isNative()) return () => {}

  let cleanup: (() => void) | undefined

  import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    const listenerPromise = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        handler(action.notification.data ?? {})
      }
    )
    listenerPromise.then(handle => {
      cleanup = () => handle.remove()
    })
  })

  return () => cleanup?.()
}
