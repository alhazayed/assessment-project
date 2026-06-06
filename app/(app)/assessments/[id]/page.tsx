'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { AssessmentDefinition, AssessmentItem, ResponseOption, ScoringBand } from '@/lib/types'

export default function TakeAssessmentPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [definition, setDefinition] = useState<AssessmentDefinition | null>(null)
  const [items, setItems] = useState<AssessmentItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { value: number; label_en: string; label_ar: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; band: string; high_risk: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [defRes, itemsRes] = await Promise.all([
        supabase.from('assessment_definitions').select('*').eq('id', id).single(),
        supabase.from('assessment_items').select('*').eq('definition_id', id).order('item_number'),
      ])
      if (defRes.data) setDefinition(defRes.data as AssessmentDefinition)
      if (itemsRes.data) setItems(itemsRes.data as AssessmentItem[])
    }
    load()
  }, [id])

  function calcScore(scoringLogic: ScoringBand[], totalScore: number) {
    for (const band of scoringLogic) {
      if (totalScore >= band.min && totalScore <= band.max) return band
    }
    return scoringLogic[scoringLogic.length - 1]
  }

  async function handleSubmit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !definition) return

    setSubmitting(true)
    setError(null)

    const totalScore = Object.values(answers).reduce((sum, a) => sum + a.value, 0)
    const band = calcScore(definition.scoring_logic, totalScore)
    const highRisk = definition.high_risk_threshold !== null && totalScore >= definition.high_risk_threshold

    const { data: submission, error: subError } = await supabase
      .from('assessment_submissions')
      .insert({
        patient_id: user.id,
        definition_id: definition.id,
        total_score: totalScore,
        severity_band: band?.severity_en || 'Unknown',
        high_risk_flag: highRisk,
        is_self_initiated: true,
      })
      .select()
      .single()

    if (subError || !submission) {
      setError('Failed to submit assessment. Please try again.')
      setSubmitting(false)
      return
    }

    const responses = items.map(item => {
      const ans = answers[item.id]
      return {
        submission_id: submission.id,
        item_id: item.id,
        response_value: ans?.value ?? 0,
        response_label_en: ans?.label_en ?? '',
        response_label_ar: ans?.label_ar ?? '',
      }
    })

    await supabase.from('assessment_responses').insert(responses)

    setResult({ score: totalScore, band: band?.severity_en || 'Unknown', high_risk: highRisk })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (!definition || items.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (submitted && result) {
    const isHighRisk = result.high_risk
    const isGood = result.band.toLowerCase().includes('minimal') || result.band.toLowerCase().includes('none') || result.band.toLowerCase().includes('normal')

    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          {isHighRisk ? (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          ) : (
            <div className={`w-16 h-16 ${isGood ? 'bg-green-100' : 'bg-orange-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 className={`w-8 h-8 ${isGood ? 'text-green-600' : 'text-orange-500'}`} />
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-1">Assessment Complete</h2>
          <p className="text-gray-500 text-sm mb-6">{definition.name_en}</p>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-4xl font-bold text-gray-900 mb-1">{result.score}</p>
            <p className="text-sm text-gray-500 mb-3">Total Score (out of {definition.total_questions * 3})</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
              isHighRisk ? 'bg-red-100 text-red-700' :
              isGood ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {result.band}
            </span>
          </div>

          {isHighRisk && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm font-semibold text-red-700 mb-1">Important Notice</p>
              <p className="text-sm text-red-600">
                Your score indicates you may be experiencing significant distress. Please reach out to your clinician or contact a mental health crisis line immediately.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/assessments')} className="btn-secondary">
              Back to Assessments
            </button>
            <button onClick={() => router.push('/dashboard')} className="btn-primary">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]
  const progress = ((currentIndex + 1) / items.length) * 100
  const currentAnswer = answers[currentItem.id]

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-gray-900">{definition.name_en}</h1>
          <span className="text-sm text-gray-400">{currentIndex + 1} / {items.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-brand-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="card p-8 mb-6">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">Question {currentIndex + 1}</p>
        <h2 className="text-lg font-medium text-gray-900 mb-6 leading-relaxed">{currentItem.question_en}</h2>

        <div className="space-y-3">
          {(currentItem.response_options as ResponseOption[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAnswers(prev => ({
                ...prev,
                [currentItem.id]: { value: opt.value, label_en: opt.label_en, label_ar: opt.label_ar }
              }))}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                currentAnswer?.value === opt.value
                  ? 'border-brand-500 bg-brand-50 text-brand-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mr-3 ${
                currentAnswer?.value === opt.value ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {opt.value}
              </span>
              {opt.label_en}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary gap-2 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {currentIndex < items.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            disabled={!currentAnswer}
            className="btn-primary gap-2 disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!currentAnswer || submitting || Object.keys(answers).length < items.length}
            className="btn-primary gap-2 disabled:opacity-40"
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {Object.keys(answers).length < items.length && currentIndex === items.length - 1 && (
        <p className="text-center text-xs text-orange-600 mt-3">
          Please answer all {items.length} questions before submitting. ({items.length - Object.keys(answers).length} remaining)
        </p>
      )}
    </div>
  )
}
