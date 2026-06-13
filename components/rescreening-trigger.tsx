'use client'

import { useEffect } from 'react'

export default function RescreeningTrigger() {
  useEffect(() => {
    fetch('/api/check-rescreening', { method: 'POST' }).catch(() => {})
  }, [])

  return null
}
