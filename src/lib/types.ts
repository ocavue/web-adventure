import type * as v from 'valibot'

import type {
  BankFileSchema,
  CodeLangSchema,
  LevelSchema,
  ModuleIdSchema,
  QuestionSchema,
  StateSchema,
} from './schema.ts'

export type ModuleId = v.InferOutput<typeof ModuleIdSchema>
export type CodeLang = v.InferOutput<typeof CodeLangSchema>
export type RawQuestion = v.InferOutput<typeof QuestionSchema>
export type LevelInfo = v.InferOutput<typeof LevelSchema>
export type BankFile = v.InferOutput<typeof BankFileSchema>
export type State = v.InferOutput<typeof StateSchema>
export type Settings = State['settings']

/** A question with its module and, when it has code, the highlighted HTML of that code. */
export type Question = RawQuestion & { module: ModuleId; codeHtml?: string }

/** A question bank as the site serves it from `/questions/<module>.json`. */
export interface ServedBank {
  module: ModuleId
  levels: LevelInfo[]
  questions: (RawQuestion & { codeHtml?: string })[]
}

/** What the player has picked for the current question. */
export type Selection = boolean | number | number[] | string | null
