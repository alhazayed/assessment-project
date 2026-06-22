export const colors = {
  brand: {
    50: '#EBF4FA',
    100: '#C8E0F2',
    500: '#3C90CF',
    600: '#1D6296',
    700: '#174E78',
    900: '#12273C',
  },
  accent: {
    50: '#FEF0E7',
    500: '#F3650A',
    600: '#D55508',
  },
  success: {
    50: '#F0FDF4',
    500: '#22C55E',
    600: '#16A34A',
  },
  warning: {
    50: '#FFFBEB',
    500: '#F59E0B',
    600: '#D97706',
  },
  danger: {
    50: '#FEF2F2',
    500: '#EF4444',
    600: '#DC2626',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
}

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
}

export const lightTheme = {
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  primary: '#1D6296',
  accent: '#F3650A',
}

export const darkTheme = {
  bg: '#0F1923',
  surface: '#1A2535',
  surfaceAlt: '#1F2D40',
  border: '#2D3D50',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textDisabled: '#64748B',
  primary: '#3C90CF',
  accent: '#F3650A',
}

export type Theme = typeof lightTheme

/**
 * Returns a hex color based on a mood score from 1–5
 */
export function getMoodColor(score: number): string {
  if (score <= 1) return '#EF4444'
  if (score === 2) return '#F97316'
  if (score === 3) return '#F59E0B'
  if (score === 4) return '#84CC16'
  return '#22C55E'
}

/**
 * Returns a hex color based on a severity band string
 */
export function getSeverityColor(band: string): string {
  const normalized = band.toLowerCase()
  if (normalized.includes('minimal') || normalized.includes('none') || normalized.includes('normal')) {
    return '#22C55E'
  }
  if (normalized.includes('mild') || normalized.includes('low')) {
    return '#84CC16'
  }
  if (normalized.includes('moderately severe')) {
    return '#F97316'
  }
  if (normalized.includes('moderate')) {
    return '#F59E0B'
  }
  if (normalized.includes('severe') || normalized.includes('high')) {
    return '#EF4444'
  }
  return '#6B7280'
}
