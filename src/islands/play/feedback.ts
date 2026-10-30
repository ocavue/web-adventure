import type { Mood } from '../../components/ui/Bit.tsx'
import { COMBO_PRAISE, PRAISE, SOFT, SOFT_TAIL } from '../../lib/constants.ts'
import type { LastAnswer } from '../../lib/lesson.ts'
import { pick } from '../../lib/utils.ts'

/** The words of the feedback dock. Picked once per answer, so they do not change on re-render. */
export interface FeedbackWords {
  head: string
  /** Shown under a wrong answer. */
  tail: string | null
  mood: Mood
}

export function feedbackWords(last: LastAnswer, combo: number, requeues: boolean): FeedbackWords {
  if (last.ok) {
    const comboPraise = COMBO_PRAISE[combo] as string | undefined
    return { head: comboPraise ?? pick(PRAISE), tail: null, mood: comboPraise ? 'wow' : 'happy' }
  }
  return {
    head: last.caseSlip ? 'So close! Check the capital letters.' : pick(SOFT),
    tail: requeues ? pick(SOFT_TAIL) : 'Read the explanation. It sticks better than you think.',
    mood: 'calm',
  }
}
