'use client'

import { useQuery } from '@tanstack/react-query'

interface ActivityWeek {
  success: boolean
  current: number
  previous: number
  change: number | null
  timestamp: string
}

export function useActivityWeek() {
  return useQuery<ActivityWeek, Error>({
    queryKey: ['admin-widget', 'activity-week'],
    queryFn: async () => {
      const response = await fetch('/api/admin/widgets/activity-week')
      if (!response.ok) throw new Error('Failed to fetch week activity')
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    retry: 2,
  })
}
