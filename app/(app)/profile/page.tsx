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
  const [saveError, setSaveError] = useState<string | null>(null)
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
  const [hasMedications, setHasMedications] = useState<boolean | null>(null)
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
        setHasMedications(pat.has_psychiatric_medications ?? null)
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
    setSaveError(null)

    const isPatient = profile?.role === 'patient'
    if (
      !dob || !gender || !maritalStatus || !educationalStatus || !country ||
      (isPatient && !employmentStatus) ||
      (isPatient && hasMedications === null)
    ) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى تعبئة جميع الحقول المطلوبة: تاريخ الميلاد، الجنس، الحالة الاجتماعية، المستوى التعليمي، بلد الإقامة، الحالة الوظيفية، وحالة الأدوية النفسية.'
          : 'Please complete all required fields: Date of Birth, Gender, Marital Status, Educational Status, Country of Residence, Employment Status, and Medication Status.'
      )
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error: profileError } = await supabase.from('profiles').update({
        full_name_en: fullNameEn,
        full_name_ar: fullNameAr || null,
        language_preference: langPref,
        date_of_birth: dob || null,
        gender: gender || null,
        marital_status: maritalStatus || null,
        educational_status: educationalStatus || null,
        country_of_residence: country || null,
      }).eq('id', user.id)

      if (profileError) throw profileError

      if (profile?.role === 'patient') {
        const { error: patientError } = await supabase.from('patient_profiles').upsert({
          id: user.id,
          phone_number: phone || null,
          employment_status: employmentStatus || null,
          has_psychiatric_medications: hasMedications ?? false,
          psychiatric_medication_details: hasMedications ? (medicationDetails || null) : null,
          psychiatric_medication_duration: hasMedications ? (medicationDuration || null) : null,
          emergency_contact_name: emergencyName || null,
          emergency_contact_phone: emergencyPhone || null,
          emergency_contact_relation: emergencyRelation || null,
          share_mood_notes: shareMoodNotes,
          share_journal_default: shareJournalDefault,
        })
        if (patientError) throw patientError
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
    } catch {
      setSaveError(
        lang === 'ar'
          ? 'تعذّر حفظ البيانات. يرجى المحاولة مرة أخرى.'
          : 'Failed to save. Please try again.'
      )
      setSaving(false)
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

  if (loading) return <div className="p-7" style={{ color: 'var(--text-muted)' }}>{t('mood.loading', lang)}</div>

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-2xl">
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          {t('profile.title', lang)}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('profile.subtitle', lang)}</p>
      </div>

      {needsCompletion && (
        <div className="alert-warning mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B07A12' }} />
          <div>
            <p className="text-[13.5px] font-bold mb-0.5" style={{ color: '#B07A12' }}>
              {lang === 'ar' ? 'أكمل ملفك الشخصي أولاً' : 'Complete your profile first'}
            </p>
            <p className="text-[13px]" style={{ color: '#B07A12', opacity: 0.85 }}>
              {lang === 'ar'
                ? 'يرجى تعبئة جميع الحقول المطلوبة (المحددة بإطار أحمر) قبل إجراء أي تقييم: تاريخ الميلاد، الجنس، الحالة الاجتماعية، المستوى التعليمي، بلد الإقامة، الحالة الوظيفية، وحالة الأدوية النفسية.'
                : 'Please fill in all required fields (highlighted in red) before taking an assessment: Date of Birth, Gender, Marital Status, Educational Status, Country of Residence, Employment Status, and Medication Status.'}
            </p>
          </div>
        </div>
      )}

      {saved && (
        <div className="alert-success mb-6 flex items-center gap-2 text-[13.5px]" style={{ color: '#1B8A5A' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {t('profile.saved', lang)}
        </div>
      )}

      {saveError && (
        <div className="alert-error mb-6 flex items-center gap-2 text-[13.5px]" style={{ color: '#C02A2A' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {validationError && (
        <div className="alert-error mb-6 flex items-center gap-2 text-[13.5px]" style={{ color: '#C02A2A' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {validationError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* Identity */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4" style={{ color: '#1D6296' }} />
            <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.identity.title', lang)}</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  {t('profile.name_en', lang)}
                  <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({lang === 'ar' ? 'اختياري' : 'optional'})</span>
                </label>
                <input type="text" className="input" value={fullNameEn}
                  onChange={e => setFullNameEn(e.target.value)} />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  {t('profile.name_ar', lang)}
                  <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({lang === 'ar' ? 'اختياري' : 'optional'})</span>
                </label>
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
            <MapPin className="w-4 h-4" style={{ color: '#1D6296' }} />
            <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.demographics.title', lang)}</h2>
          </div>
          <div className="space-y-4">
            {/* DOB + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Briefcase className="w-4 h-4" style={{ color: '#1D6296' }} />
                <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.employment', lang)}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">{t('profile.phone', lang)}</label>
                  <input type="tel" className="input" value={phone}
                    onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                </div>
                <div>
                  <label className="label">{t('profile.employment', lang)}</label>
                  <select className={`input ${!employmentStatus && needsCompletion ? 'border-red-400' : ''}`} value={employmentStatus}
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
                <Pill className="w-4 h-4" style={{ color: '#1D6296' }} />
                <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.meds.title', lang)}</h2>
              </div>
              <p className="text-[13px] mb-5 ms-6" style={{ color: 'var(--text-secondary)' }}>{t('profile.meds.subtitle', lang)}</p>
              <div className="space-y-4">
                <div>
                  <label className="label">{t('profile.meds.question', lang)}</label>
                  <select
                    className={`input mt-1 ${hasMedications === null && needsCompletion ? 'border-red-400' : ''}`}
                    value={hasMedications === null ? '' : hasMedications ? 'yes' : 'no'}
                    onChange={e => {
                      if (e.target.value === '') setHasMedications(null)
                      else setHasMedications(e.target.value === 'yes')
                    }}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                    <option value="yes">{t('profile.meds.yes', lang)}</option>
                    <option value="no">{t('profile.meds.no', lang)}</option>
                  </select>
                </div>
                {hasMedications === true && (
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
                <Phone className="w-4 h-4" style={{ color: '#1D6296' }} />
                <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.emergency.title', lang)}</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Shield className="w-4 h-4" style={{ color: '#1D6296' }} />
                <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.privacy.title', lang)}</h2>
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
                    <span className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-accent gap-2">
            <Save className="w-4 h-4" />
            {saving ? t('profile.saving', lang) : t('profile.save', lang)}
          </button>
        </div>
      </form>

      {/* Consent — patient only, outside the form */}
      {profile?.role === 'patient' && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" style={{ color: '#1D6296' }} />
            <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.consent.title', lang)}</h2>
          </div>
          {consentGivenAt ? (
            <div className="alert-success flex items-center gap-2 text-[13.5px]" style={{ color: '#1B8A5A' }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {t('profile.consent.given_on', lang)}{' '}
              {new Date(consentGivenAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('profile.consent.text', lang)}</p>
              <button
                type="button"
                onClick={handleGiveConsent}
                disabled={givingConsent}
                className="btn-accent gap-2 disabled:opacity-40"
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
            <ClipboardList className="w-4 h-4" style={{ color: '#1D6296' }} />
            <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
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
                <div key={sub.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{date}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ms-4">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--text-secondary)' }}>{sub.total_score}</span>
                    {sub.severity_band && (
                      <span className="badge-neutral">{sub.severity_band}</span>
                    )}
                    {sub.high_risk_flag && (
                      <span className="badge-severe">{lang === 'ar' ? 'خطورة عالية' : 'High Risk'}</span>
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
          <BookOpen className="w-4 h-4" style={{ color: '#1D6296' }} />
          <h2 className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{t('profile.account.title', lang)}</h2>
        </div>
        <div className="space-y-0 text-[13.5px]">
          {[
            { label: t('profile.account.role', lang), value: <span className="capitalize">{profile?.role}</span> },
            profile?.date_of_birth ? { label: t('profile.dob', lang), value: new Date(profile.date_of_birth).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) } : null,
            profile?.country_of_residence ? { label: t('profile.country', lang), value: COUNTRIES.find(c => c.value === profile.country_of_residence)?.[lang === 'ar' ? 'ar' : 'en'] ?? profile.country_of_residence } : null,
            { label: t('profile.account.status', lang), value: <span style={{ color: profile?.is_active ? '#1B8A5A' : '#C02A2A' }}>{profile?.is_active ? t('profile.account.active', lang) : t('profile.account.inactive', lang)}</span> },
          ].filter(Boolean).map((item, i, arr) => item && (
            <div key={i} className="flex justify-between py-3" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--divider)' : 'none' }}>
              <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
