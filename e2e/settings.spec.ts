import { readFile } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import {
  expect,
  lessonsDone,
  openSettings,
  player,
  readProgress,
  seedProgress,
  test,
  trackErrors,
  xpChip,
} from './support.ts'

/** Records the theme of `<html>` when `<body>` starts, before any island hydrates. */
async function recordEarlyTheme(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record = () => {
      const root = document.documentElement
      Object.assign(window, {
        earlyTheme: { theme: root.dataset.theme ?? null, classes: root.className },
      })
    }
    new MutationObserver((_, observer) => {
      if (!document.body) return
      record()
      observer.disconnect()
    }).observe(document, { childList: true, subtree: true })
  })
}

test('settings change the name, goal, theme, sound, and motion', async ({ page }) => {
  await seedProgress(page, player())
  await recordEarlyTheme(page)
  await page.goto('/')
  const dialog = await openSettings(page)

  await dialog.getByLabel('Trail name').fill('Kai')
  await dialog.getByLabel('Trail name').blur()
  await dialog.getByRole('button', { name: /Intense/ }).click()
  await expect(dialog.getByRole('button', { name: /Intense/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await dialog.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const sound = dialog.getByRole('switch', { name: 'Sound effects' })
  await expect(sound).toHaveAttribute('aria-checked', 'true')
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  const calm = dialog.getByRole('switch', { name: 'Reduce motion' })
  await calm.click()
  await expect(calm).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-calm', '')

  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/, Kai$/)).toBeVisible()
  await expect(page.getByRole('banner')).toContainText('0/250')

  await page.reload()
  // The head script applies the theme before the body renders, so the page does not flash.
  const early = await page.evaluate(() => (window as unknown as { earlyTheme: unknown }).earlyTheme)
  expect(early).toMatchObject({ theme: 'dark', classes: expect.stringMatching(/\S/) })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-calm', '')
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).not.toBe('rgb(238, 244, 241)')

  const again = await openSettings(page)
  await expect(again.getByLabel('Trail name')).toHaveValue('Kai')
  await expect(again.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(again.getByRole('switch', { name: 'Sound effects' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  expect((await readProgress(page)).settings).toEqual({ sound: false, calm: true, theme: 'dark' })

  // Back to light, which wins over a dark system theme.
  await again.getByRole('button', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('a backup restores into a fresh browser', async ({ page, browser }, testInfo) => {
  await seedProgress(page, player({ xp: 420, lessons: lessonsDone('js', 2) }))
  await page.goto('/profile/')
  const dialog = await openSettings(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Download backup' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^byte-trail-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const file = testInfo.outputPath('backup.json')
  await download.saveAs(file)
  const backup = JSON.parse(await readFile(file, 'utf8')) as { name: string; xp: number }
  expect(backup).toMatchObject({ v: 1, name: 'Mia', xp: 420 })
  await expect(page.getByText('Backup downloaded. Keep it somewhere safe.')).toBeVisible()

  const { baseURL, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    testInfo.project.use
  const fresh = await browser.newContext({
    baseURL,
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  })
  const errors = trackErrors(fresh)
  const other = await fresh.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Look around first' }).click()
  await expect(xpChip(other, 0)).toBeVisible()
  const settings = await openSettings(other)

  // A file that is not a backup changes nothing.
  await settings.locator('#restorefile').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": "world"}'),
  })
  await expect(other.getByText('That file is not a Byte Trail backup.')).toBeVisible()

  await settings.locator('#restorefile').setInputFiles(file)
  await expect(other.getByText('Backup restored. Welcome back!')).toBeVisible()
  await expect(settings).toBeHidden()
  await expect(xpChip(other, 420)).toBeVisible()
  await expect(other.getByText(/, Mia$/)).toBeVisible()
  await expect(other.getByRole('link', { name: /^JavaScript/ })).toContainText('6/45')
  await fresh.close()
  expect(errors).toEqual([])
})

test('reset asks first, then erases the progress', async ({ page }) => {
  await seedProgress(
    page,
    player({ xp: 300, settings: { theme: 'dark', sound: true, calm: false } }),
  )
  await page.goto('/')
  await expect(xpChip(page, 300)).toBeVisible()

  let dialog = await openSettings(page)
  await dialog.getByRole('button', { name: 'Reset all progress' }).click()
  await expect(dialog.getByText('It cannot be undone.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep my progress' }).click()
  await expect(dialog.getByText('Nothing was changed. Your progress is safe.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(xpChip(page, 300)).toBeVisible()

  dialog = await openSettings(page)
  await dialog.getByRole('button', { name: 'Reset all progress' }).click()
  await dialog.getByRole('button', { name: 'Erase everything' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Progress reset. A fresh trail awaits!')).toBeVisible()
  await expect(xpChip(page, 0)).toBeVisible()

  await page.reload()
  await expect(xpChip(page, 0)).toBeVisible()
  // The reset keeps the settings and skips the welcome dialog.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await readProgress(page)).toMatchObject({ xp: 0, name: '', lessons: {}, onboarded: true })
})
