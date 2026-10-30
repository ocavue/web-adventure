import * as stylex from '@stylexjs/stylex'
import type { Ref } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import { Bit } from '../../components/ui/Bit.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Rich } from '../../components/ui/Rich.tsx'
import { correctText } from '../../lib/answer.ts'
import type { LastAnswer, Session } from '../../lib/lesson.ts'
import type { Question } from '../../lib/types.ts'
import { focus } from '../../styles/shared.ts'
import { colors, fonts } from '../../styles/tokens.stylex.ts'

import type { FeedbackWords } from './feedback.ts'

const NARROW = '@media (max-width: 640px)'

const slideUp = stylex.keyframes({
  from: { transform: 'translateY(14px)', opacity: 0 },
  to: { transform: 'none', opacity: 1 },
})

const styles = stylex.create({
  dock: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: colors.paper,
    borderTopWidth: 2,
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
  },
  good: {
    backgroundColor: colors.goodBg,
    borderTopColor: `color-mix(in srgb, ${colors.good} 40%, ${colors.line})`,
  },
  bad: {
    backgroundColor: colors.badBg,
    borderTopColor: `color-mix(in srgb, ${colors.bad} 40%, ${colors.line})`,
  },
  inner: {
    maxWidth: 760,
    marginInline: 'auto',
    paddingBlock: 14,
    paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
    paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginLeft: 'auto',
    flex: { default: null, [NARROW]: '1' },
  },
  actionsAnswered: {
    width: { default: null, [NARROW]: '100%' },
    marginLeft: { default: 'auto', [NARROW]: 0 },
  },
  actionBtn: { flex: { default: null, [NARROW]: '1' } },
  kbd: { fontSize: 12, color: colors.ink3, display: { default: 'inline', [NARROW]: 'none' } },
  feedback: {
    flexGrow: '1',
    flexShrink: '1',
    flexBasis: '320px',
    minWidth: 0,
    display: 'grid',
    gap: 4,
    animationName: slideUp,
    animationDuration: '0.25s',
    animationTimingFunction: 'ease',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: 21,
    lineHeight: 1.2,
  },
  headGood: { color: colors.good },
  headBad: { color: colors.bad },
  xp: {
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: 14,
    backgroundColor: colors.good,
    color: colors.paper2,
    borderRadius: 99,
    paddingBlock: 2,
    paddingInline: 10,
    whiteSpace: 'nowrap',
  },
  body: {
    fontSize: 15,
    maxHeight: { default: '32vh', [NARROW]: '26vh' },
    overflowY: 'auto',
  },
  answer: { fontWeight: 700, marginBottom: 4 },
  tail: { color: colors.ink2, marginTop: 4, fontSize: 14 },
  flag: {
    appearance: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: 13,
    color: { default: colors.ink2, ':hover': colors.ink },
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    justifySelf: 'start',
  },
})

export interface DockProps {
  session: Session
  question: Question
  answered: boolean
  last: LastAnswer | null
  words: FeedbackWords | null
  canCheck: boolean
  canHint: boolean
  /** Plays Bit's bounce or wiggle. Off with reduced motion. */
  motion: boolean
  dockRef: Ref<HTMLDivElement>
  onCheck: () => void
  onNext: () => void
  onReport: () => void
}

/** The bar fixed to the bottom: hint and check, then the feedback and continue. */
export function Dock(props: DockProps) {
  const { last, words, answered, dockRef } = props
  const result = answered && last && words ? { last, words } : null
  return (
    <div
      ref={dockRef}
      {...stylex.props(styles.dock, result && (result.last.ok ? styles.good : styles.bad))}
    >
      <div {...stylex.props(styles.inner)}>
        {result ? (
          <Feedback {...props} last={result.last} words={result.words} />
        ) : (
          <Ask {...props} />
        )}
      </div>
    </div>
  )
}

function Ask({ session, question, canCheck, canHint, onCheck }: DockProps) {
  const hintTitle = session.requeues
    ? 'Press H. Hints are free. A correct answer after a hint earns 6 XP instead of 10.'
    : 'Press H. Hints are free here.'
  const keys =
    question.type === 'tf'
      ? 'Keys: T / F, Enter, H for hint'
      : question.type === 'fill'
        ? 'Enter to check'
        : 'Keys: 1-4, Enter, H for hint'
  return (
    <>
      <Button
        variant="ghost"
        icon="bulb"
        title={hintTitle}
        disabled={!canHint}
        onClick={() => session.showHint()}
      >
        Hint
      </Button>
      <span {...stylex.props(styles.kbd)}>{keys}</span>
      <div {...stylex.props(styles.actions)}>
        <Button
          variant="primary"
          data-lact="check"
          disabled={!canCheck}
          onClick={onCheck}
          xstyle={styles.actionBtn}
        >
          Check
        </Button>
      </div>
    </>
  )
}

function Feedback({
  question,
  motion,
  onNext,
  onReport,
  last,
  words,
}: DockProps & { last: LastAnswer; words: FeedbackWords }) {
  const actionsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    actionsRef.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [])
  return (
    <>
      <div {...stylex.props(styles.feedback)}>
        <div {...stylex.props(styles.head, last.ok ? styles.headGood : styles.headBad)}>
          <Bit
            mood={words.mood}
            size="small"
            motion={motion ? (last.ok ? 'bounce' : 'wiggle') : undefined}
          />
          <span>{words.head}</span>
          {last.xp > 0 && <span {...stylex.props(styles.xp)}>+{last.xp} XP</span>}
        </div>
        <div {...stylex.props(styles.body)}>
          {!last.ok && (
            <div {...stylex.props(styles.answer)}>
              Correct answer: <Rich text={correctText(question)} />
            </div>
          )}
          <div>
            <Rich text={question.explain} />
          </div>
          {words.tail && <div {...stylex.props(styles.tail)}>{words.tail}</div>}
        </div>
        <button type="button" onClick={onReport} {...stylex.props(styles.flag, focus.ring)}>
          Report a problem with this question
        </button>
      </div>
      <div ref={actionsRef} {...stylex.props(styles.actions, styles.actionsAnswered)}>
        <Button
          variant={last.ok ? 'good' : 'bad'}
          data-lact="next"
          onClick={onNext}
          xstyle={styles.actionBtn}
        >
          Continue
        </Button>
      </div>
    </>
  )
}
