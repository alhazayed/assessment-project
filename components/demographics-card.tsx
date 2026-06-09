'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User, CheckCircle2, X, UserPlus } from 'lucide-react'
import { t } from '@/lib/i18n'

const MARITAL_OPTIONS = [
  { value: 'single',   enLabel: 'Single',   arLabel: 'أعزب / عزباء' },
  { value: 'married',  enLabel: 'Married',  arLabel: 'متزوج / متزوجة' },
  { value: 'divorced', enLabel: 'Divorced', arLabel: 'مطلق / مطلقة' },
  { value: 'widowed',  enLabel: 'Widowed',  arLabel: 'أرمل / أرملة' },
]

const EDUCATION_OPTIONS = [
  { value: 'none',      enLabel: 'No formal education',   arLabel: 'بدون تعليم رسمي' },
  { value: 'primary',   enLabel: 'Primary school',         arLabel: 'المرحلة الابتدائية' },
  { value: 'secondary', enLabel: 'Secondary school',       arLabel: 'المرحلة الثانوية' },
  { value: 'diploma',   enLabel: 'Diploma / Certificate',  arLabel: 'دبلوم / شهادة' },
  { value: 'bachelor',  enLabel: "Bachelor's degree",      arLabel: 'بكالوريوس' },
  { value: 'master',    enLabel: "Master's degree",        arLabel: 'ماجستير' },
  { value: 'phd',       enLabel: 'PhD / Doctorate',        arLabel: 'دكتوراه' },
  { value: 'other',     enLabel: 'Other',                  arLabel: 'أخرى' },
]

interface Props {
  isLoggedIn: boolean
  lang: 'en' | 'ar'
}

export default function DemographicsCard({ isLoggedIn, lang }: Props) {
  const supabase = createClient()
  const isAr = lang === 'ar'

  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [marital, setMarital] = useState('')
  const [education, setEducation] = useState('')
  const [country, setCountry] = useState('')

  const [loading, setLoading] = useState(isLoggedIn)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [alreadyComplete, setAlreadyComplete] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: p } = await supabase
        .from('profiles')
        .select('date_of_birth, gender, marital_status, educational_status, country_of_residence')
        .eq('id', user.id)
        .single()
      if (p) {
        if (p.date_of_birth && p.gender && p.marital_status && p.educational_status && p.country_of_residence) {
          setAlreadyComplete(true)
        } else {
          setDob(p.date_of_birth ?? '')
          setGender(p.gender ?? '')
          setMarital(p.marital_status ?? '')
          setEducation(p.educational_status ?? '')
          setCountry(p.country_of_residence ?? '')
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [isLoggedIn])

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      date_of_birth: dob || null,
      gender: gender || null,
      marital_status: marital || null,
      educational_status: education || null,
      country_of_residence: country || null,
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
  }

  if (alreadyComplete || dismissed || loading) return null

  if (saved) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">{t('demo.saved', lang)}</p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('demo.title', lang)}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('demo.sub', lang)}</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
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
          <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
            <option value="">{t('profile.gender.select', lang)}</option>
            <option value="male">{t('profile.gender.male', lang)}</option>
            <option value="female">{t('profile.gender.female', lang)}</option>
          </select>
        </div>
        <div>
          <label className="label">{t('profile.marital', lang)}</label>
          <select className="input" value={marital} onChange={e => setMarital(e.target.value)}>
            <option value="">{t('profile.marital.select', lang)}</option>
            {MARITAL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{isAr ? o.arLabel : o.enLabel}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('profile.education', lang)}</label>
          <select className="input" value={education} onChange={e => setEducation(e.target.value)}>
            <option value="">{t('profile.education.select', lang)}</option>
            {EDUCATION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{isAr ? o.arLabel : o.enLabel}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">{t('profile.country', lang)}</label>
          <input
            type="text"
            className="input"
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder={t('profile.country.ph', lang)}
            dir={isAr ? 'rtl' : 'ltr'}
          />
        </div>
      </div>

      <div className="mt-5">
        {isLoggedIn ? (
          <div className="flex items-center justify-between">
            <button onClick={() => setDismissed(true)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              {t('demo.skip', lang)}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary gap-2 disabled:opacity-50"
            >
              {saving ? t('demo.saving', lang) : t('demo.save', lang)}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl">
            <p className="text-sm text-brand-700 mb-3">{t('demo.guest.note', lang)}</p>
            <div className="flex items-center gap-3">
              <Link href="/register" className="flex items-center gap-1.5 btn-primary text-xs px-3 py-2">
                <UserPlus className="w-3.5 h-3.5" />
                {t('demo.guest.cta', lang)}
              </Link>
              <button onClick={() => setDismissed(true)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {t('demo.skip', lang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
