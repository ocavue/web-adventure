import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'preact/hooks'

import { Icon } from '../../components/ui/Icon.tsx'
import { IconButton } from '../../components/ui/IconButton.tsx'
import { ProgressBar } from '../../components/ui/ProgressBar.tsx'
import { Rich } from '../../components/ui/Rich.tsx'
import { Tag } from '../../components/ui/Tag.tsx'
import { announce } from '../../lib/announce.ts'
import { correctText } from '../../lib/answer.ts'
import { MOD } from '../../lib/constants.ts'
import type { LessonResult, Session } from '../../lib/lesson.ts'
import { activeModal } from '../../lib/modal.ts'
import { sfx } from '../../lib/sound.ts'
import { progress } from '../../lib/store.ts'
import { reducedMotion } from '../../lib/theme.ts'
import { toastAfterNavigation } from '../../lib/toast.ts'
import type { Question } from '../../lib/types.ts'
import { moduleThemes } from '../../styles/themes.ts'
import { colors, fonts, radii } from '../../styles/tokens.stylex.ts'

import { Answers } from './Answers.tsx'
import { Dock } from './Dock.tsx'
import { feedbackWords, type FeedbackWords } from './feedback.ts'
import { exitHref } from './navigation.ts'
import { QuitDialog } from './QuitDialog.tsx'
import { ReportDialog } from './ReportDialog.tsx'

const pop = stylex.keyframes({
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.35)' },
  '100%': { transform: 'scale(1)' },
})

const gutter = {
  paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
} as const

const styles = stylex.create({
  lesson: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  top: {
    ...gutter,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 14,
    maxWidth: 760,
    marginInline: 'auto',
    width: '100%',
    position: 'sticky',
    top: 'env(safe-area-inset-top, 0px)',
    backgroundColor: colors.paper,
    zIndex: 5,
  },
  bar: { flex: '1', height: 16 },
  barFill: {
    position: 'relative',
    '::after': {
      content: "''",
      position: 'absolute',
      left: 8,
      right: 8,
      top: 3,
      height: 4,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
  },
  combo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    fontFamily: fonts.display,
    fontWeight: 800,
    color: colors.flame,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 52,
  },
  cold: { visibility: 'hidden' },
  pop: {
    animationName: pop,
    animationDuration: '0.35s',
    animationTimingFunction: 'cubic-bezier(0.3, 1.8, 0.5, 1)',
  },
  comboIcon: { width: 20, height: 20 },
  area: {
    ...gutter,
    flex: '1',
    maxWidth: 760,
    marginInline: 'auto',
    width: '100%',
    paddingTop: 8,
    display: 'grid',
    gap: 18,
    alignContent: 'start',
  },
  areaPad: (px: number) => ({ paddingBottom: px }),
  meta: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  title: { marginLeft: 'auto' },
  prompt: {
    scrollMarginTop: 80,
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: 'clamp(20px, 3.2vw, 25px)',
    lineHeight: 1.3,
    textWrap: 'pretty',
    outline: 'none',
  },
  sub: { fontSize: 14, color: colors.ink2, marginTop: -10 },
  code: {
    margin: 0,
    backgroundColor: colors.codeBg,
    borderRadius: radii.m,
    paddingBlock: 14,
    paddingInline: 16,
    overflowX: 'auto',
    fontFamily: fonts.mono,
    fontSize: 14.5,
    lineHeight: 1.6,
    boxShadow: {
      default: `inset 0 0 0 1.5px ${colors.line}`,
      ':focus-visible': `inset 0 0 0 2.5px ${colors.focus}`,
    },
    outline: 'none',
    tabSize: 2,
  },
  codeInner: { fontFamily: 'inherit', fontSize: 'inherit', whiteSpace: 'pre' },
  hint: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.blazeSoft,
    paddingBlock: 12,
    paddingInline: 14,
    borderRadius: radii.m,
    fontSize: 15,
    outline: 'none',
  },
  hintIcon: { color: `color-mix(in srgb, ${colors.blaze} 70%, ${colors.ink})` },
})

/** The inner HTML of the `<code>` in Shiki output, so the page can wrap it in its own `<pre>`. */
function codeInner(html: string): string {
  return /<code[^>]*>([\s\S]*)<\/code>/.exec(html)?.[1] ?? html
}

