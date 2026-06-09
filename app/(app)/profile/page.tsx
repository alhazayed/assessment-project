'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle2, User, MapPin, BookOpen, Briefcase, Pill } from 'lucide-react'
import type { Profile, PatientProfile } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'

type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
type EducationalStatus = 'none' | 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'other'
type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired' | 'homemaker' | 'other'

const MARITAL_OPTIONS: { value: MaritalStatus; enLabel: string; arLabel: string }[] = [
  { value: 'single',   enLabel: 'Single',   arLabel: 'أعزب / عزباء' },
  { value: 'married',  enLabel: 'Married',  arLabel: 'متزوج / متزوجة' },
  { value: 'divorced', enLabel: 'Divorced', arLabel: 'مطلق / مطلقة' },
  { value: 'widowed',  enLabel: 'Widowed',  arLabel: 'أرمل / أرملة' },
]

const EDUCATION_OPTIONS: { value: EducationalStatus; enLabel: string; arLabel: string }[] = [
  { value: 'none',      enLabel: 'No formal education',    arLabel: 'بدون تعليم رسمي' },
  { value: 'primary',   enLabel: 'Primary school',         arLabel: 'المرحلة الابتدائية' },
  { value: 'secondary', enLabel: 'Secondary school',       arLabel: 'المرحلة الثانوية' },
  { value: 'diploma',   enLabel: 'Diploma / Certificate',  arLabel: 'دبلوم / شهادة' },
  { value: 'bachelor',  enLabel: "Bachelor's degree",      arLabel: 'بكالوريوس' },
  { value: 'master',    enLabel: "Master's degree",        arLabel: 'ماجستير' },
  { value: 'phd',       enLabel: 'PhD / Doctorate',        arLabel: 'دكتوراه' },
  { value: 'other',     enLabel: 'Other',                  arLabel: 'أخرى' },
]

const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; enLabel: string; arLabel: string }[] = [
  { value: 'employed',     enLabel: 'Employed (full-time / part-time)', arLabel: 'موظف (دوام كامل / جزئي)' },
  { value: 'self_employed',enLabel: 'Self-employed',                    arLabel: 'عمل حر' },
  { value: 'unemployed',   enLabel: 'Unemployed',                       arLabel: 'غير موظف' },
  { value: 'student',      enLabel: 'Student',                          arLabel: 'طالب / طالبة' },
  { value: 'retired',      enLabel: 'Retired',                          arLabel: 'متقاعد / متقاعدة' },
  { value: 'homemaker',    enLabel: 'Homemaker',                        arLabel: 'ربّ/ربة منزل' },
  { value: 'other',        enLabel: 'Other',                            arLabel: 'أخرى' },
]

