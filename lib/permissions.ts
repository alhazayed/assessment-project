import { ALL_PERMISSION_KEYS, type PermissionKey } from './types'

// ── Canonical permission-key validation ──────────────────────────────────────
// Single source of truth for validating permission keys entering the system.
// Every entry point (invitations, connect acceptance, access requests,
// relationship permission updates) must validate through these helpers rather
// than maintaining its own list, so the app layer can never accept a key that
// the canonical model — and the relationship_permissions CHECK constraint — does
// not recognise.

const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(ALL_PERMISSION_KEYS)

/** Narrowing guard: true only for a canonical permission key. */
export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === 'string' && PERMISSION_KEY_SET.has(value)
}

export type PermissionKeysResult =
  | { ok: true; keys: PermissionKey[] }
  | { ok: false; error: string }

/**
 * Validate an incoming permission-key array. Rejects — with a message in the
 * existing `{ error }` API format — anything that is not a non-empty array of
 * distinct, canonical permission keys: non-arrays, null, empty arrays,
 * non-string / unknown members, duplicates, and mixed valid/invalid payloads.
 */
export function validatePermissionKeys(input: unknown): PermissionKeysResult {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: 'permissions must be a non-empty array of permission keys' }
  }
  const seen = new Set<string>()
  for (const key of input) {
    if (!isPermissionKey(key)) {
      return { ok: false, error: `Invalid permission key. Valid values: ${ALL_PERMISSION_KEYS.join(', ')}` }
    }
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate permission key: ${key}` }
    }
    seen.add(key)
  }
  return { ok: true, keys: input as PermissionKey[] }
}

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
