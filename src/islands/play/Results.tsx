import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'preact/hooks'

import { Badge } from '../../components/ui/Badge.tsx'
import { Buddy } from '../../components/ui/Bit.tsx'
import { Blaze } from '../../components/ui/Blaze.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Icon } from '../../components/ui/Icon.tsx'
import { ProgressBar } from '../../components/ui/ProgressBar.tsx'
import { Rich } from '../../components/ui/Rich.tsx'
import { Stars } from '../../components/ui/Stars.tsx'
import { announce } from '../../lib/announce.ts'
import { correctText } from '../../lib/answer.ts'
import { confetti } from '../../lib/confetti.ts'
import { BADGES, MOD } from '../../lib/constants.ts'
import { useProgress } from '../../lib/hooks.ts'
import type { LessonResult } from '../../lib/lesson.ts'
import { dailyXp, rankOf } from '../../lib/progress.ts'
import { findQuestion } from '../../lib/selection.ts'
import { sfx } from '../../lib/sound.ts'
import { progress } from '../../lib/store.ts'
import { useApplySettings } from '../../lib/theme.ts'
import type { State } from '../../lib/types.ts'
import { fmt } from '../../lib/utils.ts'
import { focus, layout, surface, text } from '../../styles/shared.ts'
import { moduleThemes } from '../../styles/themes.ts'
import { accent, colors, fonts, radii } from '../../styles/tokens.stylex.ts'
import { SettingsDialog } from '../shell/SettingsDialog.tsx'
import { TopBar } from '../shell/TopBar.tsx'

import type { TrailLevels } from './navigation.ts'
import { confettiPower, resultCopy } from './results-copy.ts'

const starIn = stylex.keyframes({
  from: { transform: 'scale(0) rotate(-40deg)' },
  to: { transform: 'none' },
})

const styles = stylex.create({
  page: { position: 'relative', zIndex: 1 },
  results: {
    maxWidth: 620,
    marginInline: 'auto',
    paddingTop: 36,
    paddingBottom: 60,
    display: 'grid',
    gap: 20,
    justifyItems: 'center',
    textAlign: 'center',
  },
  title: { outline: 'none' },
  buddy: { textAlign: 'left', justifySelf: 'stretch' },
  summit: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 4,
    animationName: starIn,
    animationDuration: '0.6s',
    animationTimingFunction: 'cubic-bezier(0.3, 1.7, 0.5, 1)',
    animationFillMode: 'both',
  },
  summitBlaze: { width: 84, height: 100, fontSize: 22, borderRadius: 14 },
  summitFlag: { width: 56, height: 56, color: accent.color },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
    width: '100%',
  },
  stat: {
    backgroundColor: colors.paper2,
    borderRadius: radii.m,
    paddingBlock: 12,
    paddingInline: 10,
    boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
    display: 'grid',
    gap: 2,
  },
  statValue: { fontFamily: fonts.display, fontSize: 26, fontVariantNumeric: 'tabular-nums' },
  statLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  actions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap-reverse',
    justifyContent: 'center',
    width: '100%',
  },
  action: { flexGrow: '1', flexShrink: '1', flexBasis: '200px' },
  rank: { width: '100%', display: 'grid', gap: 6, textAlign: 'left' },
  rankRow: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 },
  celebrate: {
    width: '100%',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    textAlign: 'left',
  },
  celebrateIcon: { width: 28, height: 28, color: colors.good },
  best: { color: colors.ink2 },
  bestIcon: {
    display: 'inline-block',
    width: 16,
    height: 16,
    verticalAlign: '-3px',
    color: colors.flame,
  },
  badges: { width: '100%' },
  eyebrow: { marginBottom: 12 },
  badgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 150px))',
    justifyContent: 'center',
    rowGap: '18px',
    columnGap: '10px',
  },
  details: { width: '100%', textAlign: 'left' },
  summary: {
    listStyle: 'none',
    cursor: 'pointer',
    display: 'flex',
    width: 'fit-content',
    marginInline: 'auto',
    alignItems: 'center',
    minHeight: 38,
    paddingBlock: 8,
    paddingInline: 14,
    borderRadius: 11,
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: 14,
    color: { default: colors.ink2, ':hover': colors.ink },
    backgroundColor: { default: 'transparent', ':hover': colors.paper3 },
  },
  list: { display: 'grid', gap: 10, marginTop: 12 },
  item: {
    backgroundColor: colors.paper2,
    borderRadius: radii.m,
    padding: 14,
    display: 'grid',
    gap: 6,
    fontSize: 15,
  },
  itemOk: { boxShadow: `inset 4px 0 0 ${colors.good}, inset 0 0 0 1.5px ${colors.line}` },
  itemMiss: { boxShadow: `inset 4px 0 0 ${colors.bad}, inset 0 0 0 1.5px ${colors.line}` },
  itemHead: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  itemIcon: { flexShrink: 0, width: 20, height: 20, marginTop: 2 },
  itemIconOk: { color: colors.good },
  itemIconMiss: { color: colors.bad },
  itemPrompt: { fontWeight: 700 },
})

