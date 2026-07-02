'use client'

import { useQuery } from '@tanstack/react-query'

interface HighRisk {
  success: boolean
  current: number
  previous: number
  change: number | null
  percentage: number
  timestamp: string
}

export function useHighRisk() {
  return useQuery<HighRisk, Error>({
    queryKey: ['admin-widget', 'high-risk'],
    queryFn: async () => {
      const response = await fetch('/api/admin/widgets/high-risk')
      if (!response.ok) throw new Error('Failed to fetch high-risk')
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    retry: 2,
  })
}