export default function ProfilePage() {
  const supabase = createClient()
  const lang = useLang()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Identity
  const [fullNameEn, setFullNameEn] = useState('')
  const [fullNameAr, setFullNameAr] = useState('')
  const [langPref, setLangPref] = useState<'ar' | 'en'>('en')

  // Demographics (stored in profiles table — all roles)
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | ''>('')
  const [educationalStatus, setEducationalStatus] = useState<EducationalStatus | ''>('')
  const [country, setCountry] = useState('')

  // Extended (patients only — stored in patient_profiles)
  const [phone, setPhone] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | ''>('')
  const [hasMedications, setHasMedications] = useState(false)
  const [medicationDetails, setMedicationDetails] = useState('')
  const [medicationDuration, setMedicationDuration] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (p) {
      const prof = p as Profile
      setProfile(prof)
      setFullNameEn(prof.full_name_en || '')
      setFullNameAr(prof.full_name_ar || '')
      setLangPref(prof.language_preference || 'en')
      setDob(prof.date_of_birth || '')
      setGender((prof.gender as 'male' | 'female') || '')
      setMaritalStatus(prof.marital_status || '')
      setEducationalStatus(prof.educational_status || '')
      setCountry(prof.country_of_residence || '')
    }

    if (p?.role === 'patient') {
      const { data: pp } = await supabase.from('patient_profiles').select('*').eq('id', user.id).single()
      if (pp) {
        const pat = pp as PatientProfile
        setPhone(pat.phone_number || '')
        setEmploymentStatus(pat.employment_status || '')
        setHasMedications(pat.has_psychiatric_medications || false)
        setMedicationDetails(pat.psychiatric_medication_details || '')
        setMedicationDuration(pat.psychiatric_medication_duration || '')

        // Back-fill demographics from patient_profiles if profiles columns are empty
        if (!dob && pat.date_of_birth) setDob(pat.date_of_birth)
        if (!gender && pat.gender) setGender(pat.gender)
        if (!maritalStatus && pat.marital_status) setMaritalStatus(pat.marital_status)
        if (!educationalStatus && pat.educational_status) setEducationalStatus(pat.educational_status)
      }
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
      date_of_birth: dob || null,
      gender: gender || null,
      marital_status: maritalStatus || null,
      educational_status: educationalStatus || null,
      country_of_residence: country || null,
    }).eq('id', user.id)

    if (profile?.role === 'patient') {
      await supabase.from('patient_profiles').upsert({
        id: user.id,
        phone_number: phone || null,
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

  const isAr = lang === 'ar'

  if (loading) return <div className="p-8 text-gray-400">{t('mood.loading', lang)}</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title', lang)}</h1>
        <p className="text-gray-500 mt-1">{t('profile.subtitle', lang)}</p>
      </div>

      {saved && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {t('profile.saved', lang)}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* Identity */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-brand-500" />
            <h2 className="text-base font-semibold text-gray-900">{t('profile.identity.title', lang)}</h2>
          </div>
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

        {/* Demographics — all roles */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-4 h-4 text-brand-500" />
            <h2 className="text-base font-semibold text-gray-900">{t('profile.demographics.title', lang)}</h2>
          </div>
          <div className="space-y-4">
            {/* DOB + Gender */}
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

            {/* Marital status */}
            <div>
              <label className="label">{t('profile.marital', lang)}</label>
              <select className="input" value={maritalStatus}
                onChange={e => setMaritalStatus(e.target.value as MaritalStatus | '')}>
                <option value="">{t('profile.marital.select', lang)}</option>
                {MARITAL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {isAr ? o.arLabel : o.enLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Educational status */}
            <div>
              <label className="label">{t('profile.education', lang)}</label>
              <select className="input" value={educationalStatus}
                onChange={e => setEducationalStatus(e.target.value as EducationalStatus | '')}>
                <option value="">{t('profile.education.select', lang)}</option>
                {EDUCATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {isAr ? o.arLabel : o.enLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Country of residence */}
            <div>
              <label className="label">{t('profile.country', lang)}</label>
              <input type="text" className="input" value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder={t('profile.country.ph', lang)} />
            </div>
          </div>
        </div>

        {/* Patient-only extended section */}
        {profile?.role === 'patient' && (
          <>
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Briefcase className="w-4 h-4 text-brand-500" />
                <h2 className="text-base font-semibold text-gray-900">{t('profile.employment', lang)}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">{t('profile.phone', lang)}</label>
                  <input type="tel" className="input" value={phone}
                    onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                </div>
                <div>
                  <label className="label">{t('profile.employment', lang)}</label>
                  <select className="input" value={employmentStatus}
                    onChange={e => setEmploymentStatus(e.target.value as EmploymentStatus | '')}>
                    <option value="">{t('profile.employment.select', lang)}</option>
                    {EMPLOYMENT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {isAr ? o.arLabel : o.enLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Pill className="w-4 h-4 text-brand-500" />
                <h2 className="text-base font-semibold text-gray-900">{t('profile.meds.title', lang)}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5 ml-6">{t('profile.meds.subtitle', lang)}</p>
              <div className="space-y-4">
                <div>
                  <label className="label">{t('profile.meds.question', lang)}</label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="hasMeds" checked={hasMedications === true}
                        onChange={() => setHasMedications(true)} className="text-brand-600" />
                      <span className="text-sm text-gray-700">{t('profile.meds.yes', lang)}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="hasMeds" checked={hasMedications === false}
                        onChange={() => setHasMedications(false)} className="text-brand-600" />
                      <span className="text-sm text-gray-700">{t('profile.meds.no', lang)}</span>
                    </label>
                  </div>
                </div>
                {hasMedications && (
                  <>
                    <div>
                      <label className="label">{t('profile.meds.names', lang)}</label>
                      <textarea className="input resize-none" rows={3}
                        value={medicationDetails} onChange={e => setMedicationDetails(e.target.value)}
                        placeholder={t('profile.meds.names.ph', lang)} />
                    </div>
                    <div>
                      <label className="label">{t('profile.meds.duration', lang)}</label>
                      <input type="text" className="input" value={medicationDuration}
                        onChange={e => setMedicationDuration(e.target.value)}
                        placeholder={t('profile.meds.duration.ph', lang)} />
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

      {/* Account info */}
      <div className="card p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-brand-500" />
          <h2 className="text-base font-semibold text-gray-900">{t('profile.account.title', lang)}</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">{t('profile.account.role', lang)}</span>
            <span className="font-medium text-gray-900 capitalize">{profile?.role}</span>
          </div>
          {profile?.date_of_birth && (
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">{t('profile.dob', lang)}</span>
              <span className="font-medium text-gray-900">
                {new Date(profile.date_of_birth).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          )}
          {profile?.country_of_residence && (
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">{t('profile.country', lang)}</span>
              <span className="font-medium text-gray-900">{profile.country_of_residence}</span>
            </div>
          )}
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
