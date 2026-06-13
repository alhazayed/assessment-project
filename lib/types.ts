export type Role = 'patient' | 'clinician' | 'admin' | 'superadmin'

export interface Profile {
  id: string
  role: Role
  full_name_en: string
  full_name_ar: string | null
  language_preference: 'ar' | 'en'
  assigned_clinician_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  deactivated_at: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | null
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | null
  educational_status: 'none' | 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'other' | null
  country_of_residence: string | null
}

export interface PatientProfile {
  id: string
  date_of_birth: string | null
  gender: 'male' | 'female' | null
  phone_number: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: 'family' | 'friend' | 'colleague' | 'other' | null
  consent_given_at: string | null
  platform_joined_at: string
  share_mood_notes: boolean
  share_journal_default: boolean
  onboarding_completed_at: string | null
  onboarding_step: number | null
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | null
  educational_status: 'none' | 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'other' | null
  employment_status: 'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired' | 'homemaker' | 'other' | null
  has_psychiatric_medications: boolean
  psychiatric_medication_details: string | null
  psychiatric_medication_duration: string | null
}

export interface AssessmentDefinition {
  id: string
  code: string
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  total_questions: number
  scoring_logic: ScoringBand[]
  high_risk_threshold: number | null
  is_active: boolean
  created_at: string
}

export interface ScoringBand {
  min: number
  max: number
  severity_en: string
  severity_ar: string
  color: string
}

export interface AssessmentItem {
  id: string
  definition_id: string
  item_number: number
  question_en: string
  question_ar: string
  response_options: ResponseOption[]
  is_safety_item: boolean
  score_weight: number
  subscale?: string | null
}

export interface ResponseOption {
  value: number
  label_en: string
  label_ar: string
}

export interface AssessmentSubmission {
  id: string
  assignment_id: string | null
  patient_id: string
  definition_id: string
  total_score: number
  severity_band: string
  started_at: string
  submitted_at: string
  high_risk_flag: boolean
  is_self_initiated: boolean
  assessment_definitions?: AssessmentDefinition
}

export interface AssessmentAssignment {
  id: string
  patient_id: string
  clinician_id: string
  definition_id: string
  assigned_at: string
  due_date: string | null
  status: 'pending' | 'completed' | 'expired'
  note_to_patient_en: string | null
  note_to_patient_ar: string | null
  assessment_definitions?: AssessmentDefinition
}

export interface MoodLog {
  id: string
  patient_id: string
  log_date: string
  mood_score: number
  energy_score: number
  anxiety_score: number
  sleep_hours: number | null
  mood_note: string | null
  note_shared: boolean
  created_at: string
  triggers: string[]
  activity_minutes: number | null
}

export interface JournalEntry {
  id: string
  patient_id: string
  body: string
  is_shared: boolean
  shared_at: string | null
  word_count: number | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  patient_id: string
  clinician_id: string
  sender_id: string
  body: string
  is_urgent: boolean
  read_at: string | null
  created_at: string
}
