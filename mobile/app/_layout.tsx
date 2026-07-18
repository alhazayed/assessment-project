import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/lib/useAuth'
import { useDeepLinkAuth } from '@/lib/useDeepLinkAuth'
import { LocaleProvider } from '@/lib/LocaleContext'

export default function RootLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()
  const [onboarded, setOnboarded] = useState<boolean | null>(null)

  // Handle Supabase auth deep links (password recovery / magic links).
  useDeepLinkAuth()

  useEffect(() => {
    AsyncStorage.getItem('@vwelfare_onboarded').then(val => {
      setOnboarded(val === 'true')
    })
  }, [])

  useEffect(() => {
    if (loading || onboarded === null) return

    if (!onboarded) {
      router.replace('/onboarding')
      return
    }

    const inAuth = segments[0] === '(auth)'
    const inApp = segments[0] === '(app)'

    if (!session && inApp) {
      router.replace('/(auth)/login')
    } else if (session && inAuth) {
      router.replace('/(app)/dashboard')
    }
  }, [session, loading, segments, onboarded])

  return (
    <LocaleProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </LocaleProvider>
  )
}
