/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EBF4FA',
          100: '#C8E0F2',
          200: '#A5CCE9',
          300: '#82B8E1',
          400: '#5FA4D8',
          500: '#3C90CF',
          600: '#1D6296',
          700: '#174E78',
          800: '#113A5A',
          900: '#12273C',
        },
        accent: {
          50:  '#FEF0E7',
          100: '#FCD8C0',
          200: '#F9C098',
          300: '#F7A870',
          400: '#F58E48',
          500: '#F3650A',
          600: '#D55508',
          700: '#B84506',
          800: '#9A3504',
          900: '#7C2502',
        },
      },
    },
  },
  plugins: [],
}
