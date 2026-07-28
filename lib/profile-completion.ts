/** Fields required before a patient can start an assessment. */
export type ProfileGateData = {
  date_of_birth?: string | null
  gender?: string | null
  marital_status?: string | null
  educational_status?: string | null
  country_of_residence?: string | null
}

export type PatientGateData = {
  employment_status?: string | null
  has_psychiatric_medications?: boolean | null
}

export function getProfileCompletion(
  profile: ProfileGateData | null | undefined,
  patientProfile: PatientGateData | null | undefined,
) {
  const checks = [
    !!profile?.date_of_birth,
    !!profile?.gender,
    !!profile?.marital_status,
    !!profile?.educational_status,
    !!profile?.country_of_residence,
    !!patientProfile?.employment_status,
    patientProfile?.has_psychiatric_medications !== null &&
      patientProfile?.has_psychiatric_medications !== undefined,
  ]
  const completed = checks.filter(Boolean).length
  const total = checks.length
  return {
    isComplete: completed === total,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  }
}
