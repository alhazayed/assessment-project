import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'
import { useAuth } from '@/lib/useAuth'
import { LocaleProvider } from '@/lib/LocaleContext'
import { handleAuthDeepLink } from '@/lib/auth-deep-link'

export default function RootLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [authLinkHandled, setAuthLinkHandled] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('@vwelfare_onboarded').then(val => {
      setOnboarded(val === 'true')
    })
  }, [])

  // Password-reset / email-confirm deep links (vwelfare://…)
  useEffect(() => {
    let active = true

    async function processUrl(url: string | null) {
      const result = await handleAuthDeepLink(url)
      if (!active || !result) return
      setAuthLinkHandled(true)
      if (result === 'recovery') {
        router.replace('/reset-password')
      }
    }

    Linking.getInitialURL().then(processUrl)
    const sub = Linking.addEventListener('url', ({ url }) => {
      processUrl(url)
    })
    return () => {
      active = false
      sub.remove()
    }
  }, [router])

  useEffect(() => {
    if (loading || onboarded === null) return

    if (!onboarded) {
      router.replace('/onboarding')
      return
    }

    const inAuth = segments[0] === '(auth)'
    const inApp = segments[0] === '(app)'
    const onReset = segments[0] === 'reset-password'

    if (!session && inApp) {
      router.replace('/(auth)/login')
    } else if (session && inAuth && !authLinkHandled) {
      router.replace('/(app)/dashboard')
    } else if (session && authLinkHandled && !onReset && segments[0] !== 'reset-password') {
      // recovery session already routed to reset-password by deep-link handler
    }
  }, [session, loading, segments, onboarded, authLinkHandled, router])

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
