'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle2 } from 'lucide-react'
import type { Profile, PatientProfile } from '@/lib/types'

type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
type EducationalStatus = 'none' | 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'other'
type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired' | 'homemaker' | 'other'

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
]

const EDUCATION_OPTIONS: { value: EducationalStatus; label: string }[] = [
  { value: 'none', label: 'No formal education' },
  { value: 'primary', label: 'Primary school' },
  { value: 'secondary', label: 'Secondary school' },
  { value: 'diploma', label: 'Diploma / Certificate' },
  { value: 'bachelor', label: "Bachelor's degree" },
  { value: 'master', label: "Master's degree" },
  { value: 'phd', label: 'PhD / Doctorate' },
  { value: 'other', label: 'Other' },
]

const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: 'employed', label: 'Employed (full-time / part-time)' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' },
  { value: 'homemaker', label: 'Homemaker' },
  { value: 'other', label: 'Other' },
]

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Base profile fields
  const [fullNameEn, setFullNameEn] = useState('')
  const [fullNameAr, setFullNameAr] = useState('')
  const [langPref, setLangPref] = useState<'ar' | 'en'>('en')

  // Patient profile fields
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [phone, setPhone] = useState('')
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | ''>('')
  const [educationalStatus, setEducationalStatus] = useState<EducationalStatus | ''>('')
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | ''>('')
  const [hasMedications, setHasMedications] = useState(false)
  const [medicationDetails, setMedicationDetails] = useState('')
  const [medicationDuration, setMedicationDuration] = useState('')

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
      const pat = pp as PatientProfile
      setDob(pat.date_of_birth || '')
      setGender((pat.gender as 'male' | 'female') || '')
      setPhone(pp.phone_number || '')
      setMaritalStatus(pat.marital_status || '')
      setEducationalStatus(pat.educational_status || '')
      setEmploymentStatus(pat.employment_status || '')
      setHasMedications(pat.has_psychiatric_medications || false)
      setMedicationDetails(pat.psychiatric_medication_details || '')
      setMedicationDuration(pat.psychiatric_medication_duration || '')
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
      await supabase.from('patient_profiles').upsert({
        id: user.id,
        date_of_birth: dob || null,
        gender: gender || null,
        phone_number: phone || null,
        marital_status: maritalStatus || null,
        educational_status: educationalStatus || null,
        employment_status: employmentStatus || null,
        has_psychiatric_medications: hasMedications,
        psychiatric_medication_details: hasMedications ? (medicationDetails || null) : null,
        psychiatric_medication_duration: hasMedications ? (medicationDuration || null) : null,
      })
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

      {saved && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Identity</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name (English)</label>
                <input type="text" className="input" value={fullNameEn}
                  onChange={e => setFullNameEn(e.target.value)} required />
              </div>
              <div>
                <label className="label">Full Name (Arabic)</label>
                <input type="text" className="input" value={fullNameAr}
                  onChange={e => setFullNameAr(e.target.value)} dir="rtl" placeholder="الاسم بالعربية" />
              </div>
            </div>
            <div>
              <label className="label">Language Preference</label>
              <select className="input" value={langPref} onChange={e => setLangPref(e.target.value as 'ar' | 'en')}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
        </div>

        {/* Demographics (patients only) */}
        {profile?.role === 'patient' && (
          <>
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Demographics</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date of Birth</label>
                    <input type="date" className="input" value={dob}
                      onChange={e => setDob(e.target.value)}
                      max={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select className="input" value={gender} onChange={e => setGender(e.target.value as 'male' | 'female' | '')}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" className="input" value={phone}
                    onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                </div>

                <div>
                  <label className="label">Marital Status</label>
                  <select className="input" value={maritalStatus}
                    onChange={e => setMaritalStatus(e.target.value as MaritalStatus | '')}>
                    <option value="">Select status</option>
                    {MARITAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Educational Status</label>
                  <select className="input" value={educationalStatus}
                    onChange={e => setEducationalStatus(e.target.value as EducationalStatus | '')}>
                    <option value="">Select education level</option>
                    {EDUCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Employment Status</label>
                  <select className="input" value={employmentStatus}
                    onChange={e => setEmploymentStatus(e.target.value as EmploymentStatus | '')}>
                    <option value="">Select employment status</option>
                    {EMPLOYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Psychiatric Medication History */}
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Psychiatric Medication History</h2>
              <p className="text-sm text-gray-500 mb-4">This information helps clinicians understand your background.</p>

              <div className="space-y-4">
                <div>
                  <label className="label">Have you ever taken psychiatric medications?</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasMeds"
                        checked={hasMedications === true}
                        onChange={() => setHasMedications(true)}
                        className="text-brand-600"
                      />
                      <span className="text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasMeds"
                        checked={hasMedications === false}
                        onChange={() => setHasMedications(false)}
                        className="text-brand-600"
                      />
                      <span className="text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>

                {hasMedications && (
                  <>
                    <div>
                      <label className="label">Medication name(s)</label>
                      <textarea
                        className="input resize-none"
                        rows={3}
                        value={medicationDetails}
                        onChange={e => setMedicationDetails(e.target.value)}
                        placeholder="e.g. Sertraline 50mg, Quetiapine 25mg..."
                      />
                    </div>
                    <div>
                      <label className="label">Duration of use</label>
                      <input
                        type="text"
                        className="input"
                        value={medicationDuration}
                        onChange={e => setMedicationDuration(e.target.value)}
                        placeholder="e.g. 6 months, 2 years"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Account info */}
      <div className="card p-6 mt-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Role</span>
            <span className="font-medium text-gray-900 capitalize">{profile?.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Status</span>
            <span className={`font-medium ${profile?.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {profile?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
