import type { Page } from '@playwright/test'

import type { State } from '../src/lib/types.ts'

import {
  answer,
  answerCorrectly,
  expect,
  lessonUrl,
  lessonsDone,
  openSettings,
  player,
  prompt,
  resultsTitle,
  seedProgress,
} from './support.ts'
import type { Seed } from './support.ts'

export type Theme = State['settings']['theme']

/** A player with some history: lessons, XP, a streak, badges, and a missed question. */
function returning(theme: Theme): Seed {
  return player({
    xp: 640,
    lessons: { ...lessonsDone('html', 15, 3), ...lessonsDone('css', 4, 2) },
    seen: { 'css-001': { c: 0, w: 1, miss: true }, 'html-001': { c: 1, w: 0 } },
    badges: { first: 1, combo5: 2, summit: 3 },
    stats: {
      answered: 160,
      correct: 140,
      bestCombo: 9,
      lessons: 19,
      reviewCleared: 1,
      hints: 3,
      time: 1200,
    },
    settings: { theme, sound: false, calm: false },
  })
}

export interface Screen {
  name: string
  /** Opens the screen and waits until it is ready. */
  open: (page: Page, theme: Theme) => Promise<void>
}

export const SCREENS: Screen[] = [
  {
    name: 'onboarding dialog',
    open: async (page, theme) => {
      await seedProgress(page, { settings: { theme, sound: false, calm: false } })
      await page.goto('/')
      await expect(page.getByRole('dialog', { name: 'Welcome to Web Adventure' })).toBeVisible()
    },
  },
  {
    name: 'home',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto('/')
      await expect(page.getByRole('region', { name: 'Review' })).toBeVisible()
    },
  },
  {
    name: 'trail page',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto('/trail/css/')
      await expect(page.getByRole('link', { name: 'Level 2 lesson 2, start here' })).toBeVisible()
    },
  },
  {
    name: 'lesson question',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto(lessonUrl('js', 1, 0))
      await expect(prompt(page)).toBeVisible()
    },
  },
  {
    name: 'feedback dock',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto(lessonUrl('js', 1, 0))
      await answer(page, false)
    },
  },
  {
    name: 'results',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto(lessonUrl('css', 2, 1))
      await answerCorrectly(page, 8)
      await expect(resultsTitle(page)).toBeVisible()
    },
  },
  {
    name: 'profile',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto('/profile/')
      await expect(page.getByRole('heading', { name: 'Mia', level: 1 })).toBeVisible()
    },
  },
  {
    name: 'certificate',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto('/cert/html/')
      await expect(page.getByRole('article', { name: 'HTML certificate' })).toBeVisible()
    },
  },
  {
    name: 'settings dialog',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto('/')
      await openSettings(page)
    },
  },
  {
    name: '404 page',
    open: async (page, theme) => {
      await seedProgress(page, returning(theme))
      await page.goto('/404')
      await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    },
  },
]
