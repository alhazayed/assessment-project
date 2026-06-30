'use client'

import { useQuery } from '@tanstack/react-query'

interface ActivityToday {
  success: boolean
  count: number
  timestamp: string
}

export function useActivityToday() {
  return useQuery<ActivityToday, Error>({
    queryKey: ['admin-widget', 'activity-today'],
    queryFn: async () => {
      const response = await fetch('/api/admin/widgets/activity-today')
      if (!response.ok) throw new Error('Failed to fetch activity')
      return response.json()
    },
    staleTime: 1000 * 60 * 1, // 1 minute (real-time focus)
    gcTime: 1000 * 60 * 5,
    retry: 2,
    refetchInterval: 1000 * 60, // Refetch every minute
  })
}
