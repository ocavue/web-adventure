import * as stylex from '@stylexjs/stylex'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'

import { Buddy } from '../../components/ui/Bit.tsx'
import { Blaze } from '../../components/ui/Blaze.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog, DialogActions } from '../../components/ui/Dialog.tsx'
import { Icon } from '../../components/ui/Icon.tsx'
import { Stars } from '../../components/ui/Stars.tsx'
import { CAMP_NAMES, ELEVATIONS, MOD } from '../../lib/constants.ts'
import { useProgressState } from '../../lib/hooks.ts'
import { modStats } from '../../lib/progress.ts'
import { playHref } from '../../lib/selection.ts'
import { reducedMotion } from '../../lib/theme.ts'
import { toast } from '../../lib/toast.ts'
import type { LevelInfo, ModuleId, State } from '../../lib/types.ts'
import { fmt } from '../../lib/utils.ts'
import { focus, text } from '../../styles/shared.ts'
import { accent, colors, fonts, radii } from '../../styles/tokens.stylex.ts'

import { campOf, lockedMessage, trailPath } from './nodes.ts'
import type { Camp, LessonNode } from './nodes.ts'

/** How far each lesson node of a camp sits from the center line. Odd camps mirror it. */
const OFFSETS = [0, -70, 70]

const pulse = stylex.keyframes({
  '0%': { transform: 'scale(0.92)', opacity: 0.7 },
  '100%': { transform: 'scale(1.18)', opacity: 0 },
})

const float = stylex.keyframes({
  '50%': { transform: 'translateY(-4px)' },
})

const nodeShadow = `color-mix(in srgb, ${accent.color} 60%, black)`

const styles = stylex.create({
  tip: { marginTop: 8 },
  map: { position: 'relative', marginTop: 12 },
  camp: { position: 'relative', paddingBlock: 20 },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    backgroundColor: colors.paper2,
    borderRadius: radii.l,
    paddingBlock: 14,
    paddingInline: 16,
    boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
    position: 'relative',
    zIndex: 2,
  },
  headLocked: { opacity: 0.85 },
  headText: { flex: '1', minWidth: 180 },
  elev: { fontFamily: fonts.mono, fontSize: 12, color: colors.ink3 },
  path: { position: 'relative' },
  nodes: {
    listStyle: 'none',
    margin: 0,
    paddingInline: 0,
    display: 'grid',
    gap: 22,
    paddingTop: 26,
    paddingBottom: 6,
    justifyItems: 'center',
  },
  line: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    overflow: 'visible',
  },
  linePath: {
    stroke: colors.line,
    strokeWidth: 6,
    fill: 'none',
    strokeDasharray: '2 14',
    strokeLinecap: 'round',
  },
  nodeWrap: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    justifyItems: 'center',
    gap: 6,
  },
  offset: (x: number) => ({ transform: `translateX(${x}px)` }),
  node: {
    appearance: 'none',
    borderWidth: 0,
    padding: 0,
    cursor: 'pointer',
    width: 78,
    height: 72,
    borderRadius: '50%',
    backgroundColor: accent.color,
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    position: 'relative',
    boxShadow: { default: `0 6px 0 ${nodeShadow}`, ':active': `0 2px 0 ${nodeShadow}` },
    transform: { default: null, ':active': 'translateY(4px)' },
    transitionProperty: 'transform',
    transitionDuration: '0.1s',
  },
  done: { backgroundColor: `color-mix(in srgb, ${accent.color} 80%, ${colors.paper2})` },
  locked: {
    backgroundColor: colors.paper3,
    color: colors.ink3,
    boxShadow: { default: `0 6px 0 ${colors.line}`, ':active': `0 2px 0 ${colors.line}` },
  },
  current: {
    '::before': {
      content: "''",
      position: 'absolute',
      inset: -9,
      borderRadius: '50%',
      borderWidth: 3,
      borderStyle: 'solid',
      borderColor: accent.color,
      opacity: 0.6,
      animationName: pulse,
      animationDuration: '1.8s',
      animationTimingFunction: 'ease-out',
      animationIterationCount: 'infinite',
    },
  },
  nodeIcon: { width: 30, height: 30 },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.ink2,
    backgroundColor: colors.paper,
    paddingInline: 6,
    borderRadius: 6,
  },
  startTag: {
    position: 'absolute',
    top: -34,
    backgroundColor: colors.paper2,
    color: colors.ink,
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    paddingBlock: 4,
    paddingInline: 10,
    borderRadius: 9,
    boxShadow: `inset 0 0 0 2px ${accent.color}`,
    animationName: float,
    animationDuration: '2s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    whiteSpace: 'nowrap',
  },
  lockedNote: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.ink3,
    fontSize: 14,
    paddingTop: 16,
    paddingBottom: 4,
    textAlign: 'center',
  },
  lockIcon: { width: 16, height: 16 },
  summit: {
    textAlign: 'center',
    paddingBlock: 28,
    paddingInline: 16,
    borderRadius: radii.l,
    backgroundColor: colors.paper2,
    boxShadow: `inset 0 0 0 1.5px ${colors.line}`,
    display: 'grid',
    gap: 10,
    justifyItems: 'center',
    marginTop: 18,
  },
  flag: { width: 44, height: 44, color: accent.color },
})

