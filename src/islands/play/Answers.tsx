import * as stylex from '@stylexjs/stylex'

import { Icon } from '../../components/ui/Icon.tsx'
import { Rich } from '../../components/ui/Rich.tsx'
import type { Session, SessionQuestion } from '../../lib/lesson.ts'
import { sfx } from '../../lib/sound.ts'
import type { Selection } from '../../lib/types.ts'
import { focus, layout } from '../../styles/shared.ts'
import { accent, colors, fonts, radii } from '../../styles/tokens.stylex.ts'

/** How a choice looks: before the check, or after it. */
type Mark = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed' | 'dim'

const styles = stylex.create({
  list: { display: 'grid', gap: 10 },
  tfRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  choice: {
    appearance: 'none',
    borderWidth: 0,
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gap: 12,
    alignItems: 'center',
    paddingBlock: 14,
    paddingInline: 16,
    borderRadius: radii.m,
    color: colors.ink,
    backgroundColor: {
      default: colors.paper2,
      ':hover': `color-mix(in srgb, ${accent.color} 6%, ${colors.paper2})`,
    },
    boxShadow: {
      default: `inset 0 0 0 2px ${colors.line}, 0 4px 0 ${colors.line}`,
      ':active': `inset 0 0 0 2px ${colors.line}, 0 1px 0 ${colors.line}`,
    },
    transform: { default: null, ':active': 'translateY(3px)' },
    fontSize: 17,
    lineHeight: 1.4,
    transitionProperty: 'transform, box-shadow, background-color, opacity',
    transitionDuration: '0.08s, 0.12s, 0.12s, 0.2s',
  },
  tf: {
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    justifyItems: 'start',
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: 19,
    paddingBlock: 20,
  },
  locked: {
    cursor: 'default',
    transform: 'none',
    backgroundColor: colors.paper2,
    boxShadow: `inset 0 0 0 2px ${colors.line}, 0 4px 0 ${colors.line}`,
  },
  selected: {
    backgroundColor: `color-mix(in srgb, ${colors.focus} 10%, ${colors.paper2})`,
    boxShadow: `inset 0 0 0 2.5px ${colors.focus}, 0 4px 0 color-mix(in srgb, ${colors.focus} 45%, ${colors.line})`,
  },
  correct: {
    backgroundColor: colors.goodBg,
    boxShadow: `inset 0 0 0 2.5px ${colors.good}, 0 4px 0 color-mix(in srgb, ${colors.good} 50%, ${colors.line})`,
  },
  wrong: {
    backgroundColor: colors.badBg,
    boxShadow: `inset 0 0 0 2.5px ${colors.bad}, 0 4px 0 color-mix(in srgb, ${colors.bad} 45%, ${colors.line})`,
  },
  missed: {
    outline: `2.5px dashed ${colors.good}`,
    outlineOffset: '-2.5px',
  },
  dim: { opacity: 0.55 },
  key: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: 600,
    color: colors.ink3,
    boxShadow: `inset 0 0 0 2px ${colors.line}`,
  },
  keyMulti: { borderRadius: 7 },
  keyFilled: (color: string) => ({
    backgroundColor: color,
    color: colors.paper2,
    boxShadow: 'none',
  }),
  txt: { minWidth: 0, overflowWrap: 'anywhere' },
  mark: { width: 24, height: 24 },
  markIcon: { width: 24, height: 24 },
  fill: {
    fontFamily: fonts.mono,
    fontSize: 19,
    paddingBlock: 14,
    paddingInline: 16,
    borderRadius: radii.m,
    borderWidth: 0,
    backgroundColor: colors.paper2,
    color: colors.ink,
    outline: 'none',
    boxShadow: {
      default: `inset 0 0 0 2px ${colors.line}`,
      ':focus': `inset 0 0 0 2.5px ${colors.focus}`,
    },
    width: '100%',
    '::placeholder': { color: colors.ink3 },
  },
  fillCorrect: { backgroundColor: colors.goodBg, boxShadow: `inset 0 0 0 2.5px ${colors.good}` },
  fillWrong: { backgroundColor: colors.badBg, boxShadow: `inset 0 0 0 2.5px ${colors.bad}` },
})

