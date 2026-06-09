import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-latin)', 'Jost', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Jost', 'Inter', 'ui-sans-serif', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'IBM Plex Sans Arabic', 'Cairo', 'Noto Sans Arabic', 'sans-serif'],
        latin: ['var(--font-latin)', 'Jost', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // V Welfare brand palette — Lapis Lazuli primary
        brand: {
          50:  '#EEF5FB',
          100: '#D4E7F3',
          200: '#A9CFE7',
          300: '#7EB7DB',
          400: '#53A0CF',
          500: '#1D6296',  // Lapis Lazuli
          600: '#18527E',
          700: '#134166',
          800: '#0E314D',
          900: '#12273C',  // Yankees Blue
        },
        // Spanish Orange accent
        accent: {
          50:  '#FEF2EC',
          100: '#FDE1CE',
          200: '#FBC29D',
          300: '#F9A36B',
          400: '#F7843A',
          500: '#F3650A',  // Spanish Orange
          600: '#D4570A',
          700: '#B54A08',
          800: '#963E07',
          900: '#773106',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
export default config
