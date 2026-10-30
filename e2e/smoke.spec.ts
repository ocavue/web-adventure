import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { BankFile } from '../src/lib/types.ts'
import html from '../src/questions/html.json' with { type: 'json' }

const bank = html as BankFile

/** The prompt as the page shows it: backtick spans become `<code>`, so the text loses them. */
function plain(s: string): string {
  return s.replaceAll('`', '')
}

async function answerCorrectly(page: Page): Promise<void> {
  const prompt = await page.locator('#qprompt').textContent()
  const q = bank.questions.find((x) => plain(x.prompt) === prompt)
  if (!q) throw new Error(`Unknown question: ${prompt}`)
  switch (q.type) {
    case 'tf':
      await page.keyboard.press(q.answer ? 't' : 'f')
      break
    case 'fill':
      await page.locator('#fill').fill(q.answer[0])
      break
    case 'single':
      await page.locator('.choice', { hasText: plain(q.choices[q.answer]) }).click()
      break
    case 'multi':
      for (const i of q.answer)
        await page.locator('.choice', { hasText: plain(q.choices[i]) }).click()
      break
  }
  await page.locator('[data-lact="check"]').click()
  await expect(page.locator('.dock.good')).toBeVisible()
  await page.locator('[data-lact="next"]').click()
}

test('a new hiker finishes the first lesson and keeps the progress', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => {
    errors.push(e.message)
  })
  await page.goto('/')

  await page.locator('#onm').fill('Mia')
  await page.locator('#obgo').click()
  await expect(page.locator('.lesson')).toBeVisible()

  for (let i = 0; i < 8; i++) await answerCorrectly(page)

  await expect(page.locator('#restitle')).toHaveText('Perfect lesson!')
  await expect(page.locator('.stat-grid')).toContainText('100%')

  await page.reload()
  await expect(page.locator('.eyebrow').first()).toContainText('Mia')
  await expect(page.locator('.chip.xp')).toContainText('103')
  expect(errors).toEqual([])
})

test('a wrong answer comes back at the end of the lesson', async ({ page }) => {
  await page.goto('/')
  await page.locator('#oblook').click()
  await page.locator('.continue-card [data-act="start"]').click()

  const first = await page.locator('#qprompt').textContent()
  const q = bank.questions.find((x) => plain(x.prompt) === first)!
  if (q.type !== 'single')
    throw new Error('The first lesson should open with a single-choice question')
  const wrong = q.choices.findIndex((_, i) => i !== q.answer)
  await page.locator('.choice', { hasText: plain(q.choices[wrong]) }).click()
  await page.locator('[data-lact="check"]').click()
  await expect(page.locator('.dock.bad')).toContainText('Correct answer')
  await page.locator('[data-lact="next"]').click()

  for (let i = 0; i < 7; i++) await answerCorrectly(page)
  await expect(page.locator('.qtag.retry')).toContainText('Second try')
  await answerCorrectly(page)
  await expect(page.locator('#restitle')).toHaveText('Great hike!')
})

test('the home page fits the screen without sideways scrolling', async ({ page }) => {
  await page.goto('/')
  await page.locator('#oblook').click()
  await expect(page.locator('.trail-card')).toHaveCount(7)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a backup restores progress in a fresh browser', async ({ page, browser }) => {
  await page.goto('/')
  await page.locator('#onm').fill('Sam')
  await page.locator('#obgo').click()
  for (let i = 0; i < 8; i++) await answerCorrectly(page)
  await page.locator('.nav [data-act="settings"]').click()
  const download = page.waitForEvent('download')
  await page.locator('#backup').click()
  const file = await (await download).path()

  const fresh = await browser.newPage()
  await fresh.goto('/')
  await fresh.locator('#oblook').click()
  await fresh.locator('.nav [data-act="settings"]').click()
  await fresh.locator('#restorefile').setInputFiles(file)
  await expect(fresh.locator('.toast')).toContainText('Backup restored')
  await expect(fresh.locator('.chip.xp')).toContainText('103')
  await fresh.close()
})
