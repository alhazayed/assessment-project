import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'sans-serif'],
        arabic: ['var(--font-tajawal)', 'Tajawal', 'Cairo', 'IBM Plex Sans Arabic', 'sans-serif'],
      },
      colors: {
        // V Welfare — Lapis Lazuli blue
        brand: {
          50:  '#EAF2F9',
          100: '#D6E8F3',
          200: '#A9CFE7',
          300: '#7DB5DB',
          400: '#4F9CC9',
          500: '#1D6296',
          600: '#18527E',
          700: '#134166',
          800: '#0E314D',
          900: '#12273C',
        },
        // Spanish Orange accent
        accent: {
          50:  '#FEF2EC',
          100: '#FDEEE4',
          200: '#FBC29D',
          300: '#F9A36B',
          400: '#F7843A',
          500: '#F3650A',
          600: '#D4570A',
          700: '#B54A08',
          800: '#963E07',
          900: '#773106',
        },
        // UI neutrals — matched to design tokens
        surface: {
          DEFAULT: '#F6F8FA',
          50:  '#FAFBFC',
          100: '#F6F8FA',
          200: '#ECEFF3',
          300: '#DCE3EA',
          400: '#C7D0D9',
          500: '#A6B2BE',
          600: '#7A8896',
          700: '#5A6B7B',
          800: '#3F4F5E',
          900: '#12273C',
        },
        // Severity bands
        severity: {
          minimal:  { text: '#1B8A5A', bg: '#E6F4EC', border: '#C9E6D6' },
          mild:     { text: '#B07A12', bg: '#FBF1DC', border: '#F1E0B8' },
          moderate: { text: '#C2560A', bg: '#FDEFE6', border: '#F8D8C2' },
          severe:   { text: '#C02A2A', bg: '#FDE8E8', border: '#F8C8C8' },
        },
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '15px' }],
        'sm':  ['13px', { lineHeight: '18px' }],
        'base':['14.5px', { lineHeight: '21px' }],
        'md':  ['15px', { lineHeight: '22px' }],
        'lg':  ['17px', { lineHeight: '26px' }],
        'xl':  ['20px', { lineHeight: '29px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
        '4xl': ['34px', { lineHeight: '42px' }],
        '5xl': ['42px', { lineHeight: '50px' }],
        '6xl': ['56px', { lineHeight: '62px' }],
      },
      borderRadius: {
        'xs':  '6px',
        'sm':  '8px',
        DEFAULT: '10px',
        'md':  '11px',
        'lg':  '14px',
        'xl':  '16px',
        '2xl': '18px',
        '3xl': '20px',
        'full': '9999px',
      },
      boxShadow: {
        'card':  '0 1px 3px 0 rgba(18,39,60,0.06), 0 1px 2px -1px rgba(18,39,60,0.04)',
        'card-md': '0 4px 16px -6px rgba(18,39,60,0.14)',
        'card-lg': '0 16px 40px -20px rgba(18,39,60,0.26)',
        'card-xl': '0 24px 60px -28px rgba(18,39,60,0.32)',
        'btn-accent': '0 12px 26px -10px rgba(243,101,10,0.60)',
        'btn-brand': '0 8px 18px -8px rgba(29,98,150,0.45)',
        'input-focus': '0 0 0 3px rgba(29,98,150,0.12)',
        'modal': '0 40px 80px -34px rgba(18,39,60,0.55)',
        // Dark mode
        'dark-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
        'dark-card-lg': '0 16px 40px -20px rgba(0,0,0,0.5)',
      },
      spacing: {
        '4.5': '18px',
        '13':  '52px',
        '15':  '60px',
        '18':  '72px',
        '22':  '88px',
      },
      letterSpacing: {
        tighter: '-0.028em',
        tight:   '-0.02em',
        snug:    '-0.01em',
        label:    '0.06em',
        caps:     '0.08em',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
export default config
