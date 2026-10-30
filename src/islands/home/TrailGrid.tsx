import * as stylex from '@stylexjs/stylex'

import { Blaze } from '../../components/ui/Blaze.tsx'
import { Icon } from '../../components/ui/Icon.tsx'
import { ProgressBar } from '../../components/ui/ProgressBar.tsx'
import { MODULES } from '../../lib/constants.ts'
import type { ModuleInfo } from '../../lib/constants.ts'
import { useProgressState } from '../../lib/hooks.ts'
import type { ProgressState } from '../../lib/hooks.ts'
import { modStats } from '../../lib/progress.ts'
import type { ModuleId, State } from '../../lib/types.ts'
import { focus, layout } from '../../styles/shared.ts'
import { moduleThemes } from '../../styles/themes.ts'
import { accent, colors, fonts, radii } from '../../styles/tokens.stylex.ts'

import { trailStatus } from './rules.ts'

const WIDE = '@media (min-width: 1000px)'

const styles = stylex.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
      [WIDE]: 'repeat(4, minmax(0, 1fr))',
    },
    gap: 14,
    listStyle: 'none',
    padding: 0,
  },
  item: { display: 'grid' },
  card: {
    display: 'grid',
    gridTemplateColumns: { default: 'auto minmax(0, 1fr)', [WIDE]: 'minmax(0, 1fr)' },
    gap: 14,
    alignItems: 'start',
    alignContent: 'start',
    backgroundColor: colors.paper2,
    color: colors.ink,
    textDecoration: 'none',
    padding: 16,
    borderRadius: radii.l,
    boxShadow: {
      default: `inset 0 0 0 1.5px ${colors.line}, 0 4px 0 ${colors.line}`,
      ':hover': `inset 0 0 0 1.5px color-mix(in srgb, ${accent.color} 50%, ${colors.line}), 0 7px 0 color-mix(in srgb, ${accent.color} 35%, ${colors.line})`,
    },
    transform: { default: null, ':hover': 'translateY(-3px)' },
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '0.15s',
    transitionTimingFunction: 'ease',
  },
  info: { display: 'grid', gap: 6, minWidth: 0 },
  name: { fontFamily: fonts.display, fontWeight: 800, fontSize: 20, lineHeight: 1.5 },
  sub: { fontSize: 14, color: colors.ink2 },
  progress: { display: 'grid', gap: 6 },
  foot: {
    display: 'flex',
    flexWrap: 'wrap',
    rowGap: 2,
    columnGap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    color: colors.ink2,
    fontVariantNumeric: 'tabular-nums',
  },
  nowrap: { whiteSpace: 'nowrap' },
  star: {
    display: 'inline-block',
    width: 14,
    height: 14,
    verticalAlign: '-2px',
    color: colors.blaze,
  },
})

export interface TrailGridProps {
  /** Level titles of every trail, from the question banks. */
  titles: Record<ModuleId, string[]>
}

/** The "Choose a trail" cards, one link per trail with the player's progress on it. */
export function TrailGrid({ titles }: TrailGridProps) {
  const { state, pending } = useProgressState()
  return (
    <ul {...stylex.props(styles.grid)}>
      {MODULES.map((m) => (
        <li key={m.id} {...stylex.props(styles.item)}>
          <TrailCard m={m} state={state} pending={pending} titles={titles[m.id]} />
        </li>
      ))}
    </ul>
  )
}

function TrailCard({
  m,
  state,
  pending,
  titles,
}: {
  m: ModuleInfo
  state: State
  pending: ProgressState['pending']
  titles: string[]
}) {
  const st = modStats(m.id, state)
  return (
    <a href={`/trail/${m.id}`} {...stylex.props(moduleThemes[m.id], styles.card, focus.ring)}>
      <Blaze glyph={m.glyph} mod={m.id} />
      <div {...stylex.props(styles.info)}>
        <h3 {...stylex.props(styles.name)}>{m.name}</h3>
        <p {...stylex.props(styles.sub)}>{m.tagline}</p>
        <div {...pending} {...stylex.props(styles.progress)}>
          <ProgressBar value={st.done / st.total} color={accent.color} />
          <div {...stylex.props(styles.foot)}>
            <span {...stylex.props(styles.nowrap)}>{trailStatus(m.id, titles, state)}</span>
            {st.done > 0 ? (
              <span {...stylex.props(styles.nowrap)}>
                <Icon name="star" xstyle={styles.star} /> {st.stars}/{st.total * 3}
                <span {...stylex.props(layout.srOnly)}> stars</span>
              </span>
            ) : (
              <span {...stylex.props(styles.nowrap)}>{st.total} lessons</span>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}
