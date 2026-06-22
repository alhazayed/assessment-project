import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@vwelfare_notifications_enabled'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
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
