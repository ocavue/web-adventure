import { createHighlighter } from 'shiki'
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
  questionIds: string[]
}

/** Level titles and question ids for every trail, from the banks at build time. */
export function trailSummaries(): TrailSummary[] {
  return MODULES.map((m) => {
    const bank = readBank(m.id)
    const questionIds = bank.questions.map((q) => q.id)
    return { mod: m.id, levels: bank.levels, questionCount: questionIds.length, questionIds }
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

let highlighter: ReturnType<typeof createHighlighter> | undefined

/** The bank as the site serves it, with code highlighted at build time. */
export async function serveBank(mod: ModuleId): Promise<ServedBank> {
  const bank = readBank(mod)
  highlighter ??= createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: Object.values(SHIKI_LANG).filter((l) => l !== 'text'),
  })
  const h = await highlighter
  const questions = bank.questions.map((q) => {
    if (q.code === undefined || !q.lang) return q
    const codeHtml = h.codeToHtml(q.code, {
      lang: SHIKI_LANG[q.lang],
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
    return { ...q, codeHtml }
  })
  return { module: bank.module, levels: bank.levels, questions }
}