function formatTime(total: number): string {
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return mins ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`
}

function RankProgress({ result, state }: { result: LessonResult; state: State }) {
  const before = rankOf(result.xpBefore)
  const now = rankOf(state.xp)
  const up = now.index > before.index
  const span = now.next ? now.next - now.min : 1
  const from = up ? 0 : now.next ? (result.xpBefore - now.min) / span : 1
  const to = now.next ? (state.xp - now.min) / span : 1
  const [fill, setFill] = useState(from)
  // Two frames, so the bar paints at `from` before it grows to `to`.
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setFill(to))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [to])
  return (
    <div {...stylex.props(styles.rank)}>
      {up && (
        <div {...stylex.props(surface.panel, styles.celebrate)}>
          <Icon name="crown" xstyle={styles.celebrateIcon} />
          <div>
            <b>New rank: {now.name}!</b> You are moving up the mountain.
          </div>
        </div>
      )}
      <div {...stylex.props(styles.rankRow)}>
        <b>{now.name}</b>
        <span {...stylex.props(text.muted)}>
          {now.next ? `${fmt(now.next - state.xp)} XP to ${now.nextName ?? ''}` : 'Top rank!'}
        </span>
      </div>
      <ProgressBar
        value={fill}
        color={colors.blaze}
        label={`Progress to ${now.nextName ?? 'the top rank'}`}
      />
    </div>
  )
}

function AnswerList({ result }: { result: LessonResult }) {
  const firstTries = new Map<string, boolean>()
  for (const x of result.results) if (!firstTries.has(x.id)) firstTries.set(x.id, x.ok)
  return (
    <div {...stylex.props(styles.list)}>
      {[...firstTries].map(([id, ok]) => {
        const q = findQuestion(id)
        if (!q) return null
        return (
          <div key={id} {...stylex.props(styles.item, ok ? styles.itemOk : styles.itemMiss)}>
            <div {...stylex.props(styles.itemHead)}>
              <Icon
                name={ok ? 'check' : 'x'}
                xstyle={[styles.itemIcon, ok ? styles.itemIconOk : styles.itemIconMiss]}
              />
              <div {...stylex.props(styles.itemPrompt)}>
                <span {...stylex.props(layout.srOnly)}>{ok ? 'Correct: ' : 'Missed: '}</span>
                <Rich text={q.prompt} />
              </div>
            </div>
            <div>
              <span {...stylex.props(text.muted)}>Answer:</span> <Rich text={correctText(q)} />
            </div>
            <div {...stylex.props(text.muted)}>
              <Rich text={q.explain} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface ResultsProps {
  result: LessonResult
  levels: TrailLevels
  /** Shown again after a reload or Back / Forward: no confetti or fanfare this time. */
  restored?: boolean
}

/** The results screen after a finished session. */
export function Results({ result: r, levels, restored = false }: ResultsProps) {
  const state = useProgress()
  const [copy] = useState(() => resultCopy(r, progress.peek(), levels))
  const titleRef = useRef<HTMLHeadingElement>(null)
  const mod = r.meta.mod
  const m = mod ? MOD[mod] : null

  // The top bar's settings dialog can change the theme here, as in the app shell.
  useApplySettings()

  useEffect(() => {
    window.scrollTo({ top: 0 })
    titleRef.current?.focus({ preventScroll: true })
    document.title = `${copy.title} · Byte Trail`
    announce(`${copy.title} ${copy.line}`)
    if (restored) return
    const power = confettiPower(r)
    const rankUp = rankOf(r.xpBefore).index < rankOf(progress.peek().xp).index
    const fanfare = r.newBadges.length > 0 || !!r.campCleared || !!r.summit || rankUp
    const confettiTimer = setTimeout(() => {
      if (power) void confetti(power)
    }, 250)
    const soundTimer = setTimeout(() => {
      if (fanfare) sfx('badge')
    }, 700)
    return () => {
      clearTimeout(confettiTimer)
      clearTimeout(soundTimer)
    }
  }, [r, copy, restored])

  const newBadges = BADGES.filter((b) => r.newBadges.includes(b.id))

  return (
    <div {...stylex.props(styles.page, mod && moduleThemes[mod])}>
      <TopBar state={state} />
      <SettingsDialog />
      <main {...stylex.props(layout.wrap)}>
        <div {...stylex.props(styles.results)}>
          {copy.extra === 'stars' && <Stars count={r.stars ?? 1} size="big" />}
          {copy.extra === 'summit' && m && (
            <div {...stylex.props(styles.summit)}>
              <Blaze glyph={m.glyph} mod={m.id} xstyle={styles.summitBlaze} />
              <Icon name="flag" xstyle={styles.summitFlag} />
            </div>
          )}
          <h1
            id="restitle"
            ref={titleRef}
            tabIndex={-1}
            {...stylex.props(text.display, text.h1, styles.title)}
          >
            {copy.title}
          </h1>
          <Buddy mood={copy.mood} xstyle={styles.buddy}>
            {copy.line}
          </Buddy>
          <div {...stylex.props(styles.stats)}>
            <div {...stylex.props(styles.stat)}>
              <b {...stylex.props(styles.statValue)}>+{r.xp}</b>
              <span {...stylex.props(styles.statLabel)}>XP earned</span>
            </div>
            {r.kind === 'jump' ? (
              <div {...stylex.props(styles.stat)}>
                <b {...stylex.props(styles.statValue)}>
                  {r.firstOk}
                  <span aria-hidden="true">/</span>
                  <span {...stylex.props(layout.srOnly)}> of </span>
                  {r.firstTotal}
                </b>
                <span {...stylex.props(styles.statLabel)}>Right</span>
              </div>
            ) : (
              <div {...stylex.props(styles.stat)}>
                <b {...stylex.props(styles.statValue)}>{Math.round(r.acc * 100)}%</b>
                <span {...stylex.props(styles.statLabel)}>First try</span>
              </div>
            )}
            <div {...stylex.props(styles.stat)}>
              <b {...stylex.props(styles.statValue)}>{formatTime(r.secs)}</b>
              <span {...stylex.props(styles.statLabel)}>Time</span>
            </div>
          </div>
          <div {...stylex.props(styles.actions)}>
            {copy.secondary && (
              <Button href={copy.secondary.href} icon={copy.secondary.icon} xstyle={styles.action}>
                {copy.secondary.label}
              </Button>
            )}
            <Button
              href={copy.primary.href}
              icon={copy.primary.icon}
              variant="primary"
              xstyle={styles.action}
            >
              {copy.primary.label}
            </Button>
          </div>
          <RankProgress result={r} state={state} />
          {r.goalHit && (
            <div {...stylex.props(surface.panel, styles.celebrate)}>
              <Icon name="check" xstyle={styles.celebrateIcon} />
              <div>
                <b>Daily goal reached!</b> {dailyXp(state)} XP today (your goal is {state.goal})
                {r.streak > 0 && `, and your streak is ${r.streak} day${r.streak === 1 ? '' : 's'}`}
                .
              </div>
            </div>
          )}
          {r.freezeEarned && (
            <div {...stylex.props(surface.panel, styles.celebrate)}>
              <Icon name="gem" xstyle={styles.celebrateIcon} />
              <div>
                <b>Streak freeze earned!</b> It will protect your streak if you miss a day.
              </div>
            </div>
          )}
          {r.bestCombo >= 3 && (
            <p {...stylex.props(styles.best)}>
              <Icon name="flame" xstyle={styles.bestIcon} /> Best streak this round:{' '}
              <b>{r.bestCombo}</b> in a row
            </p>
          )}
          {newBadges.length > 0 && (
            <div {...stylex.props(surface.panel, styles.badges)}>
              <div {...stylex.props(text.eyebrow, styles.eyebrow)}>
                New badge{newBadges.length > 1 ? 's' : ''}
              </div>
              <div {...stylex.props(styles.badgeGrid)}>
                {newBadges.map((b) => (
                  <Badge key={b.id} badge={b} got />
                ))}
              </div>
            </div>
          )}
          <details {...stylex.props(styles.details)}>
            <summary {...stylex.props(styles.summary, focus.ring)}>See every answer</summary>
            <AnswerList result={r} />
          </details>
        </div>
      </main>
    </div>
  )
}
