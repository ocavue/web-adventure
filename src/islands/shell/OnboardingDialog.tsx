import * as stylex from '@stylexjs/stylex'
import { useId, useRef, useState } from 'preact/hooks'

import { Buddy } from '../../components/ui/Bit.tsx'
import { Blaze } from '../../components/ui/Blaze.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog, DialogActions } from '../../components/ui/Dialog.tsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.tsx'
import { MODULES } from '../../lib/constants.ts'
import { updateProgress } from '../../lib/store.ts'
import type { ModuleId, State } from '../../lib/types.ts'
import { focus, text } from '../../styles/shared.ts'
import { moduleThemes } from '../../styles/themes.ts'
import { accent, colors } from '../../styles/tokens.stylex.ts'

import { form } from './form.styles.ts'
import { GOAL_OPTIONS } from './goals.tsx'

const SHORT = '@media (max-height: 760px)'

const styles = stylex.create({
  body: { gap: 12 },
  intro: { color: colors.ink2, display: { default: null, [SHORT]: 'none' } },
  hint: { fontWeight: 400, color: colors.ink2 },
  trails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 6,
  },
  trail: {
    appearance: 'none',
    borderWidth: 0,
    cursor: 'pointer',
    display: 'grid',
    justifyItems: 'center',
    gap: 4,
    paddingBlock: 8,
    paddingInline: 2,
    borderRadius: 12,
    backgroundColor: colors.paper,
    boxShadow: `inset 0 0 0 2px ${colors.line}`,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  trailOn: {
    boxShadow: `inset 0 0 0 2.5px ${accent.color}`,
    backgroundColor: `color-mix(in srgb, ${accent.color} 10%, ${colors.paper})`,
  },
  look: { justifySelf: 'center' },
})

function finish(name: string, goal: number): void {
  updateProgress((d) => {
    d.name = name.trim().slice(0, 24)
    d.goal = goal
    d.onboarded = true
  })
}

function OnboardingForm({ titleId }: { titleId: string }) {
  const [goal, setGoal] = useState(80)
  const [first, setFirst] = useState<ModuleId>('html')
  const nameRef = useRef<HTMLInputElement>(null)
  // On touch screens, focusing the field would pop up the keyboard over the welcome text.
  const [autoFocus] = useState(() => !matchMedia('(pointer: coarse)').matches)
  const goalId = useId()
  const trailId = useId()
  return (
    <>
      <Buddy>Hi! I am Bit, your trail buddy. I will cheer you on.</Buddy>
      <h2 id={titleId} {...stylex.props(text.display, text.h2)}>
        Welcome to Byte Trail
      </h2>
      <p {...stylex.props(styles.intro)}>
        Short, friendly lessons on HTML, CSS, JavaScript, TypeScript, the web platform, React, and
        Git. Wrong answers never cost you anything here.
      </p>
      <div {...stylex.props(form.field)}>
        <label for="onm" {...stylex.props(form.label)}>
          What should we call you?
        </label>
        <input
          ref={nameRef}
          id="onm"
          maxLength={24}
          placeholder="Your trail name"
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              document.getElementById('obgo')?.focus()
            }
          }}
          {...stylex.props(form.input)}
        />
      </div>
      <div {...stylex.props(form.field)}>
        <span id={goalId} {...stylex.props(form.label)}>
          Daily goal
        </span>
        <SegmentedControl
          labelledBy={goalId}
          options={GOAL_OPTIONS}
          value={goal}
          onChange={setGoal}
        />
        <p {...stylex.props(form.note)}>Steady is about one lesson a day.</p>
      </div>
      <div {...stylex.props(form.field)}>
        <span id={trailId} {...stylex.props(form.label)}>
          Where do you want to start?{' '}
          <span {...stylex.props(styles.hint)}>(HTML is the classic first step)</span>
        </span>
        <div role="group" aria-labelledby={trailId} {...stylex.props(styles.trails)}>
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === first}
              onClick={() => setFirst(m.id)}
              {...stylex.props(
                moduleThemes[m.id],
                styles.trail,
                focus.ring,
                m.id === first && styles.trailOn,
              )}
            >
              <Blaze glyph={m.glyph} size="xs" mod={m.id} />
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <DialogActions>
        <Button
          id="obgo"
          variant="primary"
          wide
          icon="play"
          onClick={() => {
            finish(nameRef.current?.value ?? '', goal)
            location.assign(`/play?mode=lesson&mod=${first}&level=1&lesson=0`)
          }}
        >
          Start my first lesson
        </Button>
        <Button
          id="oblook"
          variant="ghost"
          size="small"
          xstyle={styles.look}
          onClick={() => finish(nameRef.current?.value ?? '', goal)}
        >
          Look around first
        </Button>
      </DialogActions>
    </>
  )
}

/** The welcome dialog for a new player. It cannot be dismissed: both buttons finish it. */
export function OnboardingDialog({ state, ready }: { state: State; ready: boolean }) {
  const titleId = useId()
  return (
    <Dialog
      open={ready && !state.onboarded}
      onClose={() => {}}
      dismissible={false}
      labelledBy={titleId}
      xstyle={styles.body}
    >
      <OnboardingForm titleId={titleId} />
    </Dialog>
  )
}
