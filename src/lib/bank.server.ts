import { createHighlighter, type ThemeRegistration } from 'shiki'
import * as v from 'valibot'

import { MODULES } from './constants.ts'
import { BankFileSchema } from './schema.ts'
import type { BankFile, CodeLang, LevelInfo, ModuleId, ServedBank } from './types.ts'

const files = import.meta.glob<unknown>('../questions/*.json', { eager: true, import: 'default' })

/** Reads and validates a question bank. Invalid data fails the build. */
function readBank(mod: ModuleId): BankFile {
  const result = v.safeParse(BankFileSchema, files[`../questions/${mod}.json`])
  if (!result.success) {
    const issues = result.issues.map((i) => `${v.getDotPath(i) ?? ''}: ${i.message}`).join('\n')
    throw new Error(`Invalid question bank "${mod}":\n${issues}`)
  }
  return result.output
}

export interface TrailSummary {
  mod: ModuleId
  levels: LevelInfo[]
  questionCount: number
}

/** Level titles and question counts for every trail, small enough to pass to islands as props. */
export function trailSummaries(): TrailSummary[] {
  return MODULES.map((m) => {
    const bank = readBank(m.id)
    return { mod: m.id, levels: bank.levels, questionCount: bank.questions.length }
  })
}

const SHIKI_LANG: Record<CodeLang, string> = {
  js: 'javascript',
  ts: 'typescript',
  html: 'html',
  css: 'css',
  jsx: 'jsx',
  tsx: 'tsx',
  bash: 'bash',
  json: 'json',
  http: 'http',
  text: 'text',
}

interface CodePalette {
  name: string
  type: 'light' | 'dark'
  bg: string
  ink: string
  muted: string
  comment: string
  keyword: string
  string: string
  number: string
  fn: string
  tag: string
  attr: string
}

/**
 * Builds a Shiki theme from the legacy Prism palette. Every color has at least
 * 4.5:1 contrast on the code background.
 */
function codeTheme(p: CodePalette): ThemeRegistration {
  return {
    name: p.name,
    type: p.type,
    colors: { 'editor.background': p.bg, 'editor.foreground': p.ink },
    settings: [
      { settings: { foreground: p.ink, background: p.bg } },
      { scope: ['variable', 'meta.embedded'], settings: { foreground: p.ink } },
      {
        scope: ['punctuation', 'meta.brace', 'keyword.operator', 'punctuation.definition.tag'],
        settings: { foreground: p.muted },
      },
      {
        scope: ['comment', 'punctuation.definition.comment', 'meta.tag.metadata.doctype'],
        settings: { foreground: p.comment, fontStyle: 'italic' },
      },
      {
        scope: [
          'keyword',
          'storage',
          'constant.language',
          'keyword.other.important',
          'keyword.control.at-rule',
          'punctuation.definition.keyword',
        ],
        settings: { foreground: p.keyword },
      },
      {
        scope: [
          'string',
          'punctuation.definition.string',
          'string.regexp',
          'variable.parameter.url',
          'constant.character',
        ],
        settings: { foreground: p.string },
      },
      {
        scope: ['constant.numeric', 'constant.other', 'keyword.other.unit', 'constant.other.color'],
        settings: { foreground: p.number },
      },
      {
        scope: [
          'entity.name.function',
          'support.function',
          'entity.name.type',
          'entity.name.class',
          'entity.other.inherited-class',
          'support.class.component',
          'entity.name.tag.css',
          'entity.other.attribute-name.class',
          'entity.other.attribute-name.id',
          'entity.other.attribute-name.pseudo-class',
          'entity.other.attribute-name.pseudo-element',
          'meta.selector',
        ],
        settings: { foreground: p.fn },
      },
      {
        scope: [
          'entity.name.tag',
          'support.type.property-name',
          'meta.object-literal.key',
          'meta.property-name',
        ],
        settings: { foreground: p.tag },
      },
      {
        scope: [
          'entity.other.attribute-name',
          'support.variable',
          'support.class.builtin',
          'variable.other.normal.shell',
          'variable.other.positional.shell',
          'variable.other.special.shell',
          'punctuation.definition.variable.shell',
        ],
        settings: { foreground: p.attr },
      },
    ],
  }
}

const lightCode = codeTheme({
  name: 'byte-trail-light',
  type: 'light',
  bg: '#f6f8f3',
  ink: '#132228',
  muted: '#4b5f65',
  // Legacy #7b8b84 and #b35a00, darkened to reach 4.5:1.
  comment: '#637370',
  keyword: '#a3317a',
  string: '#2c7a3c',
  number: '#ad5700',
  fn: '#2f5fcf',
  tag: '#b8331f',
  attr: '#8a5a00',
})

const darkCode = codeTheme({
  name: 'byte-trail-dark',
  type: 'dark',
  bg: '#0f1f24',
  ink: '#e6efec',
  muted: '#a3b5b3',
  comment: '#7f9690',
  keyword: '#f08bd0',
  string: '#8fdc9a',
  number: '#ffb870',
  fn: '#8fb4ff',
  tag: '#ff8f7a',
  attr: '#f5cf7a',
})

let highlighter: ReturnType<typeof createHighlighter> | undefined

/** The bank as the site serves it, with code highlighted at build time. */
export async function serveBank(mod: ModuleId): Promise<ServedBank> {
  const bank = readBank(mod)
  highlighter ??= createHighlighter({
    themes: [lightCode, darkCode],
    langs: Object.values(SHIKI_LANG).filter((l) => l !== 'text'),
  })
  const h = await highlighter
  const questions = bank.questions.map((q) => {
    if (q.code === undefined || !q.lang) return q
    const codeHtml = h.codeToHtml(q.code, {
      lang: SHIKI_LANG[q.lang],
      themes: { light: 'byte-trail-light', dark: 'byte-trail-dark' },
      defaultColor: false,
    })
    return { ...q, codeHtml }
  })
  return { module: bank.module, levels: bank.levels, questions }
}
