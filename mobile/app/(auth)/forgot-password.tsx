import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset() {
    if (!email) { setError('Enter your email'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'vwelfare://reset-password',
    })
    if (err) { setError(err.message); setLoading(false) }
    else setSent(true)
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-16 pb-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text style={{ color: '#1D6296' }}>← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-2">Reset password</Text>
        <Text className="text-gray-500 mb-8">We'll send a reset link to your email.</Text>
        {sent ? (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-green-700 font-medium">Email sent! Check your inbox.</Text>
          </View>
        ) : (
          <>
            {!!error && <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><Text className="text-red-600 text-sm">{error}</Text></View>}
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
            <TextInput
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm mb-6"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity onPress={handleReset} disabled={loading} className="w-full py-3.5 rounded-xl items-center" style={{ backgroundColor: '#1D6296' }}>
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Send reset link</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
