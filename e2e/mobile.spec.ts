import type { Locator, Page } from '@playwright/test'

import { SCREENS } from './screens.ts'
import {
  answer,
  checkButton,
  continueButton,
  expect,
  lessonUrl,
  player,
  seedProgress,
  test,
} from './support.ts'

test.use({ viewport: { width: 375, height: 740 } })

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
}

for (const screen of SCREENS) {
  test(`${screen.name} fits a 375px screen`, async ({ page }) => {
    test.fixme(!!screen.fixme, screen.fixme)
    await screen.open(page, 'light')
    await expectNoHorizontalScroll(page)
  })
}

test.describe(() => {
  // The browser logs the 404 status of the page itself.
  test.use({ allowedConsoleErrors: [/status of 404/] })

  test('an unknown page fits a 375px screen', async ({ page }) => {
    const response = await page.goto('/no-such-page')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expectNoHorizontalScroll(page)
  })
})

/** The fixed bar at the bottom of the lesson: the closest fixed ancestor of a dock button. */
async function dockTop(button: Locator): Promise<number> {
  return await button.evaluate((el) => {
    let node: Element | null = el
    while (node && getComputedStyle(node).position !== 'fixed') node = node.parentElement
    if (!node) throw new Error('The dock is not fixed')
    return node.getBoundingClientRect().top
  })
}

/** Checks that `target` is fully on screen, above the dock. */
async function checkAboveDock(target: Locator, dockButton: Locator): Promise<void> {
  const box = await target.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0)
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(await dockTop(dockButton))
}

/** Scrolls to the bottom and checks that the last answer is above the dock. */
async function expectLastAnswerClearOfDock(page: Page, dockButton: Locator): Promise<void> {
  const last = page.locator('[data-ci], [data-tf], #fill').last()
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await checkAboveDock(last, dockButton)
  }).toPass({ timeout: 5000 })
}

test.describe(() => {
  // A small phone, where the feedback dock takes almost half of the screen.
  test.use({ viewport: { width: 375, height: 667 } })

  test('the lesson dock never covers the answers', async ({ page }) => {
    await seedProgress(page, player())
    await page.goto(lessonUrl('js', 1, 0))
    for (let i = 0; i < 8; i++) {
      await expect(checkButton(page)).toBeVisible()
      await expectLastAnswerClearOfDock(page, checkButton(page))
      await page.evaluate(() => window.scrollTo(0, 0))

      // A miss opens the tallest dock, and the page scrolls the right choice into view above it.
      await answer(page, false)
      const right = page.locator('[data-mark="missed"]')
      if (await right.count()) {
        await expect(() => checkAboveDock(right.first(), continueButton(page))).toPass({
          timeout: 5000,
        })
      }
      await expectLastAnswerClearOfDock(page, continueButton(page))
      await expectNoHorizontalScroll(page)
      await continueButton(page).click()
    }
  })
})
