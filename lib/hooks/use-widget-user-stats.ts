'use client'

import { useQuery } from '@tanstack/react-query'

interface UserStats {
  success: boolean
  total: number
  roles: Record<string, number>
  source: 'cache' | 'live'
  timestamp: string
}

export function useUserStats() {
  return useQuery<UserStats, Error>({
    queryKey: ['admin-widget', 'user-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/widgets/user-stats')
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.statusText}`)
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  })
}