export interface TrailMapProps {
  mod: ModuleId
  /** The trail's 5 levels, from its question bank. */
  levels: LevelInfo[]
}

/** The trail map: 5 camps of 3 lessons each, joined by a winding line, up to the summit. */
export function TrailMap({ mod, levels }: TrailMapProps) {
  const { state, ready, pending } = useProgressState()
  const [jumpLevel, setJumpLevel] = useState<number | null>(null)
  const m = MOD[mod]
  const st = modStats(mod, state)
  const complete = st.done === st.total
  const mapRef = useRef<HTMLDivElement>(null)

  useScrollToCurrent(mapRef, state, ready, st.done > 0)

  return (
    <>
      {st.done === 0 && !Object.hasOwn(state.jumps, mod) && (
        <div {...pending}>
          <Buddy xstyle={styles.tip}>
            Already know some {m.name}? Tap <b>Jump here</b> on any locked level to test out and
            skip ahead.
          </Buddy>
        </div>
      )}
      <div ref={mapRef} {...pending} {...stylex.props(styles.map)}>
        {levels.map((info, i) => (
          <CampSection
            key={i}
            mod={mod}
            info={info}
            camp={campOf(mod, i + 1, state)}
            state={state}
            onJump={setJumpLevel}
          />
        ))}
      </div>
      <section aria-labelledby="summit-title" {...pending} {...stylex.props(styles.summit)}>
        <Icon name="flag" xstyle={styles.flag} />
        <h2 id="summit-title" {...stylex.props(text.display, text.h2)}>
          {complete ? 'Summit reached!' : 'The summit'}
        </h2>
        <p {...stylex.props(text.muted)}>
          {complete
            ? `You finished every lesson on the ${m.name} trail.`
            : `Finish all ${st.total} lessons to earn your ${m.name} certificate.`}
        </p>
        {complete && (
          <Button variant="primary" href={`/cert/${mod}`}>
            View certificate
          </Button>
        )}
      </section>
      <JumpDialog mod={mod} level={jumpLevel} onClose={() => setJumpLevel(null)} />
    </>
  )
}

/** Once the stored progress loads, scrolls the current lesson into view for a returning player. */
function useScrollToCurrent(
  mapRef: { current: HTMLElement | null },
  state: State,
  ready: boolean,
  hasProgress: boolean,
) {
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (!ready || scrolledRef.current) return
    scrolledRef.current = true
    if (!hasProgress) return
    const current = mapRef.current?.querySelector('[data-current]')
    current?.scrollIntoView({
      block: 'center',
      behavior: reducedMotion(state.settings) ? 'auto' : 'smooth',
    })
  }, [ready, hasProgress, mapRef, state.settings])
}

function CampSection({
  mod,
  info,
  camp,
  state,
  onJump,
}: {
  mod: ModuleId
  info: LevelInfo
  camp: Camp
  state: State
  onJump: (level: number) => void
}) {
  const l = camp.level
  const titleId = `camp-${l}`
  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.camp)}>
      <div {...stylex.props(styles.head, !camp.unlocked && styles.headLocked)}>
        <Blaze glyph={String(l)} size="sm" mod={mod} />
        <div {...stylex.props(styles.headText)}>
          <p {...stylex.props(styles.elev)}>
            {CAMP_NAMES[l - 1]} · {fmt(ELEVATIONS[l - 1])} m
          </p>
          <h2 id={titleId} {...stylex.props(text.display, text.h3)}>
            Level {l}: {info.title}
          </h2>
          <p {...stylex.props(text.muted, text.small)}>{info.blurb}</p>
        </div>
        {camp.action === 'jump' && (
          <Button size="small" icon="rocket" onClick={() => onJump(l)}>
            Jump here
          </Button>
        )}
        {camp.action === 'practice' && (
          <Button
            size="small"
            variant="ghost"
            icon="dice"
            href={playHref({ mode: 'practice', mod, level: l })}
            aria-label={`Practice level ${l}`}
          >
            Practice
          </Button>
        )}
      </div>
      {camp.unlocked ? (
        <TrailPath mod={mod} camp={camp} state={state} />
      ) : (
        <p {...stylex.props(styles.lockedNote)}>
          <Icon name="lock" xstyle={styles.lockIcon} />3 lessons wait here. Finish level {l - 1} to
          open them.
        </p>
      )}
    </section>
  )
}

