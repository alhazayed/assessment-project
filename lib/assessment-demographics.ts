// Shared demographic enrichment for answer-level analytics + exports. Mirrors the
// enrichment used by /api/admin/research so every research surface bins people
// the same way, and centralises the full set of demographic "variants" a
// submission can be sliced by (patient profile, with guest-submission fallback).

export const DEMOGRAPHIC_DIMENSIONS = [
  'gender', 'ageGroup', 'marital', 'education', 'country', 'employment', 'medication',
] as const
export type DemographicDimension = (typeof DEMOGRAPHIC_DIMENSIONS)[number]

export const DIMENSION_LABELS: Record<DemographicDimension, { en: string; ar: string }> = {
  gender: { en: 'Gender', ar: 'الجنس' },
  ageGroup: { en: 'Age group', ar: 'الفئة العمرية' },
  marital: { en: 'Marital status', ar: 'الحالة الاجتماعية' },
  education: { en: 'Education', ar: 'التعليم' },
  country: { en: 'Country', ar: 'الدولة' },
  employment: { en: 'Employment', ar: 'العمل' },
  medication: { en: 'On psychiatric medication', ar: 'يتناول أدوية نفسية' },
}

export interface Demographics {
  gender: string
  ageGroup: string
  marital: string
  education: string
  country: string
  employment: string
  medication: string
}

export function getAgeGroup(dob: string | null, referenceDate?: string): string {
  if (!dob) return 'Unknown'
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return 'Unknown'
  const ref = referenceDate ? new Date(referenceDate) : new Date()
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  if (age < 0) return 'Unknown'
  if (age < 18) return 'Under 18'
  if (age <= 24) return '18–24'
  if (age <= 34) return '25–34'
  if (age <= 44) return '35–44'
  if (age <= 54) return '45–54'
  return '55+'
}

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

const cap = (s: string) => s.replace(/^./, c => c.toUpperCase())

/**
 * Raw submission row shape expected from a select that embeds:
 *   guest_gender, guest_dob, guest_marital, guest_education, guest_country,
 *   profiles(gender, date_of_birth, marital_status, country_of_residence,
 *            educational_status, patient_profiles(employment_status, has_psychiatric_medications))
 */
export interface RawDemographicSub {
  submitted_at?: string | null
  guest_gender?: string | null
  guest_dob?: string | null
  guest_marital?: string | null
  guest_education?: string | null
  guest_country?: string | null
  profiles?: RawProfile | RawProfile[] | null
}
interface RawProfile {
  gender?: string | null
  date_of_birth?: string | null
  marital_status?: string | null
  country_of_residence?: string | null
  educational_status?: string | null
  patient_profiles?: RawPatientProfile | RawPatientProfile[] | null
}
interface RawPatientProfile {
  employment_status?: string | null
  has_psychiatric_medications?: boolean | null
}

export function enrichDemographics(s: RawDemographicSub): Demographics {
  const p = first(s.profiles)
  const pp = first(p?.patient_profiles)
  const dob = p?.date_of_birth || s.guest_dob || null
  const med = pp?.has_psychiatric_medications
  return {
    gender: cap(String(p?.gender || s.guest_gender || 'Unknown')),
    ageGroup: getAgeGroup(dob, s.submitted_at ?? undefined),
    marital: cap(String(p?.marital_status || s.guest_marital || 'Unknown')),
    education: String(p?.educational_status || s.guest_education || 'Unknown'),
    country: String(p?.country_of_residence || s.guest_country || 'Unknown'),
    employment: String(pp?.employment_status || 'Unknown'),
    medication: med === true ? 'Yes' : med === false ? 'No' : 'Unknown',
  }
}

/** The embed string to feed into a submissions `.select()` so enrichDemographics works. */
export const DEMOGRAPHIC_SELECT = `
  guest_gender, guest_dob, guest_marital, guest_education, guest_country,
  profiles(gender, date_of_birth, marital_status, country_of_residence, educational_status,
    patient_profiles(employment_status, has_psychiatric_medications))
`
