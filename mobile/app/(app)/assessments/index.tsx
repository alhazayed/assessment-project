import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { AssessmentDefinition } from '@/lib/types'

export default function AssessmentsScreen() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<AssessmentDefinition[]>([])
  const [filtered, setFiltered] = useState<AssessmentDefinition[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('assessment_definitions')
      .select('*')
      .eq('is_active', true)
      .order('name_en')
      .then(({ data }) => {
        setAssessments(data || [])
        setFiltered(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!search.trim()) { setFiltered(assessments); return }
    const q = search.toLowerCase()
    setFiltered(assessments.filter(a =>
      a.name_en.toLowerCase().includes(q) ||
      (a.description_en ?? '').toLowerCase().includes(q)
    ))
  }, [search, assessments])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Assessments</Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm"
          placeholder="Search assessments..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D6296" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={a => a.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(app)/assessments/${item.id}`)}
              className="bg-white rounded-2xl p-4 border border-gray-200"
            >
              <View className="flex-row justify-between items-start">
                <Text className="font-semibold text-gray-900 flex-1 mr-3">{item.name_en}</Text>
                <View className="bg-brand-50 px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EBF4FA' }}>
                  <Text className="text-xs font-medium" style={{ color: '#1D6296' }}>
                    {item.total_questions}Q
                  </Text>
                </View>
              </View>
              {item.description_en && (
                <Text className="text-gray-500 text-sm mt-1.5" numberOfLines={2}>{item.description_en}</Text>
              )}
              <View className="mt-3 flex-row items-center">
                <Text className="text-sm font-medium" style={{ color: '#1D6296' }}>Start →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}
