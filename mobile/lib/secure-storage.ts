/**
 * Supabase-compatible storage adapter backed by expo-secure-store.
 * Falls back to AsyncStorage only when SecureStore is unavailable
 * (e.g. some web/dev environments).
 */
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    return await SecureStore.isAvailableAsync()
  } catch {
    return false
  }
}

export const SecureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (await canUseSecureStore()) {
      return SecureStore.getItemAsync(key, SECURE_OPTIONS)
    }
    return AsyncStorage.getItem(key)
  },

  async setItem(key: string, value: string): Promise<void> {
    if (await canUseSecureStore()) {
      await SecureStore.setItemAsync(key, value, SECURE_OPTIONS)
      return
    }
    await AsyncStorage.setItem(key, value)
  },

  async removeItem(key: string): Promise<void> {
    if (await canUseSecureStore()) {
      await SecureStore.deleteItemAsync(key, SECURE_OPTIONS)
      return
    }
    await AsyncStorage.removeItem(key)
  },
}
