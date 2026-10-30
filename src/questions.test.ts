import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { LESSONS_PER_LEVEL, LEVELS, MODULES, Q_PER_LESSON } from './lib/constants.ts'
import { BankFileSchema } from './lib/schema.ts'
import type { RawQuestion } from './lib/types.ts'

const files = import.meta.glob<unknown>('./questions/*.json', { eager: true, import: 'default' })

describe.each(MODULES)('$name question bank', ({ id }) => {
  const result = v.safeParse(BankFileSchema, files[`./questions/${id}.json`])

  it('matches the schema', () => {
    expect(result.issues?.map((i) => `${v.getDotPath(i)}: ${i.message}`) ?? []).toEqual([])
  })

  if (!result.success) return
  const data = result.output

  it('belongs to its module and has unique ids and prompts', () => {
    expect(data.module).toBe(id)
    const ids = data.questions.map((q) => q.id)
    expect(ids.filter((x) => !x.startsWith(`${id}-`))).toEqual([])
    expect(new Set(ids).size).toBe(ids.length)
    const prompts = data.questions.map((q) => (q.prompt + (q.code ?? '')).toLowerCase())
    expect(new Set(prompts).size).toBe(prompts.length)
  })

  it('fills every lesson with a mix of question types', () => {
    for (let level = 1; level <= LEVELS; level++) {
      const qs = data.questions.filter((q) => q.level === level)
      expect(qs).toHaveLength(LESSONS_PER_LEVEL * Q_PER_LESSON)
      for (let i = 0; i < LESSONS_PER_LEVEL; i++) {
        const lesson = qs.slice(i * Q_PER_LESSON, (i + 1) * Q_PER_LESSON)
        const count = (t: RawQuestion['type']) => lesson.filter((q) => q.type === t).length
        const label = `level ${level} lesson ${i + 1}`
        expect(count('tf'), label).toBeGreaterThanOrEqual(1)
        expect(count('multi'), label).toBeGreaterThanOrEqual(1)
        expect(count('fill'), label).toBeGreaterThanOrEqual(1)
        expect(count('single'), label).toBeGreaterThanOrEqual(4)
        expect(lesson[0].type, label).not.toBe('fill')
      }
    }
  })
})
