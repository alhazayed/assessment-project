import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function RegisterScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleRegister() {
    if (!name || !email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name_en: name } },
    })
    if (err) { setError(err.message); setLoading(false) }
    else setDone(true)
  }

  if (done) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Image source={require('../assets/logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" />
        <Text className="text-2xl font-bold text-gray-900 mt-6 mb-3">Check your email</Text>
        <Text className="text-gray-500 text-center mb-8">
          We sent a confirmation link to {email}. Tap it to activate your account, then sign in.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="w-full py-3.5 rounded-xl items-center" style={{ backgroundColor: '#1D6296' }}>
          <Text className="text-white font-semibold">Back to sign in</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pt-16 pb-8">
          <View className="items-center mb-10">
            <Image source={require('../assets/logo.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">Create account</Text>
          <Text className="text-gray-500 mb-8">Free access to all assessments</Text>

          {!!error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          {[
            { label: 'Full name', value: name, set: setName, placeholder: 'Your name', type: 'default' as const },
            { label: 'Email', value: email, set: setEmail, placeholder: 'you@example.com', type: 'email-address' as const },
            { label: 'Password', value: password, set: setPassword, placeholder: '••••••••', type: 'default' as const, secure: true },
          ].map(f => (
            <View key={f.label} className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">{f.label}</Text>
              <TextInput
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm"
                placeholder={f.placeholder}
                keyboardType={f.type}
                autoCapitalize={f.type === 'email-address' ? 'none' : 'words'}
                autoCorrect={false}
                secureTextEntry={f.secure}
                value={f.value}
                onChangeText={f.set}
              />
            </View>
          ))}

          <TouchableOpacity onPress={handleRegister} disabled={loading} className="w-full py-3.5 rounded-xl items-center mt-2 mb-4" style={{ backgroundColor: '#1D6296' }}>
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create account</Text>}
          </TouchableOpacity>

          <View className="flex-row justify-center">
            <Text className="text-gray-500 text-sm">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text className="text-sm font-semibold" style={{ color: '#1D6296' }}>Sign in</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
