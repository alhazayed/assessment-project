import type { PermissionKey } from './types'
import { ALL_PERMISSION_KEYS } from './types'

/**
 * Canonical permission-key validator. Single source of truth for API routes so
 * that request validation always matches the DB CHECK constraint on
 * relationship_permissions.permission_key (and lib/types ALL_PERMISSION_KEYS).
 */
export function isValidPermissionKey(key: unknown): key is PermissionKey {
  return typeof key === 'string' && (ALL_PERMISSION_KEYS as string[]).includes(key)
}

export { ALL_PERMISSION_KEYS }

export const PERMISSION_LABELS: Record<PermissionKey, { en: string; ar: string }> = {
  view_profile:            { en: 'Your profile information',         ar: 'معلومات ملفك الشخصي' },
  view_assessment_results: { en: 'Your assessment results',          ar: 'نتائج تقييماتك' },
  view_assessment_history: { en: 'Your full assessment history',     ar: 'سجل تقييماتك الكامل' },
  view_reports:            { en: 'Your clinical reports',            ar: 'تقاريرك السريرية' },
  view_progress_tracking:  { en: 'Your progress over time',          ar: 'تقدمك عبر الزمن' },
  view_mood_tracking:      { en: 'Your mood logs',                   ar: 'سجلات مزاجك' },
  export_reports:          { en: 'Export your reports',              ar: 'تصدير تقاريرك' },
  message_patient:         { en: 'Send you secure messages',         ar: 'إرسال رسائل آمنة إليك' },
  upload_documents:        { en: 'Upload documents to your profile', ar: 'رفع مستندات إلى ملفك' },
  generate_clinical_notes: { en: 'Create clinical notes',            ar: 'إنشاء ملاحظات سريرية' },
}

export const DEFAULT_REQUESTED_PERMISSIONS: PermissionKey[] = [
  'view_profile',
  'view_assessment_results',
  'view_assessment_history',
  'message_patient',
]
