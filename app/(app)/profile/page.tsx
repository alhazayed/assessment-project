'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle2, User, MapPin, BookOpen, Briefcase, Pill, Phone, Shield, AlertCircle, ClipboardList } from 'lucide-react'
import type { Profile, PatientProfile } from '@/lib/types'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import { COUNTRIES } from '@/lib/countries'

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

interface AssessmentHistory {
  id: string
  submitted_at: string
  total_score: number
  severity_band: string
  high_risk_flag: boolean
  assessment_definitions: { name_en: string; name_ar: string | null } | null
}

export default function ProfilePage() {
  const supabase = createClient()
  const lang = useLang()
  const searchParams = useSearchParams()
  const router = useRouter()
  const needsCompletion = searchParams.get('complete') === 'true'
  const nextUrl = searchParams.get('next')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistory[]>([])

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

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState<'family' | 'friend' | 'colleague' | 'other' | ''>('')

  // Privacy preferences
  const [shareMoodNotes, setShareMoodNotes] = useState(false)
  const [shareJournalDefault, setShareJournalDefault] = useState(false)

  // Consent
  const [consentGivenAt, setConsentGivenAt] = useState<string | null>(null)
  const [givingConsent, setGivingConsent] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('assessment_submissions')
        .select('id, submitted_at, total_score, severity_band, high_risk_flag, assessment_definitions(name_en, name_ar)')
        .eq('patient_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(20),
    ])

    const p = profileRes.data
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

    if (historyRes.data) {
      setAssessmentHistory(historyRes.data as unknown as AssessmentHistory[])
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
        setEmergencyName(pat.emergency_contact_name || '')
        setEmergencyPhone(pat.emergency_contact_phone || '')
        setEmergencyRelation(pat.emergency_contact_relation || '')
        setShareMoodNotes(pat.share_mood_notes ?? false)
        setShareJournalDefault(pat.share_journal_default ?? false)
        setConsentGivenAt(pat.consent_given_at)

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
    setValidationError(null)

    if (!dob || !gender || !maritalStatus || !educationalStatus || !country) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى تعبئة جميع الحقول المطلوبة: تاريخ الميلاد، الجنس، الحالة الاجتماعية، المستوى التعليمي، وبلد الإقامة.'
          : 'Please complete all required fields: Date of Birth, Gender, Marital Status, Educational Status, and Country of Residence.'
      )
      return
    }

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
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        emergency_contact_relation: emergencyRelation || null,
        share_mood_notes: shareMoodNotes,
        share_journal_default: shareJournalDefault,
      })
    }

    // Audit log — fire-and-forget
    supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'profile_updated',
      target_type: 'profile',
      target_id: user.id,
    }).then(() => {})

    setSaving(false)
    if (nextUrl) {
      router.push(nextUrl)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleGiveConsent() {
    setGivingConsent(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date().toISOString()
    await supabase.from('patient_profiles').upsert({ id: user.id, consent_given_at: now })
    setConsentGivenAt(now)
    setGivingConsent(false)
    supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'consent_given',
      target_type: 'patient_profile',
      target_id: user.id,
    }).then(() => {})
  }

  const isAr = lang === 'ar'

  if (loading) return <div className="p-8 text-gray-400">{t('mood.loading', lang)}</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title', lang)}</h1>
        <p className="text-gray-500 mt-1">{t('profile.subtitle', lang)}</p>
      </div>

      {needsCompletion && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {lang === 'ar' ? 'أكمل ملفك الشخصي أولاً' : 'Complete your profile first'}
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              {lang === 'ar'
                ? 'يرجى تعبئة الحقول المطلوبة أدناه (تاريخ الميلاد، الجنس، الحالة الاجتماعية، المستوى التعليمي، وبلد الإقامة) قبل إجراء أي تقييم.'
                : 'Please fill in the required fields below (Date of Birth, Gender, Marital Status, Educational Status, and Country of Residence) before taking an assessment.'}
            </p>
          </div>
        </div>
      )}

      {saved && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {t('profile.saved', lang)}
        </div>
      )}

      {validationError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {validationError}
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
                <label className="label">
                  {t('profile.dob', lang)} <span className="text-red-500">*</span>
                </label>
                <input type="date" className={`input ${!dob && needsCompletion ? 'border-red-400' : ''}`} value={dob}
                  onChange={e => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="label">
                  {t('profile.gender', lang)} <span className="text-red-500">*</span>
                </label>
                <select className={`input ${!gender && needsCompletion ? 'border-red-400' : ''}`} value={gender} onChange={e => setGender(e.target.value as 'male' | 'female' | '')}>
                  <option value="">{t('profile.gender.select', lang)}</option>
                  <option value="male">{t('profile.gender.male', lang)}</option>
                  <option value="female">{t('profile.gender.female', lang)}</option>
                </select>
              </div>
            </div>

            {/* Marital status */}
            <div>
              <label className="label">
                {t('profile.marital', lang)} <span className="text-red-500">*</span>
              </label>
              <select className={`input ${!maritalStatus && needsCompletion ? 'border-red-400' : ''}`} value={maritalStatus}
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
              <label className="label">
                {t('profile.education', lang)} <span className="text-red-500">*</span>
              </label>
              <select className={`input ${!educationalStatus && needsCompletion ? 'border-red-400' : ''}`} value={educationalStatus}
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
              <label className="label">
                {t('profile.country', lang)} <span className="text-red-500">*</span>
              </label>
              <select className={`input ${!country && needsCompletion ? 'border-red-400' : ''}`} value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">{t('profile.country.ph', lang)}</option>
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value}>{lang === 'ar' ? c.ar : c.en}</option>
                ))}
              </select>
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
            {/* Emergency contact */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Phone className="w-4 h-4 text-brand-500" />
                <h2 className="text-base font-semibold text-gray-900">{t('profile.emergency.title', lang)}</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('profile.emergency.name', lang)}</label>
                    <input type="text" className="input" value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      placeholder={t('profile.emergency.name.ph', lang)} />
                  </div>
                  <div>
                    <label className="label">{t('profile.emergency.phone', lang)}</label>
                    <input type="tel" className="input" value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      placeholder="+1 234 567 8900" />
                  </div>
                </div>
                <div>
                  <label className="label">{t('profile.emergency.relation', lang)}</label>
                  <select className="input" value={emergencyRelation}
                    onChange={e => setEmergencyRelation(e.target.value as typeof emergencyRelation)}>
                    <option value="">{t('profile.emergency.relation.select', lang)}</option>
                    <option value="family">{t('profile.emergency.relation.family', lang)}</option>
                    <option value="friend">{t('profile.emergency.relation.friend', lang)}</option>
                    <option value="colleague">{t('profile.emergency.relation.colleague', lang)}</option>
                    <option value="other">{t('profile.emergency.relation.other', lang)}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy preferences */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Shield className="w-4 h-4 text-brand-500" />
                <h2 className="text-base font-semibold text-gray-900">{t('profile.privacy.title', lang)}</h2>
              </div>
              <div className="space-y-4">
                {[
                  { label: t('profile.privacy.share_mood', lang), checked: shareMoodNotes, onChange: setShareMoodNotes },
                  { label: t('profile.privacy.share_journal', lang), checked: shareJournalDefault, onChange: setShareJournalDefault },
                ].map(item => (
                  <label key={item.label} className="flex items-start gap-3 cursor-pointer group">
                    <div className="flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={e => item.onChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.label}</span>
                  </label>
                ))}
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

      {/* Consent — patient only, outside the form */}
      {profile?.role === 'patient' && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-brand-500" />
            <h2 className="text-base font-semibold text-gray-900">{t('profile.consent.title', lang)}</h2>
          </div>
          {consentGivenAt ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {t('profile.consent.given_on', lang)}{' '}
              {new Date(consentGivenAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{t('profile.consent.text', lang)}</p>
              <button
                type="button"
                onClick={handleGiveConsent}
                disabled={givingConsent}
                className="btn-primary gap-2 disabled:opacity-40"
              >
                <Shield className="w-4 h-4" />
                {givingConsent ? '...' : t('profile.consent.confirm', lang)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assessment history */}
      {assessmentHistory.length > 0 && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-brand-500" />
            <h2 className="text-base font-semibold text-gray-900">
              {lang === 'ar' ? 'سجل التقييمات' : 'Assessment History'}
            </h2>
          </div>
          <div className="space-y-2">
            {assessmentHistory.map(sub => {
              const name = lang === 'ar' && sub.assessment_definitions?.name_ar
                ? sub.assessment_definitions.name_ar
                : sub.assessment_definitions?.name_en ?? '—'
              const date = new Date(sub.submitted_at).toLocaleDateString(
                isAr ? 'ar-SA' : 'en-GB',
                { year: 'numeric', month: 'short', day: 'numeric' }
              )
              return (
                <div key={sub.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-sm font-bold text-gray-700">{sub.total_score}</span>
                    {sub.severity_band && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {sub.severity_band}
                      </span>
                    )}
                    {sub.high_risk_flag && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                        {lang === 'ar' ? 'خطورة عالية' : 'High Risk'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
              <span className="font-medium text-gray-900">
                {COUNTRIES.find(c => c.value === profile.country_of_residence)?.[lang === 'ar' ? 'ar' : 'en'] ?? profile.country_of_residence}
              </span>
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
