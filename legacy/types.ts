export type ModuleId = 'html' | 'css' | 'js' | 'ts' | 'web' | 'react' | 'git'

export type CodeLang =
  | 'js'
  | 'ts'
  | 'html'
  | 'css'
  | 'jsx'
  | 'tsx'
  | 'bash'
  | 'json'
  | 'http'
  | 'text'

interface QuestionBase {
  id: string
  level: number
  topic: string
  prompt: string
  code?: string
  lang?: CodeLang
  hint: string
  explain: string
}

interface SingleQuestion extends QuestionBase {
  type: 'single'
  choices: string[]
  answer: number
}

interface MultiQuestion extends QuestionBase {
  type: 'multi'
  choices: string[]
  answer: number[]
}

interface TrueFalseQuestion extends QuestionBase {
  type: 'tf'
  answer: boolean
}

interface FillQuestion extends QuestionBase {
  type: 'fill'
  answer: string[]
}

export type RawQuestion = SingleQuestion | MultiQuestion | TrueFalseQuestion | FillQuestion

export type Question = RawQuestion & { module: ModuleId }

export interface LevelInfo {
  title: string
  blurb: string
}

/** The shape of a `questions/<module>.json` file. */
export interface BankFile {
  module: ModuleId
  levels: LevelInfo[]
  questions: RawQuestion[]
}

/** What the player has picked for the current question. */
export type Selection = boolean | number | number[] | string | null
