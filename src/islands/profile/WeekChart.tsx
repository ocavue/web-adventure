import * as stylex from '@stylexjs/stylex'

import { layout, text } from '../../styles/shared.ts'
import { colors } from '../../styles/tokens.stylex.ts'

import type { DayXp } from './stats.ts'

const styles = stylex.create({
  figure: { marginTop: 10 },
  svg: { width: '100%', height: 'auto' },
  goal: { stroke: colors.blaze, strokeDasharray: '4 4', strokeWidth: 1.5 },
  bar: { fill: colors.ink3 },
  met: { fill: colors.good },
  label: { fill: colors.ink2 },
  today: { fill: colors.ink, fontWeight: 700 },
  caption: { marginTop: 4 },
})

const W = 280
const SLOT = W / 7
const BAR = 24
const BASE = 100
const TALL = 80

function weekday(date: string, style: 'short' | 'long'): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: style })
}

/** Two letters (`Mo`, `Tu`, ...): one letter makes Tuesday and Thursday look the same. */
function dayLabel(date: string): string {
  return weekday(date, 'short').slice(0, 2)
}

export interface WeekChartProps {
  /** XP per day, oldest first. `null` until the stored progress loads. */
  days: DayXp[] | null
  goal: number
}

/** A bar chart of the XP earned each of the last 7 days, with the daily goal as a dashed line. */
export function WeekChart({ days, goal }: WeekChartProps) {
  const list = days ?? Array.from({ length: 7 }, () => ({ date: '', xp: 0 }))
  const max = Math.max(goal, ...list.map((d) => d.xp))
  const goalY = BASE - (goal / max) * TALL
  return (
    <figure {...stylex.props(styles.figure)}>
      <svg viewBox="0 0 280 120" aria-hidden="true" {...stylex.props(styles.svg)}>
        <line {...stylex.props(styles.goal)} x1="0" x2={W} y1={goalY} y2={goalY} />
        {list.map((d, i) => {
          const h = (d.xp / max) * TALL
          const cx = i * SLOT + SLOT / 2
          return (
            <g key={i}>
              <rect
                {...stylex.props(styles.bar, d.xp >= goal && styles.met)}
                x={cx - BAR / 2}
                y={BASE - h}
                width={BAR}
                height={Math.max(h, 2)}
                rx="5"
              />
              {d.date && (
                <text
                  {...stylex.props(styles.label, i === list.length - 1 && styles.today)}
                  x={cx}
                  y="116"
                  text-anchor="middle"
                  font-size="11"
                >
                  {dayLabel(d.date)}
                </text>
              )}
              {d.xp > 0 && (
                <text
                  {...stylex.props(styles.label)}
                  x={cx}
                  y={95 - h}
                  text-anchor="middle"
                  font-size="10"
                >
                  {d.xp}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption {...stylex.props(text.muted, text.tiny, styles.caption)}>
        Dashed line: your daily goal of {goal} XP.
      </figcaption>
      {days && (
        <ul {...stylex.props(layout.srOnly)} aria-label="XP earned each of the last 7 days">
          {days.map((d) => (
            <li key={d.date}>
              {weekday(d.date, 'long')}: {d.xp} XP{d.xp >= goal ? ', goal met' : ''}
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}
