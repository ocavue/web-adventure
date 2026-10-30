import { defineESLintConfig } from '@ocavue/eslint-config'
import stylex from '@stylexjs/eslint-plugin'
import astro from 'eslint-plugin-astro'

export default defineESLintConfig(
  {
    markdown: false,
    react: { files: ['**/*.tsx'], reactCompiler: false },
  },
  {
    ignores: ['legacy/**'],
  },
  ...astro.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@stylexjs': stylex },
    rules: {
      '@stylexjs/valid-styles': 'error',
      '@stylexjs/no-unused': 'error',
      '@stylexjs/valid-shorthands': 'error',
      '@stylexjs/no-legacy-contextual-styles': 'error',
      '@stylexjs/enforce-extension': 'error',
    },
  },
)
