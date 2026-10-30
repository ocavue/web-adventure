import * as stylex from '@stylexjs/stylex'

import { Chip } from '../../components/ui/Chip.tsx'
import { IconButton } from '../../components/ui/IconButton.tsx'
import { currentStreak, dailyXp } from '../../lib/progress.ts'
import { PROFILE_HREF } from '../../lib/routes.ts'
import type { State } from '../../lib/types.ts'
import { openSettings } from '../../lib/ui-state.ts'
import { fmt } from '../../lib/utils.ts'
import { focus } from '../../styles/shared.ts'
import { colors, fonts } from '../../styles/tokens.stylex.ts'

import { compactXp } from './format.ts'

const NARROW = '@media (max-width: 640px)'
const TINY = '@media (max-width: 400px)'

const styles = stylex.create({
  bar: {
    position: 'sticky',
    top: 'env(safe-area-inset-top, 0px)',
    zIndex: 20,
    backgroundColor: `color-mix(in srgb, ${colors.paper} 88%, transparent)`,
    backdropFilter: 'blur(10px)',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  inner: {
    maxWidth: 980,
    marginInline: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: { default: 10, [TINY]: 6 },
    paddingBlock: 10,
    paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
    paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
  },
  logo: {
    display: { default: 'flex', [TINY]: 'none' },
    alignItems: 'center',
    gap: 10,
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: 20,
    lineHeight: 1.2,
    color: colors.ink,
    textDecoration: 'none',
    padding: 4,
    borderRadius: 10,
  },
  mark: { width: 30, height: 30 },
  markBody: { fill: colors.blaze },
  markCode: {
    stroke: colors.blazeInk,
    strokeWidth: 2.3,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  word: { display: { default: 'inline', [NARROW]: 'none' } },
  chips: {
    marginLeft: { default: 'auto', [TINY]: 0 },
    display: 'flex',
    alignItems: 'center',
    gap: { default: 6, [TINY]: 4 },
    minWidth: 0,
    flexShrink: { default: 1, [TINY]: 0 },
  },
  chip: {
    gap: { default: 6, [TINY]: 4 },
    paddingInline: { default: 10, [TINY]: 8 },
  },
  flameOn: { color: colors.flame },
  bolt: { color: colors.js },
  label: { display: { default: 'inline', [NARROW]: 'none' } },
  goalLabel: {
    display: { default: 'inline', [TINY]: 'none' },
    fontSize: { default: 14, [NARROW]: 12 },
  },
  full: { display: { default: 'inline', [NARROW]: 'none' } },
  short: { display: { default: 'none', [NARROW]: 'inline' } },
  ring: { width: 26, height: 26 },
  ringTrack: { stroke: colors.line },
  ringFill: { stroke: colors.blaze },
  ringDone: { stroke: colors.good },
  nav: {
    display: 'flex',
    gap: { default: 2, [TINY]: 0 },
    marginLeft: { default: 0, [TINY]: 'auto' },
  },
})

const RING = 2 * Math.PI * 10

export interface TopBarProps {
  state: State
  /** `false` while `state` is not the stored progress yet. Then the chips are pending. */
  ready?: boolean
}

/** The sticky top bar: logo, streak, XP, daily goal, and links to progress and settings. */
export function TopBar({ state, ready = true }: TopBarProps) {
  const streak = currentStreak(state)
  const dx = dailyXp(state)
  const pct = Math.min(1, dx / state.goal)
  const met = pct >= 1
  return (
    <header {...stylex.props(styles.bar)}>
      <div {...stylex.props(styles.inner)}>
        <a href="/" aria-label="Web Adventure home" {...stylex.props(styles.logo, focus.ring)}>
          <svg viewBox="0 0 32 32" aria-hidden="true" {...stylex.props(styles.mark)}>
            <rect x="7" y="3" width="18" height="26" rx="5" {...stylex.props(styles.markBody)} />
            <path
              d="M12 12l-3 4 3 4M20 12l3 4-3 4M17.5 10l-3 12"
              {...stylex.props(styles.markCode)}
            />
          </svg>
          <span {...stylex.props(styles.word)}>Web Adventure</span>
        </a>
        <div data-pending={ready ? undefined : ''} {...stylex.props(styles.chips)}>
          <Chip
            icon="flame"
            iconXstyle={streak > 0 && styles.flameOn}
            title="Day streak"
            xstyle={styles.chip}
          >
            <span>{streak}</span>
            <span {...stylex.props(styles.label)}>day{streak === 1 ? '' : 's'}</span>
          </Chip>
          <Chip
            icon="bolt"
            iconXstyle={styles.bolt}
            title={`Total XP: ${fmt(state.xp)}`}
            xstyle={styles.chip}
          >
            {state.xp >= 1000 ? (
              <span>
                <span {...stylex.props(styles.full)}>{fmt(state.xp)}</span>
                <span {...stylex.props(styles.short)}>{compactXp(state.xp)}</span>
              </span>
            ) : (
              <span>{state.xp}</span>
            )}
            <span {...stylex.props(styles.label)}>XP</span>
          </Chip>
          <Chip title={`Daily goal: ${dx} of ${state.goal} XP`} xstyle={styles.chip}>
            <svg viewBox="0 0 26 26" aria-hidden="true" {...stylex.props(styles.ring)}>
              <circle
                cx="13"
                cy="13"
                r="10"
                fill="none"
                stroke-width="4"
                {...stylex.props(styles.ringTrack)}
              />
              <circle
                cx="13"
                cy="13"
                r="10"
                fill="none"
                stroke-width="4"
                stroke-linecap="round"
                stroke-dasharray={RING}
                stroke-dashoffset={RING * (1 - pct)}
                transform="rotate(-90 13 13)"
                {...stylex.props(met ? styles.ringDone : styles.ringFill)}
              />
            </svg>
            <span {...stylex.props(styles.goalLabel)}>
              {met ? 'Goal met' : `${dx}/${state.goal}`}
            </span>
          </Chip>
        </div>
        <nav aria-label="Main" {...stylex.props(styles.nav)}>
          <IconButton href={PROFILE_HREF} icon="user" label="Your progress" />
          <IconButton icon="gear" label="Settings" onClick={openSettings} />
        </nav>
      </div>
    </header>
  )
}
