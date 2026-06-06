'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Save, CheckCircle2 } from 'lucide-react'
import type { Profile, PatientProfile } from '@/lib/types'

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fullNameEn, setFullNameEn] = useState('')
  const [fullNameAr, setFullNameAr] = useState('')
  const [langPref, setLangPref] = useState<'ar' | 'en'>('en')
  const [phone, setPhone] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (p) {
      setProfile(p as Profile)
      setFullNameEn(p.full_name_en || '')
      setFullNameAr(p.full_name_ar || '')
      setLangPref(p.language_preference || 'en')
    }
    const { data: pp } = await supabase.from('patient_profiles').select('*').eq('id', user.id).single()
    if (pp) {
      setPatientProfile(pp as PatientProfile)
      setPhone(pp.phone_number || '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      full_name_en: fullNameEn,
      full_name_ar: fullNameAr || null,
      language_preference: langPref,
    }).eq('id', user.id)

    if (profile?.role === 'patient') {
      await supabase.from('patient_profiles').update({
        phone_number: phone || null,
      }).eq('id', user.id)
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="p-8 text-gray-400">Loading profile...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your personal information</p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-brand-700">
              {profile?.full_name_en?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile?.full_name_en}</p>
            <p className="text-sm text-gray-400 capitalize">{profile?.role}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
            </p>
          </div>
        </div>

        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name (English)</label>
              <input
                type="text"
                className="input"
                value={fullNameEn}
                onChange={e => setFullNameEn(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Full Name (Arabic)</label>
              <input
                type="text"
                className="input"
                value={fullNameAr}
                onChange={e => setFullNameAr(e.target.value)}
                dir="rtl"
                placeholder="الاسم بالعربية"
              />
            </div>
          </div>

          <div>
            <label className="label">Language Preference</label>
            <select
              className="input"
              value={langPref}
              onChange={e => setLangPref(e.target.value as 'ar' | 'en')}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          {profile?.role === 'patient' && (
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Role</span>
            <span className="font-medium text-gray-900 capitalize">{profile?.role}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Account Status</span>
            <span className={`font-medium ${profile?.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {profile?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {profile?.role === 'patient' && patientProfile?.onboarding_completed_at && (
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Onboarding Completed</span>
              <span className="font-medium text-gray-900">
                {new Date(patientProfile.onboarding_completed_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
