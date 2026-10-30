import { describe, expect, it } from 'vitest'

import { LESSONS_PER_LEVEL, LEVELS, MODULES, Q_PER_LESSON } from './constants.ts'
import type { BankFile, RawQuestion } from './types.ts'

const files = import.meta.glob<BankFile>('./questions/*.json', { eager: true, import: 'default' })
const LANGS = new Set(['js', 'ts', 'html', 'css', 'jsx', 'tsx', 'bash', 'json', 'http', 'text'])

/** Returns the problems with one question, as short messages. */
function problems(q: RawQuestion): string[] {
  const out: string[] = []
  for (const k of ['topic', 'prompt', 'hint', 'explain'] as const) {
    if (typeof q[k] !== 'string' || !q[k].trim()) out.push(`missing ${k}`)
  }
  if (q.code !== undefined && !LANGS.has(q.lang ?? '')) out.push('code needs a valid lang')
  if (q.type === 'single' || q.type === 'multi') {
    if (q.choices.length < 3 || q.choices.length > 4) out.push('needs 3-4 choices')
    if (new Set(q.choices).size !== q.choices.length) out.push('duplicate choices')
    // Choices are shuffled, so they must not refer to each other.
    if (q.choices.some((c) => /all of the above|none of the above|both a and b/i.test(c)))
      out.push('position-based choice')
  }
  switch (q.type) {
    case 'single':
      if (!Number.isSafeInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length)
        out.push('bad single answer')
      break
    case 'multi': {
      const valid = q.answer.every((i) => Number.isSafeInteger(i) && i >= 0 && i < q.choices.length)
      if (!valid || q.answer.length < 2 || new Set(q.answer).size !== q.answer.length)
        out.push('bad multi answer')
      if (q.answer.length === q.choices.length) out.push('multi answer is every choice')
      break
    }
    case 'tf':
      if (typeof q.answer !== 'boolean') out.push('bad tf answer')
      break
    case 'fill':
      if (q.answer.length === 0 || q.answer.some((s) => !s.trim())) out.push('bad fill answer')
      break
    default:
      out.push('bad type')
  }
  return out
}

describe.each(MODULES)('$name question bank', ({ id }) => {
  const data = files[`./questions/${id}.json`]

  it('has 5 described levels', () => {
    expect(data.module).toBe(id)
    expect(data.levels).toHaveLength(LEVELS)
    for (const lv of data.levels) expect(lv.title && lv.blurb).toBeTruthy()
  })

  it('has unique ids and prompts', () => {
    const ids = data.questions.map((q) => q.id)
    expect(ids.filter((x) => !new RegExp(String.raw`^${id}-\d{3}$`).test(x))).toEqual([])
    expect(new Set(ids).size).toBe(ids.length)
    const prompts = data.questions.map((q) => (q.prompt + (q.code ?? '')).toLowerCase())
    expect(new Set(prompts).size).toBe(prompts.length)
  })

  it('has only well-formed questions', () => {
    const bad = data.questions.flatMap((q) => problems(q).map((p) => `${q.id}: ${p}`))
    expect(bad).toEqual([])
  })

  it('fills every lesson with a mix of question types', () => {
    for (let level = 1; level <= LEVELS; level++) {
      const qs = data.questions.filter((q) => q.level === level)
      expect(qs).toHaveLength(LESSONS_PER_LEVEL * Q_PER_LESSON)
      for (let i = 0; i < LESSONS_PER_LEVEL; i++) {
        const lesson = qs.slice(i * Q_PER_LESSON, (i + 1) * Q_PER_LESSON)
        const count = (t: RawQuestion['type']) => lesson.filter((q) => q.type === t).length
        const label = `level ${level} lesson ${i + 1}`
        expect({
          label,
          tf: count('tf') >= 1,
          multi: count('multi') >= 1,
          fill: count('fill') >= 1,
        }).toEqual({
          label,
          tf: true,
          multi: true,
          fill: true,
        })
        expect(count('single'), label).toBeGreaterThanOrEqual(4)
        expect(lesson[0].type, label).not.toBe('fill')
      }
    }
  })
})
