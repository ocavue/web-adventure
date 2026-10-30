import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'

import { Badge } from '../../components/ui/Badge.tsx'
import { Blaze } from '../../components/ui/Blaze.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { IconButton } from '../../components/ui/IconButton.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { ProgressBar } from '../../components/ui/ProgressBar.tsx'
import { Tag } from '../../components/ui/Tag.tsx'
import { banks, loadBank } from '../../lib/bank.ts'
import { BADGES, MOD, MODULES } from '../../lib/constants.ts'
import { useProgressState } from '../../lib/hooks.ts'
import { currentStreak, modComplete, modStats, rankOf } from '../../lib/progress.ts'
import { certHref } from '../../lib/routes.ts'
import { playHref } from '../../lib/selection.ts'
import type { ModuleId } from '../../lib/types.ts'
import { openSettings } from '../../lib/ui-state.ts'
import { fmt } from '../../lib/utils.ts'
import { layout, text } from '../../styles/shared.ts'
import { moduleThemes } from '../../styles/themes.ts'
import { colors, fonts, radii } from '../../styles/tokens.stylex.ts'

import { mistakeTrails, timeText, topicGroups, trailAccuracy, weekXp } from './stats.ts'
import { WeekChart } from './WeekChart.tsx'

const NARROW = '@media (max-width: 760px)'

const styles = stylex.create({
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    paddingTop: 24,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  title: { flexGrow: 1, flexBasis: 0, minWidth: 200, display: 'grid', gap: 4 },
  name: { overflowWrap: 'anywhere' },
  grid: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) minmax(0, 1fr)', [NARROW]: 'minmax(0, 1fr)' },
    gap: 14,
  },
  kv: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
    marginTop: 12,
  },
  stat: {
    backgroundColor: colors.paper2,
    borderRadius: radii.m,
    paddingBlock: 12,
    paddingInline: 10,
    boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
    display: 'grid',
    gap: 2,
    alignContent: 'start',
  },
  statValue: {
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: 26,
    fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  rows: { display: 'grid', gap: 12, marginTop: 12, padding: 0, listStyle: 'none' },
  row: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gap: 10,
    alignItems: 'center',
    fontSize: 14,
  },
  rowHead: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  rowBar: { marginTop: 4 },
  acc: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.ink2,
    width: 64,
    textAlign: 'right',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 28,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  tags: { display: 'flex', gap: 10, flexWrap: 'wrap', padding: 0, listStyle: 'none' },
  note: { marginTop: 10 },
  badges: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
    rowGap: '18px',
    columnGap: '10px',
    padding: 0,
    listStyle: 'none',
  },
})

function Stat({ value, label }: { value: ComponentChildren; label: string }) {
  return (
    <div {...stylex.props(styles.stat)}>
      <b {...stylex.props(styles.statValue)}>{value}</b>
      <span {...stylex.props(styles.statLabel)}>{label}</span>
    </div>
  )
}

function SectionHead({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children?: ComponentChildren
}) {
  return (
    <div {...stylex.props(styles.sectionHead)}>
      <h2 id={id} {...stylex.props(text.display, text.h2)}>
        {title}
      </h2>
      {children}
    </div>
  )
}

