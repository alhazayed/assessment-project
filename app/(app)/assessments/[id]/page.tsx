'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle,
  LogIn, BookOpen, FlaskConical, ArrowRight, Brain,
} from 'lucide-react'
import type { AssessmentDefinition, AssessmentItem, ResponseOption, ScoringBand } from '@/lib/types'
import { getAssessmentContent, getBandContent } from '@/lib/assessment-content'

function severityColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low') || b.includes('negative') || b.includes('below') || b.includes('no ')) return 'text-green-700 bg-green-50 border-green-200'
  if (b.includes('mild') || b.includes('subthreshold') || b.includes('moderate risk')) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  if (b.includes('moderate') || b.includes('possible')) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

interface RelatedAssessment {
  id: string
  code: string
  name_en: string
  description_en: string | null
  total_questions: number
}

export default function TakeAssessmentPage() {
  const { id } = useParams()
  const supabase = createClient()

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [definition, setDefinition] = useState<AssessmentDefinition | null>(null)
  const [items, setItems] = useState<AssessmentItem[]>([])
  const [relatedAssessments, setRelatedAssessments] = useState<RelatedAssessment[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { value: number; label_en: string; label_ar: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; band: string; high_risk: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      const [defRes, itemsRes] = await Promise.all([
        supabase.from('assessment_definitions').select('*').eq('id', id).single(),
        supabase.from('assessment_items').select('*').eq('definition_id', id).order('item_number'),
      ])
      if (defRes.data) setDefinition(defRes.data as AssessmentDefinition)
      if (itemsRes.data) setItems(itemsRes.data as AssessmentItem[])
    }
    load()
  }, [id])

  async function loadRelated(code: string) {
    const content = getAssessmentContent(code)
    if (!content || content.relatedCodes.length === 0) return
    const { data } = await supabase
      .from('assessment_definitions')
      .select('id, code, name_en, description_en, total_questions')
      .in('code', content.relatedCodes)
      .eq('is_active', true)
    if (data) setRelatedAssessments(data as RelatedAssessment[])
  }

  function calcBand(scoringLogic: ScoringBand[], totalScore: number) {
    for (const band of scoringLogic) {
      if (totalScore >= band.min && totalScore <= band.max) return band
    }
    return scoringLogic[scoringLogic.length - 1]
  }

  async function handleSubmit() {
    if (!definition) return
    setSubmitting(true)
    setError(null)

    const totalScore = Object.values(answers).reduce((sum, a) => sum + a.value, 0)
    const band = calcBand(definition.scoring_logic, totalScore)
    const highRisk = definition.high_risk_threshold !== null && totalScore >= definition.high_risk_threshold

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
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
        setError('Failed to save results. Please try again.')
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
    }

    setResult({ score: totalScore, band: band?.severity_en || 'Unknown', high_risk: highRisk })
    setSubmitted(true)
    setSubmitting(false)
    await loadRelated(definition.code)
  }

  if (!definition || items.length === 0 || isLoggedIn === null) {
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
    const assessmentContent = getAssessmentContent(definition.code)
    const bandContent = getBandContent(definition.code, result.band)
    const isPositive = result.band.toLowerCase().includes('minimal') || result.band.toLowerCase().includes('none') || result.band.toLowerCase().includes('normal') || result.band.toLowerCase().includes('low risk') || result.band.toLowerCase().includes('below') || result.band.toLowerCase().includes('no problem')

    return (
      <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">

        {/* Score Card */}
        <div className="card p-8 text-center">
          {isHighRisk ? (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          ) : (
            <div className={`w-16 h-16 ${isPositive ? 'bg-green-100' : 'bg-orange-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 className={`w-8 h-8 ${isPositive ? 'text-green-600' : 'text-orange-500'}`} />
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 mb-1">Assessment Complete</h2>
          <p className="text-sm text-gray-500 mb-6">{definition.name_en}</p>
          <div className="bg-gray-50 rounded-xl p-6 mb-4 inline-block min-w-48">
            <p className="text-5xl font-bold text-gray-900 mb-1">{result.score}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Total Score</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${severityColor(result.band)}`}>
              {result.band}
            </span>
          </div>

          {isHighRisk && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-left">
              <p className="text-sm font-semibold text-red-700 mb-1">⚠ Important Safety Notice</p>
              <p className="text-sm text-red-600">
                Your score indicates significant distress. Please reach out to a mental health professional or crisis line as soon as possible. You are not alone.
              </p>
            </div>
          )}

          {!isLoggedIn && (
            <div className="mt-4 p-4 bg-brand-50 border border-brand-200 rounded-xl text-left">
              <div className="flex items-start gap-3">
                <LogIn className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-brand-800">Save your results</p>
                  <p className="text-sm text-brand-600 mt-1">Create a free account to track changes over time and access personalised insights.</p>
                  <div className="flex gap-2 mt-3">
                    <Link href="/register" className="btn-primary text-xs px-3 py-1.5">Create free account</Link>
                    <Link href="/login" className="btn-secondary text-xs px-3 py-1.5">Sign in</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {isLoggedIn && (
            <p className="mt-4 text-sm text-green-600 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Results saved to your account
            </p>
          )}
        </div>

        {/* About This Assessment */}
        {assessmentContent && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">About This Assessment</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">{assessmentContent.overview}</p>
            <p className="text-xs text-gray-400">
              <span className="font-medium">Measures:</span> {assessmentContent.measuresDomain}
            </p>
          </div>
        )}

        {/* Scientific Explanation */}
        {bandContent && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">
                What Your Score Means — <span className={`text-sm font-medium px-2 py-0.5 rounded-full border ${severityColor(result.band)}`}>{result.band}</span>
              </h3>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-5">{bandContent.explanation}</p>

            {bandContent.whatThisMeans.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Points</p>
                <ul className="space-y-2">
                  {bandContent.whatThisMeans.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0 mt-2" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bandContent.recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Evidence-Based Recommendations</p>
                <ul className="space-y-2">
                  {bandContent.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Related Disorders */}
        {bandContent && bandContent.relatedDisorders.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">Related Conditions to Be Aware Of</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">These conditions may be related to your results or share overlapping symptoms. Only a qualified clinician can provide a diagnosis.</p>
            <div className="space-y-3">
              {bandContent.relatedDisorders.map((disorder, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0 mt-1.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{disorder.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{disorder.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Assessments */}
        {relatedAssessments.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">Suggested Next Assessments</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Based on your results, these assessments may provide additional insight into related areas of mental health.</p>
            <div className="grid grid-cols-2 gap-3">
              {relatedAssessments.map((ra) => (
                <Link
                  key={ra.id}
                  href={`/assessments/${ra.id}`}
                  className="p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">{ra.code}</span>
                    <span className="text-xs text-gray-400">{ra.total_questions}Q</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-800 leading-snug">{ra.name_en}</p>
                  {ra.description_en && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ra.description_en}</p>
                  )}
                  <p className="text-xs text-brand-600 mt-2 font-medium">Take assessment →</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center pb-8">
          <Link href="/assessments" className="btn-secondary">All Assessments</Link>
          {isLoggedIn && <Link href="/dashboard" className="btn-primary">Dashboard</Link>}
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]
  const progress = ((currentIndex + 1) / items.length) * 100
  const currentAnswer = answers[currentItem.id]
  const allAnswered = Object.keys(answers).length >= items.length

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{definition.name_en}</h1>
            {!isLoggedIn && (
              <p className="text-xs text-gray-400 mt-0.5">
                <Link href="/register" className="text-brand-600 hover:underline">Sign up</Link> to save your results
              </p>
            )}
          </div>
          <span className="text-sm text-gray-400">{currentIndex + 1} / {items.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-brand-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {currentIndex < items.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            disabled={!currentAnswer}
            className="btn-primary gap-2 disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="btn-primary gap-2 disabled:opacity-40"
          >
            {submitting ? 'Submitting...' : 'See Results'} <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {!allAnswered && currentIndex === items.length - 1 && (
        <p className="text-center text-xs text-orange-600 mt-3">
          {items.length - Object.keys(answers).length} question(s) still need an answer
        </p>
      )}
    </div>
  )
}