function plain(text: string): string {
  return text.replaceAll('`', '')
}

function subLine(q: Question): string | null {
  if (q.type === 'multi' && !/select all/i.test(q.prompt)) return 'Select all that apply.'
  if (q.type === 'fill') return 'Type your answer.'
  return null
}

function choiceValue(el: HTMLElement): number | boolean | null {
  if (el.dataset.tf !== undefined) return el.dataset.tf === 'true'
  if (el.dataset.ci !== undefined) return Number(el.dataset.ci)
  return null
}

export interface LessonProps {
  session: Session
  /** Called once the last question is answered and the player continues. */
  onFinish: (result: LessonResult) => void
  /** Leaves the page. */
  onLeave: (href: string) => void
}

/** The lesson screen: one question at a time, with the dock at the bottom. */
export function Lesson({ session, onFinish, onLeave }: LessonProps) {
  const st = session.state.value
  const current = session.current.value
  const settings = progress.value.settings
  const motion = !reducedMotion(settings)

  const [quitOpen, setQuitOpen] = useState(false)
  const [reporting, setReporting] = useState<Question | null>(null)
  const [words, setWords] = useState<FeedbackWords | null>(() => {
    const s = session.state.peek()
    return s.answered && s.last ? feedbackWords(s.last, s.combo, session.requeues) : null
  })
  const [dockHeight, setDockHeight] = useState(0)
  const dockRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLHeadingElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const answersRef = useRef<HTMLDivElement>(null)

  const check = () => {
    const q = session.current.peek()?.question
    const last = session.check()
    if (!q || !last) return
    setWords(feedbackWords(last, session.state.peek().combo, session.requeues))
    sfx(last.ok ? 'good' : 'bad')
    announce(last.ok ? 'Correct.' : `Not quite. The correct answer is ${plain(correctText(q))}.`)
  }

  const next = () => {
    if (!session.state.peek().answered) return
    setWords(null)
    if (session.next()) {
      sfx('done')
      const result = session.result.peek()
      if (result) onFinish(result)
      return
    }
    window.scrollTo({ top: 0 })
  }

  const leave = () => {
    const badges = session.quit()
    toastAfterNavigation(...badges.map((badge) => ({ badge })))
    onLeave(exitHref(session.request))
  }

  const askQuit = () => {
    if (session.state.peek().results.length === 0) leave()
    else setQuitOpen(true)
  }

  // Keyboard shortcuts: 1-4, T / F, H, and Enter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (activeModal.peek()) return
      const cur = session.current.peek()
      if (!cur) return
      const s = session.state.peek()
      const target = e.target instanceof Element ? e.target : document.body
      if (e.key === 'Enter') {
        if (
          target.closest('button, a, summary') &&
          !target.closest('[data-ci], [data-tf], [data-lact]')
        ) {
          return
        }
        e.preventDefault()
        if (e.repeat) return
        const choice = target.closest<HTMLElement>('[data-ci], [data-tf]')
        const value = choice && choiceValue(choice)
        if (value !== null && !s.answered) {
          if (cur.question.type === 'multi' && typeof value === 'number') {
            sfx('tap')
            session.toggleChoice(value)
            return
          }
          session.select(value)
        }
        if (s.answered) next()
        else check()
        return
      }
      if (s.answered || target.matches('input, textarea')) return
      if (session.selectByKey(e.key)) {
        e.preventDefault()
        if (e.key.toLowerCase() !== 'h') sfx('tap')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // A new question: focus its prompt, or the input of a fill question.
  useEffect(() => {
    if (session.current.peek()?.question.type === 'fill') {
      const timer = setTimeout(() => document.getElementById('fill')?.focus(), 50)
      return () => clearTimeout(timer)
    }
    promptRef.current?.focus({ preventScroll: true })
  }, [session, st.idx])

  // After a wrong answer, bring the right choice into view.
  const missed = st.answered && st.last?.ok === false
  useEffect(() => {
    if (!missed) return
    const timer = setTimeout(() => {
      answersRef.current
        ?.querySelector('[data-mark="missed"], [data-mark="correct"]')
        ?.scrollIntoView({ block: 'nearest', behavior: motion ? 'smooth' : 'auto' })
    }, 60)
    return () => clearTimeout(timer)
  }, [missed, motion])

  // An opened hint takes the focus only when nothing else has it.
  const hintVisible = session.hintVisible.value
  useEffect(() => {
    if (!hintVisible) return
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) {
      hintRef.current?.focus({ preventScroll: true })
    }
  }, [hintVisible])

  // Keeps the question clear of the fixed dock.
  useEffect(() => {
    const dock = dockRef.current
    if (!dock) return
    const observer = new ResizeObserver(() => setDockHeight(dock.offsetHeight))
    observer.observe(dock)
    return () => observer.disconnect()
  }, [])

  if (!current) return null
  const q = current.question
  const sub = subLine(q)
  const combo = st.combo
  const popNow = motion && st.answered && st.last?.ok === true

  return (
    <div {...stylex.props(styles.lesson, moduleThemes[q.module])}>
      <div {...stylex.props(styles.top)}>
        <IconButton icon="x" label="Quit lesson" onClick={askQuit} />
        <ProgressBar
          value={session.progress.value}
          label="Lesson progress"
          xstyle={styles.bar}
          fillXstyle={styles.barFill}
        />
        <span
          key={st.results.length}
          title="Correct in a row"
          aria-label={`${combo} correct in a row`}
          {...stylex.props(styles.combo, combo < 2 && styles.cold, popNow && styles.pop)}
        >
          <Icon name="flame" xstyle={styles.comboIcon} />
          {combo}
        </span>
      </div>
      <main
        id="qarea"
        {...stylex.props(styles.area, styles.areaPad(dockHeight ? dockHeight + 28 : 220))}
      >
        <div {...stylex.props(styles.meta)}>
          <Tag tone="accent">{MOD[q.module].name}</Tag>
          <Tag>{q.topic}</Tag>
          {current.retry ? (
            <Tag tone="retry" icon="repeat">
              Second try
            </Tag>
          ) : (
            current.missedBefore && (
              <Tag tone="retry" icon="repeat">
                Second chance: you missed this before
              </Tag>
            )
          )}
          <Tag tone="plain" xstyle={styles.title}>
            {session.title}
          </Tag>
        </div>
        <h1
          id="qprompt"
          key={st.idx}
          ref={promptRef}
          tabIndex={-1}
          {...stylex.props(styles.prompt)}
        >
          <Rich text={q.prompt} />
        </h1>
        {sub && <p {...stylex.props(styles.sub)}>{sub}</p>}
        {q.codeHtml && (
          <pre
            tabIndex={0}
            aria-label="Code example"
            // `shiki` turns on the theme colors in `global.css`.
            class={`shiki ${stylex.props(styles.code).className ?? ''}`}
          >
            <code
              {...stylex.props(styles.codeInner)}
              // Shiki HTML built from the question bank at build time, never user input.
              // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
              dangerouslySetInnerHTML={{ __html: codeInner(q.codeHtml) }}
            />
          </pre>
        )}
        <div ref={answersRef} key={st.idx}>
          <Answers
            session={session}
            current={current}
            selection={st.selection}
            answered={st.answered}
            ok={st.last?.ok ?? false}
          />
        </div>
        <div aria-live="polite">
          {hintVisible && (
            <div ref={hintRef} tabIndex={-1} {...stylex.props(styles.hint)}>
              <Icon name="bulb" xstyle={styles.hintIcon} />
              <div>
                <b>Hint:</b> <Rich text={q.hint} />
              </div>
            </div>
          )}
        </div>
      </main>
      <Dock
        session={session}
        question={q}
        answered={st.answered}
        last={st.last}
        words={words}
        canCheck={session.canCheck.value}
        canHint={session.canHint.value}
        motion={motion}
        dockRef={dockRef}
        onCheck={check}
        onNext={next}
        onReport={() => setReporting(q)}
      />
      <QuitDialog
        open={quitOpen}
        left={session.remaining.value}
        ahead={st.queue.length - st.idx}
        onStay={() => setQuitOpen(false)}
        onLeave={() => {
          setQuitOpen(false)
          leave()
        }}
      />
      <ReportDialog question={reporting} onClose={() => setReporting(null)} />
    </div>
  )
}
