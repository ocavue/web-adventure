import type { Mood } from '../../components/ui/Bit.tsx'
import type { IconName } from '../../components/ui/icons.ts'
import { CAMP_NAMES, ELEVATIONS, MOD, type ModuleInfo } from '../../lib/constants.ts'
import type { LessonResult } from '../../lib/lesson.ts'
import { lastPlayed, mistakes, nextLesson } from '../../lib/progress.ts'
import { playHref } from '../../lib/selection.ts'
import type { State } from '../../lib/types.ts'
import { fmt } from '../../lib/utils.ts'

import type { TrailLevels } from './navigation.ts'

interface ResultAction {
  label: string
  href: string
  icon?: IconName
}

export interface ResultCopy {
  title: string
  line: string
  mood: Mood
  primary: ResultAction
  secondary?: ResultAction
  /** The big mark above the title. */
  extra?: 'stars' | 'summit'
}

const home = (label = 'Back home'): ResultAction => ({ label, href: '/' })
function trail(m: ModuleInfo, label = 'Back to trail'): ResultAction {
  return {
    label,
    href: `/trail/${m.id}`,
  }
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function lessonCopy(r: LessonResult, m: ModuleInfo, s: State, levels: TrailLevels): ResultCopy {
  const stars = r.stars ?? 1
  let title = stars === 3 ? 'Perfect lesson!' : stars === 2 ? 'Great hike!' : 'You made it!'
  let line =
    stars === 3
      ? 'Every answer right on the first try. That is real skill.'
      : stars === 2
        ? r.firstTotal - r.firstOk === 1
          ? 'Strong work. One tricky one, and you fixed it before the end.'
          : 'Strong work. A few tricky ones, and you fixed them all before the end.'
        : `You finished it, and that is what counts. You fixed ${plural(r.fixed, 'question')} on the way. Replay it anytime for more stars.`
  let mood: Mood = 'happy'
  if (r.campCleared) {
    const next = levels[m.id].at(r.campCleared)
    title = `Level ${r.campCleared} cleared!`
    line = `You climbed to ${fmt(ELEVATIONS[r.campCleared])} m and earned a 25 XP camp bonus.`
    if (next) line += ` Next up: ${next.title}. ${next.blurb}`
    mood = 'wow'
  }
  if (r.summit) {
    title = 'Summit reached!'
    line = `You finished the whole ${m.name} trail and earned a 100 XP summit bonus. Take a moment to enjoy the view.`
    mood = 'wow'
  }
  const nl = nextLesson(m.id, s)
  const primary: ResultAction = r.summit
    ? { label: 'See your certificate', href: `/cert/${m.id}` }
    : nl
      ? { label: 'Next lesson', href: playHref({ mode: 'lesson', ...nl }), icon: 'play' }
      : trail(m)
  return {
    title,
    line,
    mood,
    primary,
    secondary: trail(m, 'Trail map'),
    extra: r.summit ? 'summit' : 'stars',
  }
}

function jumpCopy(r: LessonResult, m: ModuleInfo): ResultCopy {
  const level = r.meta.level ?? 2
  if (r.passed) {
    return {
      title: `Level ${level} unlocked!`,
      line: `${r.firstOk} of ${r.firstTotal} correct. You clearly know your stuff. Welcome to ${CAMP_NAMES[level - 1]}.`,
      mood: 'wow',
      primary: trail(m),
    }
  }
  const close = r.firstOk >= 6
  return {
    title: close ? `Almost there! ${r.firstOk}/${r.firstTotal}` : 'Good warm-up!',
    line: close
      ? 'You need 8 to jump, and you are close. Try again now, or take the lessons. They will go fast for you.'
      : 'You need 8 to jump. The earlier lessons will build exactly what this test checks, and you can retry the jump anytime.',
    mood: 'happy',
    primary: trail(m),
    secondary: {
      label: 'Try again',
      href: playHref({ mode: 'jump', mod: m.id, level }),
      icon: 'repeat',
    },
  }
}

function dailyCopy(r: LessonResult, s: State): ResultCopy {
  const mis = mistakes(s).length
  const last = lastPlayed(s)
  const nl = last && nextLesson(last, s)
  return {
    title: r.firstOk === r.firstTotal ? 'Daily challenge crushed!' : 'Daily challenge done!',
    line: `${r.firstOk} of ${r.firstTotal} on the first try. Tomorrow brings ${r.firstTotal} new questions${mis ? `, and you have ${plural(mis, 'review card')} waiting` : ''}.`,
    mood: 'happy',
    primary: nl
      ? {
          label: `Continue ${MOD[nl.mod].name}`,
          href: playHref({ mode: 'lesson', ...nl }),
          icon: 'play',
        }
      : home(),
    secondary: nl ? home() : undefined,
  }
}

function otherCopy(r: LessonResult, m: ModuleInfo | null): ResultCopy {
  const review = r.kind === 'review'
  return {
    title: review ? 'Review complete!' : 'Practice complete!',
    line: review
      ? 'Each question you fix here is one you truly understand now.'
      : 'Practice keeps the trail fresh. Nice work.',
    mood: 'happy',
    primary: !review && m ? trail(m) : home(),
  }
}

/** The title, Bit's line, and the actions of the results screen. Reads the progress after the session. */
export function resultCopy(r: LessonResult, s: State, levels: TrailLevels): ResultCopy {
  const m = r.meta.mod ? MOD[r.meta.mod] : null
  if (r.kind === 'lesson' && m) return lessonCopy(r, m, s, levels)
  if (r.kind === 'jump' && m) return jumpCopy(r, m)
  if (r.kind === 'daily') return dailyCopy(r, s)
  return otherCopy(r, m)
}

/** How much confetti a result deserves. */
export function confettiPower(r: LessonResult): number {
  if (r.kind === 'lesson') return r.summit ? 2 : r.campCleared ? 1.5 : r.stars === 3 ? 1.2 : 0.7
  if (r.passed) return 1
  return r.kind === 'daily' ? 0.8 : 0
}
