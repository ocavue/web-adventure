import { bank, lessonQuestions, qById } from './bank.ts'
import { LEVELS, MODULES, Q_PER_LESSON } from './constants.ts'
import { closeModal, openModal, toast } from './effects.ts'
import { icon } from './icons.ts'
import { startSession } from './lesson.ts'
import { lessonDone, levelUnlocked, mistakes, modStats, nextLesson } from './progress.ts'
import { state } from './state.ts'
import type { ModuleId, Question } from './types.ts'
import { seeded, shuffle, todayStr } from './utils.ts'
import { openSettings } from './views/settings.ts'

interface ActionData {
  mod?: ModuleId
  level?: string
  lesson?: string
}

export function startLesson(mod: ModuleId, level: number, lesson: number): void {
  startSession('lesson', lessonQuestions(mod, level, lesson), {
    mod,
    level,
    lesson,
    replay: lessonDone(mod, level, lesson),
  })
}

/** Ten questions from the levels below `level`, preferring ones the player has not seen. */
function jumpQuestions(mod: ModuleId, level: number): Question[] {
  const per = Array.from({ length: level - 1 }, (_, i) => {
    return shuffle(bank[mod].byLevel[i].filter((q) => q.type !== 'fill')).sort(
      (a, b) => Number(Object.hasOwn(state.seen, b.id)) - Number(Object.hasOwn(state.seen, a.id)),
    )
  })
  const qs: Question[] = []
  for (let k = 0; qs.length < 10; k++) qs.push(per[k % per.length].pop()!)
  return qs.sort((a, b) => a.level - b.level)
}

/** Five questions seeded by the date, from the levels the player has reached. */
function dailyQuestions(): Question[] {
  const rnd = seeded('daily-' + todayStr())
  const pool: Question[] = []
  for (const m of MODULES) {
    const nl = nextLesson(m.id)
    const maxL = nl ? nl.level : LEVELS
    for (let l = Math.max(1, maxL - 1); l <= maxL; l++) pool.push(...bank[m.id].byLevel[l - 1])
  }
  const started = MODULES.filter((m) => modStats(m.id).done > 0).map((m) => m.id)
  const favored =
    started.length > 0
      ? pool.filter((q) => started.includes(q.module))
      : pool.filter((q) => q.level === 1)
  return shuffle(favored.length >= 5 ? favored : pool, rnd).slice(0, 5)
}

/** Handlers for `[data-act]` controls. */
export const ACTIONS: Record<string, (data: ActionData) => void> = {
  start({ mod, level, lesson }) {
    startLesson(mod!, Number(level), Number(lesson))
  },
  locked({ mod, level }) {
    const L = Number(level)
    toast(
      levelUnlocked(mod!, L)
        ? 'Finish the lesson before this one to unlock it.'
        : `Finish level ${L - 1} first, or use "Jump here" to test out.`,
    )
  },
  jump({ mod, level }) {
    const L = Number(level)
    openModal(`<div class="mh"><h2>Jump to level ${L}?</h2><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
      <p>Answer <b>8 of 10</b> questions from ${L === 2 ? 'level 1' : `levels 1 to ${L - 1}`} correctly, and every level before ${L} opens up.</p>
      <p class="muted">No pressure: if it does not go your way, nothing is lost and you keep all your progress.</p>
      <button class="btn primary wide" data-act="jumpgo" data-mod="${mod}" data-level="${L}" autofocus>${icon('rocket')}Start the test</button>`)
  },
  jumpgo({ mod, level }) {
    closeModal()
    startSession('jump', jumpQuestions(mod!, Number(level)), { mod, level: Number(level) })
  },
  practice({ mod, level }) {
    const qs = shuffle(bank[mod!].byLevel[Number(level) - 1]).slice(0, Q_PER_LESSON)
    startSession('practice', qs, { mod, level: Number(level) })
  },
  daily() {
    startSession('daily', dailyQuestions(), {})
  },
  review() {
    const qs = shuffle(mistakes())
      .slice(0, Q_PER_LESSON)
      .map((id) => qById(id)!)
    if (qs.length > 0) startSession('review', qs, {})
  },
  settings() {
    openSettings()
  },
  close() {
    closeModal()
  },
}
