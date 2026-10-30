import { LESSONS_PER_LEVEL, LEVELS, MODULES } from './constants.ts'
import type { BankFile, LevelInfo, ModuleId, Question } from './types.ts'

interface ModuleBank {
  levels: LevelInfo[]
  byLevel: Question[][]
  all: Question[]
}

const files = import.meta.glob<BankFile>('./questions/*.json', { import: 'default' })

export const bank = {} as Record<ModuleId, ModuleBank>

export async function loadBank(): Promise<void> {
  await Promise.all(
    MODULES.map(async (m) => {
      const data = await files[`./questions/${m.id}.json`]()
      const all = data.questions.map((q): Question => ({ ...q, module: m.id }))
      const byLevel = Array.from({ length: LEVELS }, (_, i) => all.filter((q) => q.level === i + 1))
      bank[m.id] = { levels: data.levels, byLevel, all }
    }),
  )
}

export function bankLoaded(): boolean {
  return MODULES.every((m) => bank[m.id])
}

export function qById(id: string): Question | undefined {
  const mod = id.split('-')[0] as ModuleId
  return bank[mod]?.all.find((q) => q.id === id)
}

/** Lessons are consecutive groups of questions within a level, in file order. */
export function lessonQuestions(mod: ModuleId, level: number, lesson: number): Question[] {
  const list = bank[mod].byLevel[level - 1]
  const size = Math.ceil(list.length / LESSONS_PER_LEVEL)
  return list.slice(lesson * size, (lesson + 1) * size)
}
