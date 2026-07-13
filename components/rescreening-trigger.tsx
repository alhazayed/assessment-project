'use client'

import { useEffect } from 'react'
import { triggerRescreeningCheck } from '@/lib/rescreening-client'

export default function RescreeningTrigger() {
  useEffect(() => {
    triggerRescreeningCheck()
  }, [])

  return null
}
