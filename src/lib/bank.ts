import { signal } from '@preact/signals'

import { MODULES } from './constants.ts'
import type { ModuleId, Question, ServedBank } from './types.ts'

interface ModuleBank {
  byLevel: Question[][]
  all: Question[]
}

/** Question banks loaded so far, by module. */
export const banks = signal<Partial<Record<ModuleId, ModuleBank>>>({})

const pending = new Map<ModuleId, Promise<ModuleBank>>()

/** Loads one question bank from `/questions/<module>.json`, once. */
export function loadBank(mod: ModuleId): Promise<ModuleBank> {
  let p = pending.get(mod)
  if (!p) {
    p = fetch(`/questions/${mod}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load the ${mod} questions`)
        return res.json() as Promise<ServedBank>
      })
      .then((data) => {
        const all = data.questions.map((q): Question => ({ ...q, module: mod }))
        const byLevel = Array.from({ length: data.levels.length }, (_, i) => {
          return all.filter((q) => q.level === i + 1)
        })
        const bank = { byLevel, all }
        banks.value = { ...banks.value, [mod]: bank }
        return bank
      })
    p.catch(() => pending.delete(mod))
    pending.set(mod, p)
  }
  return p
}

export function loadAllBanks(): Promise<ModuleBank[]> {
  return Promise.all(MODULES.map((m) => loadBank(m.id)))
}

/** Finds a question in the banks loaded so far. */
export function qById(id: string): Question | undefined {
  const mod = id.split('-')[0] as ModuleId
  return banks.value[mod]?.all.find((q) => q.id === id)
}

/** Lessons are consecutive groups of questions within a level, in file order. */
export function lessonQuestions(
  bank: ModuleBank,
  level: number,
  lesson: number,
  perLevel: number,
): Question[] {
  const list = bank.byLevel[level - 1]
  const size = Math.ceil(list.length / perLevel)
  return list.slice(lesson * size, (lesson + 1) * size)
}
