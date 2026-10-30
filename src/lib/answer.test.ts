import { describe, expect, it } from 'vitest'

import { correctText, isCaseSlip, isCorrect, norm } from './answer.ts'
import type { Question } from './types.ts'

const base = {
  id: 'js-001',
  level: 1,
  topic: 'Test',
  prompt: 'Prompt',
  hint: 'Hint',
  explain: 'Explain',
}

function fill(module: Question['module'], answer: string[]): Question {
  return { ...base, module, type: 'fill', answer }
}

describe('norm', () => {
  it('drops wrapping backticks, quotes, a trailing semicolon, and extra spaces', () => {
    expect(norm('  `let  x = 1;`  ')).toBe('let x = 1')
    expect(norm('"hello"')).toBe('hello')
  })
})

describe('isCorrect', () => {
  it('checks single, multi, and true/false answers', () => {
    const single: Question = {
      ...base,
      module: 'js',
      type: 'single',
      choices: ['a', 'b', 'c'],
      answer: 1,
    }
    expect(isCorrect(single, 1)).toBe(true)
    expect(isCorrect(single, 0)).toBe(false)

    const multi: Question = {
      ...base,
      module: 'js',
      type: 'multi',
      choices: ['a', 'b', 'c'],
      answer: [0, 2],
    }
    expect(isCorrect(multi, [2, 0])).toBe(true)
    expect(isCorrect(multi, [0])).toBe(false)
    expect(isCorrect(multi, [0, 1, 2])).toBe(false)

    const tf: Question = { ...base, module: 'js', type: 'tf', answer: false }
    expect(isCorrect(tf, false)).toBe(true)
    expect(isCorrect(tf, true)).toBe(false)
  })

  it('accepts any listed fill answer, ignoring case for plain words', () => {
    const q = fill('html', ['<ul>', 'ul'])
    expect(isCorrect(q, 'UL')).toBe(true)
    expect(isCorrect(q, ' `<ul>` ')).toBe(true)
    expect(isCorrect(q, 'ol')).toBe(false)
  })

  it('matches camelCase identifiers in code modules exactly', () => {
    const q = fill('js', ['toUpperCase'])
    expect(isCorrect(q, 'toUpperCase')).toBe(true)
    expect(isCorrect(q, 'touppercase')).toBe(false)
    expect(isCaseSlip(q, 'touppercase')).toBe(true)
    expect(isCorrect(fill('css', ['flexDirection']), 'flexdirection')).toBe(true)
  })

  it('matches short CLI flags exactly', () => {
    const q = fill('git', ['git commit -m'])
    expect(isCorrect(q, 'git commit -m')).toBe(true)
    expect(isCorrect(q, 'git commit -M')).toBe(false)
  })
})

describe('isCaseSlip', () => {
  it('is false for correct and for plainly wrong answers', () => {
    const q = fill('js', ['useState'])
    expect(isCaseSlip(q, 'useState')).toBe(false)
    expect(isCaseSlip(q, 'useEffect')).toBe(false)
  })
})

describe('correctText', () => {
  it('wraps fill answers in backticks and joins multi answers', () => {
    expect(correctText(fill('js', ['map', 'Array.map']))).toBe('`map`')
    const multi: Question = {
      ...base,
      module: 'js',
      type: 'multi',
      choices: ['a', '`b`', 'c'],
      answer: [0, 1],
    }
    expect(correctText(multi)).toBe('a, `b`')
  })
})
