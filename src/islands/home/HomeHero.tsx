import * as stylex from '@stylexjs/stylex'
import { useState } from 'preact/hooks'

import { Buddy } from '../../components/ui/Bit.tsx'
import { Blaze } from '../../components/ui/Blaze.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Icon } from '../../components/ui/Icon.tsx'
import type { IconName } from '../../components/ui/icons.ts'
import { Medal } from '../../components/ui/Medal.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { ProgressBar } from '../../components/ui/ProgressBar.tsx'
import { BUDDY_LINES, LESSONS_PER_LEVEL, MOD } from '../../lib/constants.ts'
import { useProgress } from '../../lib/hooks.ts'
import { mistakes, rankOf } from '../../lib/progress.ts'
import { playHref } from '../../lib/selection.ts'
import { progressReady } from '../../lib/store.ts'
import type { ModuleId, State } from '../../lib/types.ts'
import { fmt, pick, todayStr } from '../../lib/utils.ts'
import { surface, text } from '../../styles/shared.ts'
import { colors, fonts } from '../../styles/tokens.stylex.ts'

import { buddyLine, continueTarget, greeting, hasStarted } from './rules.ts'

const NARROW = '@media (max-width: 760px)'

const styles = stylex.create({
  hero: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1.4fr) minmax(0, 1fr)',
      [NARROW]: 'minmax(0, 1fr)',
    },
    gap: 20,
    paddingTop: 28,
    paddingBottom: 8,
    alignItems: 'stretch',
  },
  main: { display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center' },
  title: { marginTop: 6 },
  side: { display: 'grid', gap: 12 },
  continue: { display: 'flex', alignItems: 'center', gap: 14 },
  meta: { minWidth: 0, flex: '1' },
  continueTitle: {
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: 18,
    lineHeight: 1.2,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  daily: {
    backgroundColor: colors.blazeSoft,
    boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${colors.blaze} 50%, ${colors.line})`,
  },
  row: { display: 'flex', alignItems: 'center', gap: 12 },
  grow: { flex: '1', minWidth: 0 },
  dailyMedal: { color: colors.blazeInk, boxShadow: 'none' },
  reviewMedal: { boxShadow: 'none' },
  rankHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  rankBar: { marginTop: 10 },
  note: { marginTop: 6 },
  freeze: { marginTop: 4 },
  gem: { display: 'inline-block', width: 22, height: 22, verticalAlign: '-5px' },
  how: {
    listStyle: 'none',
    padding: 0,
    marginTop: 10,
    display: 'grid',
    gap: 10,
    fontSize: 15,
  },
  howItem: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gap: 10,
    alignItems: 'start',
  },
  howIcon: { width: 20, height: 20, color: colors.web, marginTop: 1 },
})

export interface HomeHeroProps {
  /** Level titles of every trail, from the question banks. */
  titles: Record<ModuleId, string[]>
}

/** The top of the home page: greeting, Bit, the next lesson, the daily challenge, rank, and review. */
export function HomeHero({ titles }: HomeHeroProps) {
  const state = useProgress()
  // Picked once per page view, so the tip does not change on every render.
  const [tip] = useState(() => pick(BUDDY_LINES))
  const started = hasStarted(state)
  // The hour is only known in the browser. Until the stored progress loads, the page matches the
  // server-rendered HTML, which says a neutral hello.
  const hello = progressReady.value ? greeting() : 'Hello'
  return (
    <section {...stylex.props(styles.hero)}>
      <div {...stylex.props(styles.main)}>
        <div>
          <p {...stylex.props(text.eyebrow)}>
            {hello}, {state.name || 'hiker'}
          </p>
          <h1 {...stylex.props(text.display, text.h1, styles.title)}>
            {started ? 'Ready for a few more steps?' : 'Learn web dev one small step at a time.'}
          </h1>
        </div>
        <Buddy>{buddyLine(state, tip)}</Buddy>
        <ContinueCard state={state} started={started} titles={titles} />
      </div>
      <div {...stylex.props(styles.side)}>
        <DailyCard state={state} started={started} />
        {started ? <RankCard state={state} /> : <HowItWorks />}
        <ReviewCard state={state} />
      </div>
    </section>
  )
}

function ContinueCard({
  state,
  started,
  titles,
}: {
  state: State
  started: boolean
  titles: Record<ModuleId, string[]>
}) {
  const next = continueTarget(state)
  if (!next) return null
  const m = MOD[next.mod]
  return (
    <div {...stylex.props(surface.panel, surface.raised, styles.continue)}>
      <Blaze glyph={m.glyph} mod={m.id} />
      <div {...stylex.props(styles.meta)}>
        <p {...stylex.props(text.eyebrow)}>{started ? 'Continue' : 'Start here'}</p>
        <p {...stylex.props(styles.continueTitle)}>
          {m.name}: {titles[m.id][next.level - 1]}
        </p>
        <p {...stylex.props(text.muted, text.small)}>
          Level {next.level}, lesson {next.lesson + 1} of {LESSONS_PER_LEVEL}
        </p>
      </div>
      <Button
        variant="primary"
        icon="play"
        href={playHref({ mode: 'lesson', mod: next.mod, level: next.level, lesson: next.lesson })}
        aria-label={`Go: ${m.name} level ${next.level}, lesson ${next.lesson + 1}`}
      >
        Go
      </Button>
    </div>
  )
}

function DailyCard({ state, started }: { state: State; started: boolean }) {
  const done = Object.hasOwn(state.challenges, todayStr())
  return (
    <Panel as="section" labelledBy="daily-title" xstyle={styles.daily}>
      <div {...stylex.props(styles.row)}>
        <Medal icon="sun" color={colors.blaze} xstyle={styles.dailyMedal} />
        <div {...stylex.props(styles.grow)}>
          <h2 id="daily-title" {...stylex.props(text.display, text.h3)}>
            Daily challenge
          </h2>
          <p {...stylex.props(text.muted, text.small)}>
            {done ? 'Done for today. New one tomorrow!' : '5 mixed questions, 20 XP each.'}
          </p>
        </div>
        {done ? (
          <Button size="small" disabled aria-label="Daily challenge done">
            <Icon name="check" />
          </Button>
        ) : (
          <Button
            size="small"
            variant={started ? 'primary' : 'default'}
            href={playHref({ mode: 'daily' })}
            aria-label="Play the daily challenge"
          >
            Play
          </Button>
        )}
      </div>
    </Panel>
  )
}

function RankCard({ state }: { state: State }) {
  const r = rankOf(state.xp)
  const value = r.next ? (state.xp - r.min) / (r.next - r.min) : 1
  const freezes = state.freezes ?? 0
  return (
    <Panel as="section" labelledBy="rank-title">
      <p {...stylex.props(text.eyebrow)}>Your rank</p>
      <div {...stylex.props(styles.rankHead)}>
        <h2 id="rank-title" {...stylex.props(text.display, text.h3)}>
          {r.name}
        </h2>
        <span {...stylex.props(text.muted, text.mono, text.tiny)}>{fmt(state.xp)} XP</span>
      </div>
      <ProgressBar
        value={value}
        color={colors.blaze}
        label={`Progress to ${r.nextName ?? 'the top rank'}`}
        xstyle={styles.rankBar}
      />
      <p {...stylex.props(text.muted, text.tiny, styles.note)}>
        {r.next ? `${fmt(r.next - state.xp)} XP to ${r.nextName}` : 'Top rank reached. Legendary!'}
      </p>
      {freezes > 0 && (
        <p {...stylex.props(text.muted, text.tiny, styles.freeze)}>
          <Icon name="gem" xstyle={styles.gem} /> {freezes} streak freeze{freezes > 1 ? 's' : ''}{' '}
          ready.
          {freezes < 2 ? ' Earn one every 7 days in a row.' : ' That is the most you can hold.'}
        </p>
      )}
    </Panel>
  )
}

const HOW: [IconName, string][] = [
  ['play', 'Lessons are 8 short questions, about 3 minutes.'],
  ['repeat', 'Miss one? It comes back later. No lives, no penalties.'],
  ['star', 'Earn stars, XP, badges, and a certificate for each trail.'],
]

function HowItWorks() {
  return (
    <Panel as="section" labelledBy="how-title">
      <h2 id="how-title" {...stylex.props(text.eyebrow)}>
        How it works
      </h2>
      <ul {...stylex.props(styles.how)}>
        {HOW.map(([icon, line]) => (
          <li key={icon} {...stylex.props(styles.howItem)}>
            <Icon name={icon} xstyle={styles.howIcon} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function ReviewCard({ state }: { state: State }) {
  const count = mistakes(state).length
  if (count === 0) return null
  return (
    <Panel as="section" labelledBy="review-title">
      <div {...stylex.props(styles.row)}>
        <Medal icon="repeat" color={colors.ts} xstyle={styles.reviewMedal} />
        <div {...stylex.props(styles.grow)}>
          <h2 id="review-title" {...stylex.props(text.display, text.h3)}>
            Review
          </h2>
          <p {...stylex.props(text.muted, text.small)}>
            {count} question{count === 1 ? '' : 's'} to lock in. Practice makes them stick.
          </p>
        </div>
        <Button
          size="small"
          href={playHref({ mode: 'review' })}
          aria-label="Practice your mistakes"
        >
          Practice
        </Button>
      </div>
    </Panel>
  )
}
