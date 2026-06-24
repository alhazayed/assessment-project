'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { onConnectivityChange, isOnline } from '@/lib/mobile/offline'

/**
 * Offline Banner — shown when network connectivity is lost.
 * Works on both web and native (Capacitor).
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    // Set initial state
    setOffline(!isOnline())

    const cleanup = onConnectivityChange((online) => {
      setOffline(!online)
    })

    return cleanup
  }, [])

  if (!offline) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium"
      style={{
        backgroundColor: '#B91C1C',
        paddingTop: `max(0.625rem, calc(var(--safe-top, 0px) + 0.625rem))`,
      }}
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>No internet connection — some features may be unavailable</span>
    </div>
  )
}
