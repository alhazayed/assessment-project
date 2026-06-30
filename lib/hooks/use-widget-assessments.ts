'use client'

import { useQuery } from '@tanstack/react-query'

interface Assessments {
  success: boolean
  count: number
  timestamp: string
}

export function useAssessmentsCount() {
  return useQuery<Assessments, Error>({
    queryKey: ['admin-widget', 'assessments'],
    queryFn: async () => {
      const response = await fetch('/api/admin/widgets/assessments')
      if (!response.ok) throw new Error('Failed to fetch assessments')
      return response.json()
    },
    staleTime: 1000 * 60 * 60, // 1 hour (rarely changes)
    gcTime: 1000 * 60 * 120,
    retry: 2,
  })
}
