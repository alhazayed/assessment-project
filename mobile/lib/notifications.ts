import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = '@vwelfare_notifications_enabled'
const TOKEN_KEY = '@vwelfare_push_token'
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://vwelfare.vercel.app'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync()
    if (!expoPushToken) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'

    await fetch(`${WEB_URL}/api/user/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token: expoPushToken, platform }),
    })

    await AsyncStorage.setItem(TOKEN_KEY, expoPushToken)
  } catch {
    // Non-fatal — push notifications optional
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY)
    if (!token) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await fetch(`${WEB_URL}/api/user/push-token`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token }),
    })

    await AsyncStorage.removeItem(TOKEN_KEY)
  } catch {
    // Non-fatal
  }
}

export async function scheduleDailyMoodReminder(lang: 'en' | 'ar'): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('mood-daily').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'mood-daily',
    content: {
      title: lang === 'ar' ? '🌙 كيف حالك اليوم؟' : '🌙 How are you feeling today?',
      body: lang === 'ar'
        ? 'سجّل مزاجك اليومي في تطبيق Vwelfare'
        : 'Log your daily mood in Vwelfare',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  })
}

export async function scheduleWeeklyAssessmentReminder(lang: 'en' | 'ar'): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('assessment-weekly').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'assessment-weekly',
    content: {
      title: lang === 'ar' ? '📊 وقت التقييم الأسبوعي' : '📊 Weekly Check-In Time',
      body: lang === 'ar'
        ? 'تابع صحتك النفسية بإكمال تقييم هذا الأسبوع'
        : 'Track your mental health by completing this week\'s assessment',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 10,
      minute: 0,
    },
  })
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEY)
  return val === 'true'
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
}
