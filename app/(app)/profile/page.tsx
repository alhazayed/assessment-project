'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle2 } from 'lucide-react'
import type { Profile, PatientProfile } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
type EducationalStatus = 'none' | 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'other'
type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired' | 'homemaker' | 'other'

export default function ProfilePage() {
  const supabase = createClient()
  const lang = useLang()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [fullNameEn, setFullNameEn] = useState('')
  const [fullNameAr, setFullNameAr] = useState('')
  const [langPref, setLangPref] = useState<'ar' | 'en'>('en')

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

  const MARITAL_OPTIONS: { value: MaritalStatus; key: `profile.marital.${string}` }[] = [
    { value: 'single', key: 'profile.marital.single' },
    { value: 'married', key: 'profile.marital.married' },
    { value: 'divorced', key: 'profile.marital.divorced' },
    { value: 'widowed', key: 'profile.marital.widowed' },
  ]

  const EDUCATION_OPTIONS: { value: EducationalStatus; key: `profile.education.${string}` }[] = [
    { value: 'none', key: 'profile.education.none' },
    { value: 'primary', key: 'profile.education.primary' },
    { value: 'secondary', key: 'profile.education.secondary' },
    { value: 'diploma', key: 'profile.education.diploma' },
    { value: 'bachelor', key: 'profile.education.bachelor' },
    { value: 'master', key: 'profile.education.master' },
    { value: 'phd', key: 'profile.education.phd' },
    { value: 'other', key: 'profile.education.other' },
  ]

  const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; key: `profile.employment.${string}` }[] = [
    { value: 'employed', key: 'profile.employment.employed' },
    { value: 'self_employed', key: 'profile.employment.self' },
    { value: 'unemployed', key: 'profile.employment.unemployed' },
    { value: 'student', key: 'profile.employment.student' },
    { value: 'retired', key: 'profile.employment.retired' },
    { value: 'homemaker', key: 'profile.employment.homemaker' },
    { value: 'other', key: 'profile.employment.other' },
  ]

  if (loading) return <div className="p-8 text-gray-400">{t('mood.loading', lang)}</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title', lang)}</h1>
        <p className="text-gray-500 mt-1">{t('profile.subtitle', lang)}</p>
      </div>

      {saved && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          {t('profile.saved', lang)}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('profile.identity.title', lang)}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('profile.name_en', lang)}</label>
                <input type="text" className="input" value={fullNameEn}
                  onChange={e => setFullNameEn(e.target.value)} required />
              </div>
              <div>
                <label className="label">{t('profile.name_ar', lang)}</label>
                <input type="text" className="input" value={fullNameAr}
                  onChange={e => setFullNameAr(e.target.value)} dir="rtl" placeholder="الاسم بالعربية" />
              </div>
            </div>
            <div>
              <label className="label">{t('profile.lang', lang)}</label>
              <select className="input" value={langPref} onChange={e => setLangPref(e.target.value as 'ar' | 'en')}>
                <option value="en">{t('profile.lang.en', lang)}</option>
                <option value="ar">{t('profile.lang.ar', lang)}</option>
              </select>
            </div>
          </div>
        </div>

        {profile?.role === 'patient' && (
          <>
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">{t('profile.demographics.title', lang)}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('profile.dob', lang)}</label>
                    <input type="date" className="input" value={dob}
                      onChange={e => setDob(e.target.value)}
                      max={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="label">{t('profile.gender', lang)}</label>
                    <select className="input" value={gender} onChange={e => setGender(e.target.value as 'male' | 'female' | '')}>
                      <option value="">{t('profile.gender.select', lang)}</option>
                      <option value="male">{t('profile.gender.male', lang)}</option>
                      <option value="female">{t('profile.gender.female', lang)}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{t('profile.phone', lang)}</label>
                  <input type="tel" className="input" value={phone}
                    onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                </div>

                <div>
                  <label className="label">{t('profile.marital', lang)}</label>
                  <select className="input" value={maritalStatus}
                    onChange={e => setMaritalStatus(e.target.value as MaritalStatus | '')}>
                    <option value="">{t('profile.marital.select', lang)}</option>
                    {MARITAL_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{t(o.key as any, lang)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{t('profile.education', lang)}</label>
                  <select className="input" value={educationalStatus}
                    onChange={e => setEducationalStatus(e.target.value as EducationalStatus | '')}>
                    <option value="">{t('profile.education.select', lang)}</option>
                    {EDUCATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{t(o.key as any, lang)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{t('profile.employment', lang)}</label>
                  <select className="input" value={employmentStatus}
                    onChange={e => setEmploymentStatus(e.target.value as EmploymentStatus | '')}>
                    <option value="">{t('profile.employment.select', lang)}</option>
                    {EMPLOYMENT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{t(o.key as any, lang)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">{t('profile.meds.title', lang)}</h2>
              <p className="text-sm text-gray-500 mb-4">{t('profile.meds.subtitle', lang)}</p>

              <div className="space-y-4">
                <div>
                  <label className="label">{t('profile.meds.question', lang)}</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasMeds"
                        checked={hasMedications === true}
                        onChange={() => setHasMedications(true)}
                        className="text-brand-600"
                      />
                      <span className="text-sm text-gray-700">{t('profile.meds.yes', lang)}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasMeds"
                        checked={hasMedications === false}
                        onChange={() => setHasMedications(false)}
                        className="text-brand-600"
                      />
                      <span className="text-sm text-gray-700">{t('profile.meds.no', lang)}</span>
                    </label>
                  </div>
                </div>

                {hasMedications && (
                  <>
                    <div>
                      <label className="label">{t('profile.meds.names', lang)}</label>
                      <textarea
                        className="input resize-none"
                        rows={3}
                        value={medicationDetails}
                        onChange={e => setMedicationDetails(e.target.value)}
                        placeholder={t('profile.meds.names.ph', lang)}
                      />
                    </div>
                    <div>
                      <label className="label">{t('profile.meds.duration', lang)}</label>
                      <input
                        type="text"
                        className="input"
                        value={medicationDuration}
                        onChange={e => setMedicationDuration(e.target.value)}
                        placeholder={t('profile.meds.duration.ph', lang)}
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
            {saving ? t('profile.saving', lang) : t('profile.save', lang)}
          </button>
        </div>
      </form>

      <div className="card p-6 mt-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('profile.account.title', lang)}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">{t('profile.account.role', lang)}</span>
            <span className="font-medium text-gray-900 capitalize">{profile?.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">{t('profile.account.status', lang)}</span>
            <span className={`font-medium ${profile?.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {profile?.is_active ? t('profile.account.active', lang) : t('profile.account.inactive', lang)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
