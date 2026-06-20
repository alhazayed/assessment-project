import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { AssessmentDefinition, AssessmentItem, ResponseOption, ScoringBand } from '@/lib/types'

function calcBand(bands: ScoringBand[], score: number): ScoringBand | null {
  for (const b of bands) { if (score >= b.min && score <= b.max) return b }
  return bands[bands.length - 1] ?? null
}

export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [def, setDef] = useState<AssessmentDefinition | null>(null)
  const [items, setItems] = useState<AssessmentItem[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [step, setStep] = useState<'intro' | 'questions' | 'result'>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [result, setResult] = useState<{ score: number; band: ScoringBand | null; highRisk: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('assessment_definitions').select('*').eq('id', id).single(),
      supabase.from('assessment_items').select('*').eq('definition_id', id).order('item_number'),
    ]).then(([defRes, itemsRes]) => {
      setDef(defRes.data)
      setItems(itemsRes.data || [])
      setLoading(false)
    })
  }, [id])

  async function handleSubmit() {
    if (!def) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const responses = items
      .filter(item => answers[item.id] !== undefined)
      .map(item => {
        const opt = item.response_options.find(o => o.value === answers[item.id])!
        return { item_id: item.id, response_value: answers[item.id], response_label_en: opt.label_en, response_label_ar: opt.label_ar }
      })

    const totalScore = responses.reduce((sum, r) => sum + r.response_value, 0)
    const band = calcBand(def.scoring_logic as ScoringBand[], totalScore)
    const highRisk = responses.some(r => {
      const item = items.find(i => i.id === r.item_id)
      return item?.is_safety_item && r.response_value > 0
    }) || (def.high_risk_threshold !== null && totalScore >= def.high_risk_threshold)

    const { data: submission } = await supabase
      .from('assessment_submissions')
      .insert({
        patient_id: user.id,
        definition_id: def.id,
        total_score: totalScore,
        severity_band: band?.severity_en ?? null,
        high_risk_flag: highRisk,
        is_self_initiated: true,
      })
      .select('id')
      .single()

    if (submission) {
      await supabase.from('assessment_responses').insert(
        responses.map(r => ({ submission_id: submission.id, ...r }))
      )
    }

    setResult({ score: totalScore, band, highRisk })
    setStep('result')
    setSubmitting(false)
  }

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#1D6296" /></View>
  }

  if (!def) {
    return <View className="flex-1 items-center justify-center"><Text>Assessment not found</Text></View>
  }

  const currentItem = items[currentIdx]
  const progress = items.length > 0 ? (Object.keys(answers).length / items.length) : 0

  // --- INTRO ---
  if (step === 'intro') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 pt-6">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Text style={{ color: '#1D6296' }}>← Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 mb-3">{def.name_en}</Text>
          {def.description_en && <Text className="text-gray-500 leading-relaxed mb-6">{def.description_en}</Text>}
          <View className="bg-gray-50 rounded-2xl p-4 mb-8">
            <Text className="text-gray-700 font-medium">{def.total_questions} questions</Text>
            <Text className="text-gray-500 text-sm mt-1">Takes about {Math.ceil(def.total_questions * 0.5)} minutes</Text>
          </View>
          <TouchableOpacity
            onPress={() => setStep('questions')}
            className="w-full py-4 rounded-2xl items-center"
            style={{ backgroundColor: '#1D6296' }}
          >
            <Text className="text-white font-semibold text-base">Begin Assessment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // --- QUESTIONS ---
  if (step === 'questions' && currentItem) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 pt-6">
          {/* Progress */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-gray-500">Question {currentIdx + 1} of {items.length}</Text>
            <Text className="text-sm font-medium" style={{ color: '#1D6296' }}>{Math.round(progress * 100)}%</Text>
          </View>
          <View className="h-2 bg-gray-100 rounded-full mb-8">
            <View className="h-2 rounded-full" style={{ backgroundColor: '#1D6296', width: `${progress * 100}%` }} />
          </View>

          {/* Question */}
          <Text className="text-xl font-semibold text-gray-900 mb-8 leading-relaxed">
            {currentItem.question_en}
          </Text>

          {/* Options */}
          <View className="gap-3 flex-1">
            {currentItem.response_options.map((opt: ResponseOption) => {
              const selected = answers[currentItem.id] === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setAnswers(prev => ({ ...prev, [currentItem.id]: opt.value }))
                    if (currentIdx < items.length - 1) {
                      setTimeout(() => setCurrentIdx(i => i + 1), 200)
                    }
                  }}
                  className="w-full py-4 px-5 rounded-2xl border"
                  style={{
                    backgroundColor: selected ? '#1D6296' : 'white',
                    borderColor: selected ? '#1D6296' : '#E5E7EB',
                  }}
                >
                  <Text style={{ color: selected ? 'white' : '#374151', fontWeight: '500' }}>
                    {opt.label_en}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Navigation */}
          <View className="flex-row gap-3 mt-6 pb-4">
            {currentIdx > 0 && (
              <TouchableOpacity
                onPress={() => setCurrentIdx(i => i - 1)}
                className="flex-1 py-3.5 rounded-2xl items-center border border-gray-200"
              >
                <Text className="text-gray-700 font-medium">← Previous</Text>
              </TouchableOpacity>
            )}
            {currentIdx < items.length - 1 ? (
              <TouchableOpacity
                onPress={() => setCurrentIdx(i => i + 1)}
                disabled={answers[currentItem.id] === undefined}
                className="flex-1 py-3.5 rounded-2xl items-center"
                style={{ backgroundColor: answers[currentItem.id] !== undefined ? '#1D6296' : '#E5E7EB' }}
              >
                <Text style={{ color: answers[currentItem.id] !== undefined ? 'white' : '#9CA3AF', fontWeight: '600' }}>
                  Next →
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || Object.keys(answers).length < items.length}
                className="flex-1 py-3.5 rounded-2xl items-center"
                style={{ backgroundColor: Object.keys(answers).length === items.length ? '#F3650A' : '#E5E7EB' }}
              >
                {submitting
                  ? <ActivityIndicator color="white" />
                  : <Text style={{ color: 'white', fontWeight: '700' }}>Submit</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // --- RESULT ---
  if (step === 'result' && result) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
          <Text className="text-2xl font-bold text-gray-900 mb-2">{def.name_en}</Text>
          <Text className="text-gray-500 mb-8">Your results</Text>

          <View className="rounded-3xl p-6 mb-6 items-center" style={{ backgroundColor: result.highRisk ? '#FEF2F2' : '#EBF4FA' }}>
            <Text className="text-5xl font-black mb-2" style={{ color: result.highRisk ? '#DC2626' : '#1D6296' }}>
              {result.score}
            </Text>
            {result.band && (
              <Text className="text-lg font-semibold text-gray-700">{result.band.severity_en}</Text>
            )}
            {result.highRisk && (
              <View className="mt-3 bg-red-100 px-4 py-2 rounded-full">
                <Text className="text-red-700 font-semibold text-sm">⚠ High Risk — Please seek support</Text>
              </View>
            )}
          </View>

          {result.highRisk && (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <Text className="text-red-800 font-semibold mb-1">Important</Text>
              <Text className="text-red-700 text-sm leading-relaxed">
                Your results indicate you may benefit from professional support. Please reach out to a mental health professional or contact a crisis line if you're in distress.
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.replace('/(app)/dashboard')}
            className="w-full py-4 rounded-2xl items-center"
            style={{ backgroundColor: '#1D6296' }}
          >
            <Text className="text-white font-semibold text-base">Back to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setStep('intro'); setAnswers({}); setCurrentIdx(0) }}
            className="w-full py-4 rounded-2xl items-center mt-3 border border-gray-200"
          >
            <Text className="text-gray-700 font-medium">Take Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return null
}
