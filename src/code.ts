import './prism-core.ts'
import './prism-languages.ts'

import Prism from 'prismjs'

import type { CodeLang } from './types.ts'
import { esc } from './utils.ts'

const PRISM_LANG: Partial<Record<CodeLang, string>> = {
  js: 'javascript',
  ts: 'typescript',
  html: 'markup',
  css: 'css',
  jsx: 'jsx',
  tsx: 'tsx',
  bash: 'bash',
  json: 'json',
  http: 'http',
}

export function codeBlock(code: string, lang?: CodeLang): string {
  const name = lang && PRISM_LANG[lang]
  const grammar = name ? Prism.languages[name] : undefined
  const html = name && grammar ? Prism.highlight(code, grammar, name) : esc(code)
  return `<pre class="code" tabindex="0" aria-label="Code example"><code>${html}</code></pre>`
}
