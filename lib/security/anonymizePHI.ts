/**
 * PHI (Protected Health Information) scrubber.
 * Replaces identifiable patterns with neutral placeholders before any text
 * is forwarded to a third-party AI provider (Gemini).
 *
 * Coverage: phone numbers, emails, national/passport IDs, dates of birth,
 * medical record numbers, postal addresses, and common name-introduction
 * patterns. Name extraction via regex cannot achieve NLP-level accuracy —
 * use this as a defence-in-depth layer, not the sole control.
 */

export interface AnonymizeResult {
  text: string
  replacements: number
}

const RULES: Array<{ pattern: RegExp; placeholder: string }> = [
  // Emails — must run before generic alphanumeric patterns
  {
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    placeholder: '[EMAIL]',
  },

  // International phone numbers (+966 50 123 4567, +1-800-555-0100, etc.)
  {
    pattern: /\+?[\d][\d\s\-().]{7,17}[\d]/g,
    placeholder: '[PHONE]',
  },

  // Saudi national ID / Iqama (10 digits starting with 1 or 2)
  {
    pattern: /\b[12]\d{9}\b/g,
    placeholder: '[ID]',
  },

  // Generic national/passport IDs: letter(s) + 5–12 digits or mixed alphanum ≥8 chars
  {
    pattern: /\b[A-Z]{1,3}\d{5,12}\b/g,
    placeholder: '[ID]',
  },

  // Medical record numbers — MRN/MR/ID prefix + digits
  {
    pattern: /\b(?:MRN?|PATIENT[\s_-]?ID|RECORD[\s_-]?NO?\.?)\s*[:#]?\s*\d{4,12}\b/gi,
    placeholder: '[MRN]',
  },

  // Dates of birth — common formats: DD/MM/YYYY, MM-DD-YYYY, YYYY-MM-DD, "born 12 Jan 1990"
  {
    pattern: /\b(?:born|dob|d\.o\.b\.?|date of birth)\s*:?\s*[\d]{1,2}[\s\/\-][\w]{2,9}[\s\/\-][\d]{2,4}\b/gi,
    placeholder: '[DOB]',
  },
  {
    pattern: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    placeholder: '[DOB]',
  },
  {
    pattern: /\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/g,
    placeholder: '[DOB]',
  },

  // Postal / street addresses — street number + road type keywords
  {
    pattern: /\b\d{1,5}\s+[A-Za-z\s]{2,40}(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Place|Pl|Court|Ct|Crescent|Close|Park)\b/gi,
    placeholder: '[ADDRESS]',
  },

  // PO Box
  {
    pattern: /\b(?:P\.?O\.?\s*Box|Post(?:al)?\s+Box)\s+\d+\b/gi,
    placeholder: '[ADDRESS]',
  },

  // Zip / postal codes (US 5-digit, UK, CA, AU)
  {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    placeholder: '[ADDRESS]',
  },

  // Common name-introduction patterns: "my name is X", "I am X", "this is X speaking"
  {
    pattern: /\b(?:my name is|I am|i'm|this is)\s+([A-Z][a-z]{1,19}(?:\s+[A-Z][a-z]{1,19}){0,2})\b/gi,
    placeholder: '[PATIENT]',
  },

  // Names after "patient:" or "name:" labels
  {
    pattern: /\b(?:patient|name)\s*:\s*([A-Z][a-z]{1,19}(?:\s+[A-Z][a-z]{1,19}){1,2})\b/gi,
    placeholder: '[PATIENT]',
  },
]

export function anonymizePHI(input: string): AnonymizeResult {
  if (!input || typeof input !== 'string') return { text: input, replacements: 0 }

  let text = input
  let replacements = 0

  for (const rule of RULES) {
    const before = text
    text = text.replace(rule.pattern, rule.placeholder)
    // Count replacements by comparing lengths (rough but efficient)
    if (text !== before) {
      const matches = before.match(rule.pattern)
      replacements += matches?.length ?? 0
    }
  }

  return { text, replacements }
}

/** Convenience wrapper — returns scrubbed text only. */
export function scrubPHI(input: string): string {
  return anonymizePHI(input).text
}
