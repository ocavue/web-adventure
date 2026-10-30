import * as stylex from '@stylexjs/stylex'

const DARK = '@media (prefers-color-scheme: dark)'

/** Color tokens. Dark values apply when the system prefers dark, unless a theme below overrides them. */
export const colors = stylex.defineVars({
  paper: { default: '#eef4f1', [DARK]: '#0d191d' },
  paper2: { default: '#ffffff', [DARK]: '#15252b' },
  paper3: { default: '#e2ebe7', [DARK]: '#1c3037' },
  ink: { default: '#132228', [DARK]: '#e6efec' },
  ink2: { default: '#4b5f65', [DARK]: '#a3b5b3' },
  ink3: { default: '#5e7074', [DARK]: '#90a4a5' },
  line: { default: '#d2ddd8', [DARK]: '#273b42' },
  contour: { default: 'rgba(19, 34, 40, 0.075)', [DARK]: 'rgba(230, 239, 236, 0.055)' },
  blaze: { default: '#ffb703', [DARK]: '#ffc233' },
  blazeInk: '#1b1400',
  /** The glyph on deep trail tiles (`ts`, `git`): white on the light tiles, dark ink on the brighter dark-mode tiles. */
  deepInk: { default: '#ffffff', [DARK]: '#1b1400' },
  blazeSoft: { default: '#fff1c7', [DARK]: '#3a3010' },
  good: { default: '#16884a', [DARK]: '#4ade80' },
  goodBg: { default: '#dcf4e5', [DARK]: '#123526' },
  bad: { default: '#b8460b', [DARK]: '#fb923c' },
  badBg: { default: '#ffe9d8', [DARK]: '#3b2314' },
  focus: { default: '#2a6ff0', [DARK]: '#7aa7ff' },
  flame: '#f76707',
  codeBg: { default: '#f6f8f3', [DARK]: '#0f1f24' },
  html: '#e8590c',
  css: { default: '#2f7df6', [DARK]: '#5b9bff' },
  js: { default: '#d9a400', [DARK]: '#f2c200' },
  ts: { default: '#3b5bdb', [DARK]: '#6f8cff' },
  web: '#0ca678',
  react: '#0b9fc0',
  git: { default: '#d6336c', [DARK]: '#f06595' },
})

/** Light theme colors for paper: a printout is always dark ink on white, even in dark mode. */
export const printColors = stylex.defineConsts({
  paper: '#ffffff',
  ink: '#132228',
  ink2: '#4b5f65',
})

export const shadows = stylex.defineVars({
  /** The text shadow under `colors.deepInk`. */
  deepInk: { default: '0 1px 0 rgba(0, 0, 0, 0.25)', [DARK]: 'none' },
  card: {
    default: '0 1px 0 rgba(19, 34, 40, 0.06), 0 8px 24px -12px rgba(19, 34, 40, 0.25)',
    [DARK]: '0 1px 0 rgba(0, 0, 0, 0.3), 0 10px 28px -14px rgba(0, 0, 0, 0.7)',
  },
})

export const fonts = stylex.defineVars({
  display: "'Bricolage Grotesque Variable', 'Avenir Next', 'Segoe UI', system-ui, sans-serif",
  body: "'Atkinson Hyperlegible', 'Segoe UI', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono Variable', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
})

export const radii = stylex.defineVars({
  s: '8px',
  m: '14px',
  l: '22px',
  pill: '999px',
})

/** The accent color of the current trail. Set it with one of the `moduleThemes`. */
export const accent = stylex.defineVars({
  color: colors.blaze,
  /** Text on `color`, with at least 4.5:1 contrast. */
  ink: colors.blazeInk,
  /** The text shadow under `ink`. */
  inkShadow: 'none',
})
