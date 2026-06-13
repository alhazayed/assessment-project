import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import type { AssessmentSubmission, AssessmentDefinition } from '@/lib/types'

export default function DashboardScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState<(AssessmentSubmission & { definition: Pick<AssessmentDefinition, 'name_en'> })[]>([])
  const [loading, setLoading] = useState(true)

  const displayName = profile?.full_name_en?.split(' ')[0] ?? 'there'

  useEffect(() => {
    const { data: { user } } = { data: { user: null as any } }
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('assessment_submissions')
        .select('*, definition:assessment_definitions(name_en)')
        .eq('patient_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(5)
      setSubmissions((data as any) || [])
      setLoading(false)
    })()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">Hello, {displayName} 👋</Text>
          <Text className="text-gray-500 mt-1">How are you feeling today?</Text>
        </View>

        {/* Quick actions */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push('/(app)/assessments/index')}
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: '#1D6296' }}
          >
            <Text className="text-white font-semibold text-sm">Take Assessment</Text>
            <Text className="text-blue-200 text-xs mt-0.5">Clinically validated tools</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(app)/mood')}
            className="flex-1 rounded-2xl p-4 bg-white border border-gray-200"
          >
            <Text className="font-semibold text-gray-900 text-sm">Log Mood</Text>
            <Text className="text-gray-500 text-xs mt-0.5">Track how you feel</Text>
          </TouchableOpacity>
        </View>

        {/* Recent results */}
        <Text className="text-lg font-bold text-gray-900 mb-3">Recent Assessments</Text>
        {loading ? (
          <ActivityIndicator color="#1D6296" />
        ) : submissions.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-gray-200">
            <Text className="text-gray-500 text-center">No assessments yet.</Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/assessments/index')}
              className="mt-3 px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#1D6296' }}
            >
              <Text className="text-white font-medium text-sm">Browse Assessments</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {submissions.map(sub => (
              <View key={sub.id} className="bg-white rounded-2xl p-4 border border-gray-200">
                <View className="flex-row justify-between items-start">
                  <Text className="font-semibold text-gray-900 flex-1 mr-2">{sub.definition?.name_en}</Text>
                  {sub.high_risk_flag && (
                    <View className="bg-red-100 px-2 py-0.5 rounded-full">
                      <Text className="text-red-700 text-xs font-medium">High Risk</Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-500 text-sm mt-1">Score: {sub.total_score}</Text>
                {sub.severity_band && <Text className="text-gray-400 text-xs mt-0.5">{sub.severity_band}</Text>}
                <Text className="text-gray-400 text-xs mt-2">
                  {new Date(sub.submitted_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
