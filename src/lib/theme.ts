import * as stylex from '@stylexjs/stylex'

import { darkShadows, darkTheme, lightShadows, lightTheme } from '../styles/themes.ts'

import type { Settings } from './types.ts'

/** The `<html>` class names for each theme setting. */
export const THEME_CLASSES: Record<Settings['theme'], string> = {
  system: '',
  light: stylex.props(lightTheme, lightShadows).className ?? '',
  dark: stylex.props(darkTheme, darkShadows).className ?? '',
}

/** The browser UI color for each theme. They match `colors.paper`. */
export const THEME_COLORS = { light: '#eef4f1', dark: '#0d191d' } as const

/** Applies the theme and reduce-motion settings to the page. */
export function applySettings(settings: Settings): void {
  const root = document.documentElement
  const all = Object.values(THEME_CLASSES).join(' ').split(' ').filter(Boolean)
  root.classList.remove(...all)
  const current = THEME_CLASSES[settings.theme].split(' ').filter(Boolean)
  root.classList.add(...current)
  if (settings.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = settings.theme
  if (settings.calm) root.dataset.calm = ''
  else delete root.dataset.calm
  // Each `theme-color` meta has a `media` query for one system scheme. A chosen theme wins over both.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = THEME_COLORS[settings.theme === 'system' ? scheme : settings.theme]
  }
}

export function reducedMotion(settings: Settings): boolean {
  return settings.calm || matchMedia('(prefers-reduced-motion: reduce)').matches
}
