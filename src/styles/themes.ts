import * as stylex from '@stylexjs/stylex'

import { accent, colors, shadows } from './tokens.stylex.ts'

const light = {
  paper: '#eef4f1',
  paper2: '#ffffff',
  paper3: '#e2ebe7',
  ink: '#132228',
  ink2: '#4b5f65',
  ink3: '#5e7074',
  line: '#d2ddd8',
  contour: 'rgba(19, 34, 40, 0.075)',
  blaze: '#ffb703',
  deepInk: '#ffffff',
  blazeSoft: '#fff1c7',
  good: '#16884a',
  goodBg: '#dcf4e5',
  bad: '#b8460b',
  badBg: '#ffe9d8',
  focus: '#2a6ff0',
  codeBg: '#f6f8f3',
  css: '#2f7df6',
  js: '#d9a400',
  ts: '#3b5bdb',
  git: '#d6336c',
}

const dark = {
  paper: '#0d191d',
  paper2: '#15252b',
  paper3: '#1c3037',
  ink: '#e6efec',
  ink2: '#a3b5b3',
  ink3: '#90a4a5',
  line: '#273b42',
  contour: 'rgba(230, 239, 236, 0.055)',
  blaze: '#ffc233',
  deepInk: '#1b1400',
  blazeSoft: '#3a3010',
  good: '#4ade80',
  goodBg: '#123526',
  bad: '#fb923c',
  badBg: '#3b2314',
  focus: '#7aa7ff',
  codeBg: '#0f1f24',
  css: '#5b9bff',
  js: '#f2c200',
  ts: '#6f8cff',
  git: '#f06595',
}

/** Themes for the "light" and "dark" settings. They override the system preference. */
export const lightTheme = stylex.createTheme(colors, light)
export const darkTheme = stylex.createTheme(colors, dark)
export const lightShadows = stylex.createTheme(shadows, {
  deepInk: '0 1px 0 rgba(0, 0, 0, 0.25)',
  card: '0 1px 0 rgba(19, 34, 40, 0.06), 0 8px 24px -12px rgba(19, 34, 40, 0.25)',
})
export const darkShadows = stylex.createTheme(shadows, {
  deepInk: 'none',
  card: '0 1px 0 rgba(0, 0, 0, 0.3), 0 10px 28px -14px rgba(0, 0, 0, 0.7)',
})

const htmlTheme = stylex.createTheme(accent, {
  color: colors.html,
  ink: colors.blazeInk,
  inkShadow: 'none',
})
const cssTheme = stylex.createTheme(accent, {
  color: colors.css,
  ink: colors.blazeInk,
  inkShadow: 'none',
})
const jsTheme = stylex.createTheme(accent, {
  color: colors.js,
  ink: colors.blazeInk,
  inkShadow: 'none',
})
const tsTheme = stylex.createTheme(accent, {
  color: colors.ts,
  ink: colors.deepInk,
  inkShadow: shadows.deepInk,
})
const webTheme = stylex.createTheme(accent, {
  color: colors.web,
  ink: colors.blazeInk,
  inkShadow: 'none',
})
const reactTheme = stylex.createTheme(accent, {
  color: colors.react,
  ink: colors.blazeInk,
  inkShadow: 'none',
})
const gitTheme = stylex.createTheme(accent, {
  color: colors.git,
  ink: colors.deepInk,
  inkShadow: shadows.deepInk,
})

/** Sets `accent.color` to the color of a trail, and `accent.ink` to a readable glyph color on it. */
export const moduleThemes = {
  html: htmlTheme,
  css: cssTheme,
  js: jsTheme,
  ts: tsTheme,
  web: webTheme,
  react: reactTheme,
  git: gitTheme,
}
