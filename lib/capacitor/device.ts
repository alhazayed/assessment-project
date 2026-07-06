'use client'

import { isNativeApp } from './client'

/**
 * Thin, SSR-safe wrappers around device info + app-launcher.
 *
 * `getDeviceInfo()` returns null on the web so callers can branch on presence.
 * `canOpenApp()`/`openApp()` wrap @capacitor/app-launcher (App Launcher
 * detection) for opening external apps by URL/scheme. All are no-ops off-device.
 */

export interface NativeDeviceInfo {
  platform: string
  operatingSystem: string
  osVersion: string
  model: string
  manufacturer: string
  isVirtual: boolean
  webViewVersion: string
}

export async function getDeviceInfo(): Promise<NativeDeviceInfo | null> {
  if (!isNativeApp()) return null
  try {
    const { Device } = await import('@capacitor/device')
    const info = await Device.getInfo()
    return {
      platform: info.platform,
      operatingSystem: info.operatingSystem,
      osVersion: info.osVersion,
      model: info.model,
      manufacturer: info.manufacturer,
      isVirtual: info.isVirtual,
      webViewVersion: info.webViewVersion,
    }
  } catch {
    return null
  }
}

export async function canOpenApp(url: string): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { AppLauncher } = await import('@capacitor/app-launcher')
    const { value } = await AppLauncher.canOpenUrl({ url })
    return value
  } catch {
    return false
  }
}

export async function openApp(url: string): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { AppLauncher } = await import('@capacitor/app-launcher')
    const { completed } = await AppLauncher.openUrl({ url })
    return completed
  } catch {
    return false
  }
}
