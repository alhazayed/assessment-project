import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'

// ESLint 9 flat config (migrated from .eslintrc.json for the Next 16 upgrade).
// Uses the native flat configs from @next/eslint-plugin-next directly — the
// legacy `next/core-web-vitals` shareable config is incompatible with ESLint 9
// via FlatCompat (circular-structure error), so we compose the flat exports.
const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'load-tests/**', 'supabase/**', 'next-env.d.ts', 'vw-test.js'] },
  nextPlugin.configs['core-web-vitals'],
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]

export default eslintConfig
