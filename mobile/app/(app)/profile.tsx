import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

export default function ProfileScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [nameEn, setNameEn] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setNameEn(profile.full_name_en)
  }, [profile])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('profiles').update({ full_name_en: nameEn }).eq('id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-6">Profile</Text>

        {/* Avatar */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#1D6296' }}>
            <Text className="text-3xl font-bold text-white">
              {(nameEn || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="font-semibold text-gray-900 text-lg">{nameEn}</Text>
          <Text className="text-gray-500 text-sm capitalize">{profile?.role ?? 'patient'}</Text>
        </View>

        {/* Fields */}
        <View className="bg-white rounded-2xl p-5 border border-gray-200 mb-4">
          <Text className="font-semibold text-gray-900 mb-4">Personal Information</Text>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">Full Name</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm mb-4"
            value={nameEn}
            onChangeText={setNameEn}
          />
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl items-center"
            style={{ backgroundColor: saved ? '#16A34A' : '#1D6296' }}
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold">{saved ? '✓ Saved' : 'Save Changes'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="w-full py-3.5 rounded-2xl items-center border border-red-200 bg-red-50 mt-4"
        >
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
