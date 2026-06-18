'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useLang } from '@/lib/use-lang'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/language-toggle'
import { COUNTRIES } from '@/lib/countries'

type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
type EducationalStatus = 'none' | 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'other'
type EmploymentStatus = 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired' | 'homemaker' | 'other'
type EmergencyRelation = 'family' | 'friend' | 'colleague' | 'other'

const TOTAL_STEPS = 3

export default function OnboardingPage() {
  const router = useRouter()
  const lang = useLang()
  const isAr = lang === 'ar'

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — Identity
  const [nameAr, setNameAr] = useState('')
  const [langPref, setLangPref] = useState<'en' | 'ar'>(lang)
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')

  // Step 2 — Background
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | ''>('')
  const [educationalStatus, setEducationalStatus] = useState<EducationalStatus | ''>('')
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | ''>('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')

  // Step 3 — Health & Safety
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState<EmergencyRelation | ''>('')
  const [hasMedications, setHasMedications] = useState<boolean | null>(null)
  const [medicationDetails, setMedicationDetails] = useState('')
  const [medicationDuration, setMedicationDuration] = useState('')
  const [consent, setConsent] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleFinish() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [profileRes, patientRes] = await Promise.all([
        supabase.from('profiles').update({
          full_name_ar: nameAr || null,
          language_preference: langPref,
          date_of_birth: dob || null,
          gender: gender || null,
          marital_status: maritalStatus || null,
          educational_status: educationalStatus || null,
          country_of_residence: country || null,
        }).eq('id', user.id),
        supabase.from('patient_profiles').upsert({
          id: user.id,
          phone_number: phone || null,
          employment_status: employmentStatus || null,
          emergency_contact_name: emergencyName || null,
          emergency_contact_phone: emergencyPhone || null,
          emergency_contact_relation: emergencyRelation || null,
          has_psychiatric_medications: hasMedications ?? false,
          psychiatric_medication_details: hasMedications ? medicationDetails || null : null,
          psychiatric_medication_duration: hasMedications ? medicationDuration || null : null,
          share_mood_notes: false,
          share_journal_default: false,
          consent_given_at: consent ? new Date().toISOString() : null,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: TOTAL_STEPS,
        }),
      ])

      if (profileRes.error || patientRes.error) throw new Error('Save failed')
      router.push('/dashboard')
    } catch {
      setError(t('onboarding.error', lang))
      setSaving(false)
    }
  }

  const stepTitles = [
    { title: t('onboarding.step1.title', lang), sub: t('onboarding.step1.sub', lang) },
    { title: t('onboarding.step2.title', lang), sub: t('onboarding.step2.sub', lang) },
    { title: t('onboarding.step3.title', lang), sub: t('onboarding.step3.sub', lang) },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--page-bg)' }}>

      {/* Header */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--vw-blue)' }}>
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('app.name', lang)}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} />
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[12px] hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('nav.signout', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg card overflow-hidden">

        {/* Progress bar */}
        <div className="progress-track rounded-none h-1.5">
          <div
            className="progress-fill transition-all duration-500 h-1.5"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: 'var(--vw-blue)' }}
          />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={i + 1 <= step
                    ? { backgroundColor: 'var(--vw-blue)', width: '24px' }
                    : { backgroundColor: 'var(--surface-alt)', width: '12px' }
                  }
                />
              ))}
            </div>
            <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {t('onboarding.step', lang)} {step} {t('onboarding.of', lang)} {TOTAL_STEPS}
            </span>
          </div>

          {/* Title */}
          <div className="mb-7">
            <h1 className="text-[19px] font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stepTitles[step - 1].title}</h1>
            <p className="text-[13.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>{stepTitles[step - 1].sub}</p>
          </div>

          {/* ── Step 1: Identity ──────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="label">{t('profile.lang', lang)}</label>
                <select className="input" value={langPref} onChange={e => setLangPref(e.target.value as 'en' | 'ar')}>
                  <option value="en">{t('profile.lang.en', lang)}</option>
                  <option value="ar">{t('profile.lang.ar', lang)}</option>
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  {t('onboarding.name_ar', lang)}
                  <span className="text-xs text-gray-400 font-normal">({t('onboarding.optional', lang)})</span>
                </label>
                <input
                  type="text"
                  className="input"
                  dir="rtl"
                  value={nameAr}
                  onChange={e => setNameAr(e.target.value)}
                  placeholder={t('onboarding.name_ar.ph', lang)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('profile.dob', lang)}</label>
                  <input
                    type="date"
                    className="input"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
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
            </div>
          )}

          {/* ── Step 2: Background ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('profile.marital', lang)}</label>
                  <select className="input" value={maritalStatus} onChange={e => setMaritalStatus(e.target.value as MaritalStatus | '')}>
                    <option value="">{t('profile.marital.select', lang)}</option>
                    <option value="single">{t('profile.marital.single', lang)}</option>
                    <option value="married">{t('profile.marital.married', lang)}</option>
                    <option value="divorced">{t('profile.marital.divorced', lang)}</option>
                    <option value="widowed">{t('profile.marital.widowed', lang)}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('profile.employment', lang)}</label>
                  <select className="input" value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value as EmploymentStatus | '')}>
                    <option value="">{t('profile.employment.select', lang)}</option>
                    <option value="employed">{t('profile.employment.employed', lang)}</option>
                    <option value="self_employed">{t('profile.employment.self', lang)}</option>
                    <option value="unemployed">{t('profile.employment.unemployed', lang)}</option>
                    <option value="student">{t('profile.employment.student', lang)}</option>
                    <option value="retired">{t('profile.employment.retired', lang)}</option>
                    <option value="homemaker">{t('profile.employment.homemaker', lang)}</option>
                    <option value="other">{t('profile.employment.other', lang)}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">{t('profile.education', lang)}</label>
                <select className="input" value={educationalStatus} onChange={e => setEducationalStatus(e.target.value as EducationalStatus | '')}>
                  <option value="">{t('profile.education.select', lang)}</option>
                  <option value="none">{t('profile.education.none', lang)}</option>
                  <option value="primary">{t('profile.education.primary', lang)}</option>
                  <option value="secondary">{t('profile.education.secondary', lang)}</option>
                  <option value="diploma">{t('profile.education.diploma', lang)}</option>
                  <option value="bachelor">{t('profile.education.bachelor', lang)}</option>
                  <option value="master">{t('profile.education.master', lang)}</option>
                  <option value="phd">{t('profile.education.phd', lang)}</option>
                  <option value="other">{t('profile.education.other', lang)}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('profile.country', lang)}</label>
                  <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="">{t('profile.country.ph', lang)}</option>
                    {COUNTRIES.map(c => (
                      <option key={c.value} value={c.value}>{lang === 'ar' ? c.ar : c.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t('profile.phone', lang)}</label>
                  <input
                    type="tel"
                    className="input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+966 5x xxx xxxx"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Health & Safety ──────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Emergency contact */}
              <div>
                <p className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('profile.emergency.title', lang)}</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">{t('profile.emergency.name', lang)}</label>
                      <input type="text" className="input" value={emergencyName}
                        onChange={e => setEmergencyName(e.target.value)}
                        placeholder={t('profile.emergency.name.ph', lang)} />
                    </div>
                    <div>
                      <label className="label text-xs">{t('profile.emergency.phone', lang)}</label>
                      <input type="tel" className="input" value={emergencyPhone}
                        onChange={e => setEmergencyPhone(e.target.value)} placeholder="+966 5x xxx xxxx" />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">{t('profile.emergency.relation', lang)}</label>
                    <select className="input" value={emergencyRelation}
                      onChange={e => setEmergencyRelation(e.target.value as EmergencyRelation | '')}>
                      <option value="">{t('profile.emergency.relation.select', lang)}</option>
                      <option value="family">{t('profile.emergency.relation.family', lang)}</option>
                      <option value="friend">{t('profile.emergency.relation.friend', lang)}</option>
                      <option value="colleague">{t('profile.emergency.relation.colleague', lang)}</option>
                      <option value="other">{t('profile.emergency.relation.other', lang)}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Psychiatric medications */}
              <div>
                <p className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('profile.meds.title', lang)}</p>
                <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>{t('profile.meds.subtitle', lang)}</p>
                <div className="flex gap-4">
                  {[true, false].map(val => (
                    <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="hasMeds" checked={hasMedications === val}
                        onChange={() => setHasMedications(val)} className="text-brand-600" />
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {val ? t('profile.meds.yes', lang) : t('profile.meds.no', lang)}
                      </span>
                    </label>
                  ))}
                </div>
                {hasMedications && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="label text-xs">{t('profile.meds.names', lang)}</label>
                      <textarea className="input resize-none" rows={2} value={medicationDetails}
                        onChange={e => setMedicationDetails(e.target.value)}
                        placeholder={t('profile.meds.names.ph', lang)} />
                    </div>
                    <div>
                      <label className="label text-xs">{t('profile.meds.duration', lang)}</label>
                      <input type="text" className="input" value={medicationDuration}
                        onChange={e => setMedicationDuration(e.target.value)}
                        placeholder={t('profile.meds.duration.ph', lang)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Consent */}
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-[12px] transition-colors"
                style={{ border: '1px solid var(--border)' }}>
                <div
                  className="mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors"
                  style={consent
                    ? { backgroundColor: 'var(--vw-blue)', borderColor: 'var(--vw-blue)' }
                    : { borderColor: 'var(--border)' }
                  }
                  onClick={() => setConsent(!consent)}>
                  {consent && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('profile.consent.text', lang)}
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="mt-6 alert-error">{error}</div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid var(--divider)' }}>
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="btn-secondary gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('onboarding.back', lang)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="text-[13px] hover:underline transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('onboarding.skip', lang)}
                </button>
              )}
            </div>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="btn-primary gap-2"
              >
                {t('onboarding.next', lang)}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="btn-primary gap-2 disabled:opacity-50"
              >
                {saving ? t('onboarding.finishing', lang) : t('onboarding.finish', lang)}
                {!saving && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
