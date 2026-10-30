import * as stylex from '@stylexjs/stylex'

import { darkShadows, darkTheme, lightShadows, lightTheme } from '../styles/themes.ts'

import type { Settings } from './types.ts'

/** The `<html>` class names for each theme setting. */
export const THEME_CLASSES: Record<Settings['theme'], string> = {
  system: '',
  light: stylex.props(lightTheme, lightShadows).className ?? '',
  dark: stylex.props(darkTheme, darkShadows).className ?? '',
}

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
}

export function reducedMotion(settings: Settings): boolean {
  return settings.calm || matchMedia('(prefers-reduced-motion: reduce)').matches
}
