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
  date_of_birth: string | null
  gender: 'male' | 'female' | null
  country_of_residence: string | null
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
}

export interface ResponseOption {
  value: number
  label_en: string
  label_ar: string
}

export interface AssessmentSubmission {
  id: string
  patient_id: string
  definition_id: string
  total_score: number
  severity_band: string | null
  high_risk_flag: boolean
  submitted_at: string
}

export interface MoodLog {
  id: string
  patient_id: string
  mood_score: number
  anxiety_score: number | null
  energy_score: number | null
  notes: string | null
  logged_at: string
}

export interface JournalEntry {
  id: string
  patient_id: string
  title: string
  content: string
  mood_tag: string | null
  is_shared: boolean
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  is_read: boolean
  created_at: string
}
