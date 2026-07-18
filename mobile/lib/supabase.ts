import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { createChunkedSecureStore } from './secureStorage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

// Persist auth in the device keychain/keystore (encrypted at rest) instead of
// AsyncStorage (plaintext). Chunked to stay under SecureStore's 2048-byte limit,
// and migrates any pre-existing AsyncStorage session on first read so users are
// not signed out by this upgrade.
const authStorage = createChunkedSecureStore({
  secure: {
    getItemAsync: (key) => SecureStore.getItemAsync(key),
    setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
    deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
  },
  legacy: {
    getItem: (key) => AsyncStorage.getItem(key),
    removeItem: (key) => AsyncStorage.removeItem(key),
  },
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Native apps never parse the session out of a browser URL; deep links are
    // consumed explicitly via lib/useDeepLinkAuth.ts.
    detectSessionInUrl: false,
    // PKCE so password-recovery / magic links return a `?code=` we can exchange.
    flowType: 'pkce',
  },
})

// Supabase RN guidance: only auto-refresh while the app is foregrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