function TrailPath({ mod, camp, state }: { mod: ModuleId; camp: Camp; state: State }) {
  const ref = useRef<HTMLDivElement>(null)
  const [d, setD] = useState('')

  useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const draw = () => {
      const box = list.getBoundingClientRect()
      const points = [...list.querySelectorAll('[data-node]')].map((node) => {
        const r = node.getBoundingClientRect()
        return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top] as const
      })
      setD(trailPath(points))
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  const side = camp.level % 2 ? 1 : -1
  return (
    <div ref={ref} {...stylex.props(styles.path)}>
      <svg {...stylex.props(styles.line)} aria-hidden="true">
        {d && <path d={d} {...stylex.props(styles.linePath)} />}
      </svg>
      <ol {...stylex.props(styles.nodes)} aria-label={`Level ${camp.level} lessons`}>
        {camp.nodes.map((node) => (
          <li
            key={node.lesson}
            {...stylex.props(styles.nodeWrap, styles.offset(OFFSETS[node.lesson] * side))}
          >
            {node.current && (
              <span aria-hidden="true" {...stylex.props(styles.startTag)}>
                Start
              </span>
            )}
            <NodeButton mod={mod} level={camp.level} node={node} state={state} />
            {node.status === 'done' ? (
              <Stars count={node.stars} />
            ) : (
              <span aria-hidden="true" {...stylex.props(styles.label)}>
                Lesson {node.lesson + 1}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function NodeButton({
  mod,
  level,
  node,
  state,
}: {
  mod: ModuleId
  level: number
  node: LessonNode
  state: State
}) {
  const label = `Level ${level} lesson ${node.lesson + 1}${
    node.status === 'done'
      ? `, done, ${node.stars} stars`
      : node.status === 'locked'
        ? ', locked'
        : node.current
          ? ', start here'
          : ''
  }`
  const attrs = stylex.props(
    styles.node,
    focus.ring,
    node.status === 'done' && styles.done,
    node.status === 'locked' && styles.locked,
    node.current && styles.current,
  )
  const icon = node.status === 'done' ? 'check' : node.status === 'open' ? 'play' : 'lock'
  if (node.status === 'locked') {
    return (
      <button
        type="button"
        data-node=""
        aria-label={label}
        onClick={() => toast(lockedMessage(mod, level, state))}
        {...attrs}
      >
        <Icon name={icon} xstyle={styles.nodeIcon} />
      </button>
    )
  }
  return (
    <a
      href={playHref({ mode: 'lesson', mod, level, lesson: node.lesson })}
      data-node=""
      data-current={node.current ? '' : undefined}
      aria-label={label}
      {...attrs}
    >
      <Icon name={icon} xstyle={styles.nodeIcon} />
    </a>
  )
}

function JumpDialog({
  mod,
  level,
  onClose,
}: {
  mod: ModuleId
  level: number | null
  onClose: () => void
}) {
  // The dialog renders its children only while open, so the fallback level never shows.
  const l = level ?? 2
  return (
    <Dialog open={level !== null} onClose={onClose} title={`Jump to level ${l}?`}>
      <p>
        Answer <b>8 of 10</b> questions from {l === 2 ? 'level 1' : `levels 1 to ${l - 1}`}{' '}
        correctly, and every level before {l} opens up.
      </p>
      <p {...stylex.props(text.muted)}>
        No pressure: if it does not go your way, nothing is lost and you keep all your progress.
      </p>
      <DialogActions>
        <Button
          variant="primary"
          wide
          icon="rocket"
          href={playHref({ mode: 'jump', mod, level: l })}
          autofocus
        >
          Start the test
        </Button>
      </DialogActions>
    </Dialog>
  )
}