/** The player's profile: weekly XP, stats, trail progress, topics to grow, badges, and certificates. */
export function Profile() {
  const { state, ready, pending } = useProgressState()
  const rank = rankOf(state.xp)
  const { answered, correct } = state.stats
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0
  const earned = (id: string) => Object.hasOwn(state.badges, id)
  const badges = [...BADGES].sort((a, b) => Number(earned(b.id)) - Number(earned(a.id)))
  const got = BADGES.filter((b) => earned(b.id)).length
  const certs = MODULES.filter((m) => modComplete(m.id, state))

  const needed = mistakeTrails(state).join(',')
  useEffect(() => {
    if (!needed) return
    void (async () => {
      try {
        await Promise.all(needed.split(',').map((m) => loadBank(m as ModuleId)))
      } catch {
        // Without the banks, the topics stay hidden. Nothing else on the page needs them.
      }
    })()
  }, [needed])
  const topics = topicGroups(state, banks.value)

  return (
    <>
      <div {...stylex.props(styles.head)}>
        <IconButton href="/" icon="back" label="Back home" />
        <div {...pending} {...stylex.props(styles.title)}>
          <div {...stylex.props(text.eyebrow)}>{rank.name}</div>
          <h1 {...stylex.props(text.display, text.h1, styles.name)}>{state.name || 'Traveler'}</h1>
        </div>
        <Button size="small" icon="gear" onClick={openSettings}>
          Edit
        </Button>
      </div>

      <div {...pending} {...stylex.props(styles.grid)}>
        <Panel as="section" labelledBy="week-title">
          <h2 id="week-title" {...stylex.props(text.eyebrow)}>
            This week
          </h2>
          <WeekChart days={ready ? weekXp(state) : null} goal={state.goal} />
          <div {...stylex.props(styles.kv)}>
            <Stat value={fmt(state.xp)} label="Total XP" />
            <Stat value={currentStreak(state)} label={`Day streak (best ${state.streak.best})`} />
            <Stat value={fmt(answered)} label="Answers" />
            <Stat value={`${accuracy}%`} label="Accuracy" />
            <Stat value={fmt(state.stats.lessons)} label="Lessons" />
            <Stat value={timeText(state.stats.time)} label="Time on trail" />
          </div>
        </Panel>
        <Panel as="section" labelledBy="trails-title">
          <h2 id="trails-title" {...stylex.props(text.eyebrow)}>
            Trails
          </h2>
          <ul {...stylex.props(styles.rows)}>
            {MODULES.map((m) => {
              const st = modStats(m.id, state)
              const acc = trailAccuracy(m.id, state)
              return (
                <li key={m.id} {...stylex.props(styles.row)}>
                  <Blaze glyph={m.glyph} size="sm" mod={m.id} />
                  <div>
                    <div {...stylex.props(styles.rowHead)}>
                      <b>{m.name}</b>
                      <span {...stylex.props(text.muted)}>
                        {st.done}/{st.total}
                        <span {...stylex.props(layout.srOnly)}> lessons</span>
                      </span>
                    </div>
                    <ProgressBar
                      value={st.done / st.total}
                      color={colors[m.id]}
                      xstyle={styles.rowBar}
                    />
                  </div>
                  <span {...stylex.props(styles.acc)}>
                    {acc !== null && (
                      <>
                        <span aria-hidden="true">{Math.round(acc * 100)}% acc.</span>
                        <span {...stylex.props(layout.srOnly)}>
                          {Math.round(acc * 100)}% accuracy
                        </span>
                      </>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      {topics.length > 0 && (
        <section aria-labelledby="topics-title">
          <SectionHead id="topics-title" title="Topics to grow">
            <Button size="small" icon="repeat" href={playHref({ mode: 'review' })}>
              Practice these
            </Button>
          </SectionHead>
          <Panel>
            <ul {...stylex.props(styles.tags)}>
              {topics.map((t) => (
                <li key={`${t.mod}|${t.topic}`} {...stylex.props(moduleThemes[t.mod])}>
                  <Tag tone="accent">
                    {MOD[t.mod].name} · {t.topic}{' '}
                    <span {...stylex.props(text.muted)}>
                      {t.count}
                      <span {...stylex.props(layout.srOnly)}> missed</span>
                    </span>
                  </Tag>
                </li>
              ))}
            </ul>
            <p {...stylex.props(text.muted, text.small, styles.note)}>
              These are questions you missed. A quick review locks them in.
            </p>
          </Panel>
        </section>
      )}

      <section aria-labelledby="badges-title">
        <SectionHead id="badges-title" title="Badges">
          <span {...pending} {...stylex.props(text.muted)}>
            {got} of {BADGES.length}
          </span>
        </SectionHead>
        <Panel>
          <ul {...pending} {...stylex.props(styles.badges)}>
            {badges.map((b) => (
              <li key={b.id}>
                <Badge badge={b} got={earned(b.id)} />
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {certs.length > 0 && (
        <section aria-labelledby="certs-title">
          <SectionHead id="certs-title" title="Certificates" />
          <ul {...stylex.props(styles.tags)}>
            {certs.map((m) => (
              <li key={m.id}>
                <Button href={certHref(m.id)}>{m.name}</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
