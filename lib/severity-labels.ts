import type { Lang } from '@/lib/i18n'
import severityAr from '@/lib/severity-labels.ar.json'

// Assessment submissions persist only the ENGLISH severity_band. The result
// page right after submission shows Arabic (the submit API returns band_ar
// live), but every view that reads the stored row — dashboard, assessments,
// profile history, insights, packages, the clinician patient view — rendered
// the raw English label even in Arabic mode.
//
// This map is generated from the severity_ar values already authored in
// assessment_definitions.scoring_logic, so the two stay consistent. When a
// label has no Arabic (e.g. a newly added assessment not yet in the map), we
// fall back to the English label rather than showing nothing.
//
// Regenerate after adding/changing assessments with:
//   select jsonb_object_agg(severity_en, severity_ar) from (
//     select distinct on (band->>'severity_en')
//            band->>'severity_en' severity_en, band->>'severity_ar' severity_ar
//     from assessment_definitions d,
//          lateral jsonb_array_elements(d.scoring_logic) band
//     where coalesce(band->>'severity_ar','') <> ''
//     order by band->>'severity_en'
//   ) t;
const SEVERITY_AR = severityAr as Record<string, string>

/** Localize a stored (English) severity-band label for display. */
export function localizeSeverity(severityEn: string | null | undefined, lang: Lang): string {
  if (!severityEn) return ''
  if (lang !== 'ar') return severityEn
  return SEVERITY_AR[severityEn] ?? severityEn
}