function markOf(isAnswer: boolean, isSelected: boolean, answered: boolean, ok: boolean): Mark {
  if (!answered) return isSelected ? 'selected' : 'idle'
  if (isAnswer && isSelected) return 'correct'
  if (isSelected) return 'wrong'
  if (isAnswer) return ok ? 'correct' : 'missed'
  return 'dim'
}

const KEY_FILL: Partial<Record<Mark, string>> = {
  selected: colors.focus,
  correct: colors.good,
  wrong: colors.bad,
}

function choiceStyles(mark: Mark, answered: boolean) {
  return [
    styles.choice,
    focus.ring,
    answered && styles.locked,
    mark === 'selected' && styles.selected,
    mark === 'correct' && styles.correct,
    mark === 'wrong' && styles.wrong,
    mark === 'missed' && styles.missed,
    mark === 'dim' && styles.dim,
  ]
}

function keyStyles(mark: Mark, multi: boolean) {
  const filled = KEY_FILL[mark]
  return stylex.props(
    styles.key,
    multi && styles.keyMulti,
    filled !== undefined && styles.keyFilled(filled),
  )
}

export interface AnswersProps {
  session: Session
  current: SessionQuestion
  selection: Selection
  answered: boolean
  /** Whether the last check was right. Only read after the check. */
  ok: boolean
}

/** The answer area: choice buttons, a True/False row, or a text input. */
export function Answers({ session, current, selection, answered, ok }: AnswersProps) {
  const q = current.question

  if (q.type === 'tf') {
    return (
      <div role="radiogroup" aria-label="True or false" {...stylex.props(styles.tfRow)}>
        {[true, false].map((value) => {
          const mark = markOf(value === q.answer, selection === value, answered, ok)
          return (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={selection === value}
              data-tf={String(value)}
              data-mark={mark}
              disabled={answered}
              onClick={() => {
                sfx('tap')
                session.select(value)
              }}
              {...stylex.props(choiceStyles(mark, answered), styles.tf)}
            >
              <span {...keyStyles(mark, false)}>{value ? 'T' : 'F'}</span>
              <span>{value ? 'True' : 'False'}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === 'fill') {
    const value = typeof selection === 'string' ? selection : ''
    return (
      <div>
        <label for="fill" {...stylex.props(layout.srOnly)}>
          Your answer
        </label>
        <input
          id="fill"
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          placeholder="Type here..."
          value={value}
          readOnly={answered}
          aria-invalid={answered && !ok ? true : undefined}
          onInput={(e) => session.setFill(e.currentTarget.value)}
          {...stylex.props(styles.fill, answered && (ok ? styles.fillCorrect : styles.fillWrong))}
        />
      </div>
    )
  }

  const multi = q.type === 'multi'
  const picked = Array.isArray(selection) ? selection : []
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label="Answers" {...stylex.props(styles.list)}>
      {current.order.map((ci, pos) => {
        const isSelected = multi ? picked.includes(ci) : selection === ci
        const isAnswer = multi ? q.answer.includes(ci) : q.answer === ci
        const mark = markOf(isAnswer, isSelected, answered, ok)
        return (
          <button
            key={ci}
            type="button"
            role={multi ? undefined : 'radio'}
            aria-checked={multi ? undefined : isSelected}
            aria-pressed={multi ? isSelected : undefined}
            data-ci={ci}
            data-mark={mark}
            disabled={answered}
            onClick={() => {
              sfx('tap')
              session.toggleChoice(ci)
            }}
            {...stylex.props(choiceStyles(mark, answered))}
          >
            <span {...keyStyles(mark, multi)}>{pos + 1}</span>
            <span {...stylex.props(styles.txt)}>
              <Rich text={q.choices[ci]} />
            </span>
            <span {...stylex.props(styles.mark)}>
              {mark === 'correct' && isSelected && <Icon name="check" xstyle={styles.markIcon} />}
              {mark === 'wrong' && <Icon name="x" xstyle={styles.markIcon} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
