'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Loader2 } from 'lucide-react'

interface Props {
  packageId: string
  labelCompute: string
  labelComputing: string
  hasResult: boolean
  labelViewResults: string
  resultPath: string
  allCompleted: boolean
  labelCompleteAll: string
}

export default function ComputeButton({
  packageId, labelCompute, labelComputing, hasResult,
  labelViewResults, resultPath, allCompleted, labelCompleteAll,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (hasResult) {
    return (
      <a
        href={resultPath}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--vw-blue)' }}
      >
        {labelViewResults}
      </a>
    )
  }

  if (!allCompleted) {
    return (
      <p className="text-[13px] italic" style={{ color: 'var(--text-muted)' }}>
        {labelCompleteAll}
      </p>
    )
  }

  async function handleCompute() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/packages/${packageId}/compute`, { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to compute score')
      }
      router.push(resultPath)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCompute}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: 'var(--vw-blue)' }}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />{labelComputing}</>
          : <><Calculator className="w-4 h-4" />{labelCompute}</>
        }
      </button>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  )
}
