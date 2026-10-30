import {
  BANKS,
  answerAndContinue,
  answerCorrectly,
  expect,
  hydrated,
  lessonsDone,
  player,
  readProgress,
  resultsTitle,
  seedProgress,
  test,
} from './support.ts'

const html = BANKS[0]

function level(page: import('@playwright/test').Page, n: number) {
  return page.getByRole('region', { name: `Level ${n}: ${html.levels[n - 1].title}` })
}

// Hydration race bug (fixed separately): late islands keep server attributes, so this flakes.
test('a jump test opens level 2', async ({ page }) => {
  await seedProgress(page, player())
  await page.goto('/trail/html')
  await expect(level(page, 2)).toContainText('Finish level 1 to open them.')
  await hydrated(page)

  await level(page, 2).getByRole('button', { name: 'Jump here' }).click()
  const dialog = page.getByRole('dialog', { name: 'Jump to level 2?' })
  await expect(dialog).toContainText('Answer 8 of 10 questions from level 1')
  await dialog.getByRole('link', { name: 'Start the test' }).click()

  await expect(page).toHaveURL(/mode=jump&mod=html&level=2/)
  // Two misses still pass: the test needs 8 of 10. Missed questions do not come back.
  await answerAndContinue(page, false)
  await answerAndContinue(page, false)
  await answerCorrectly(page, 8)
  await expect(resultsTitle(page)).toHaveText('Level 2 unlocked!')
  await expect(page.getByText('8 of 10 correct.')).toBeVisible()

  await page.getByRole('link', { name: 'Back to trail' }).click()
  await expect(page).toHaveURL(/\/trail\/html\/?$/)
  await expect(
    level(page, 2).getByRole('link', { name: 'Level 2 lesson 1, start here' }),
  ).toBeVisible()
  await expect(level(page, 2).getByRole('button', { name: 'Jump here' })).toHaveCount(0)
  await expect(level(page, 3).getByRole('button', { name: 'Jump here' })).toBeVisible()
  expect((await readProgress(page)).jumps).toEqual({ html: 2 })
})

// Hydration race bug (fixed separately): late islands keep server attributes, so this flakes.
test('the trail map shows done, current, and locked lessons', async ({ page }) => {
  await seedProgress(
    page,
    player({ lessons: { 'html:1:0': { stars: 3, at: 1 }, 'html:1:1': { stars: 2, at: 2 } } }),
  )
  await page.goto('/trail/html')

  const camp = level(page, 1)
  await expect(camp.getByRole('link', { name: 'Level 1 lesson 1, done, 3 stars' })).toBeVisible()
  await expect(camp.getByRole('link', { name: 'Level 1 lesson 2, done, 2 stars' })).toBeVisible()
  await expect(camp.getByRole('img', { name: '2 of 3 stars' })).toBeVisible()
  const current = camp.getByRole('link', { name: 'Level 1 lesson 3, start here' })
  await expect(current).toHaveAttribute('href', '/play/?mode=lesson&mod=html&level=1&lesson=2')
  await expect(camp.getByText('Start', { exact: true })).toBeVisible()
  await expect(page.getByText('2/15 lessons')).toBeVisible()
  await expect(page.getByText('5 stars', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'HTML trail progress' })).toHaveAttribute(
    'aria-valuenow',
    '13',
  )

  for (const n of [2, 3, 4, 5]) {
    await expect(level(page, n)).toContainText(`Finish level ${n - 1} to open them.`)
    await expect(level(page, n).getByRole('link')).toHaveCount(0)
  }
  await expect(page.getByRole('heading', { name: 'The summit' })).toBeVisible()

  await current.click()
  await expect(page.locator('#qprompt')).toBeVisible()
  await expect(page.getByText('Level 1 · Lesson 3')).toBeVisible()
})

// Hydration race bug (fixed separately): late islands keep server attributes, so this flakes.
test('a locked lesson explains how to open it', async ({ page }) => {
  await seedProgress(page, player({ lessons: lessonsDone('html', 1) }))
  await page.goto('/trail/html')
  await hydrated(page)
  await level(page, 1).getByRole('button', { name: 'Level 1 lesson 3, locked' }).click()
  await expect(page.getByText('Finish the lesson before this one to unlock it.')).toBeVisible()
})

// Hydration race bug (fixed separately): late islands keep server attributes, so this flakes.
test('a finished level offers practice', async ({ page }) => {
  await seedProgress(page, player({ lessons: lessonsDone('html', 3) }))
  await page.goto('/trail/html')
  await expect(
    level(page, 2).getByRole('link', { name: 'Level 2 lesson 1, start here' }),
  ).toBeVisible()
  await expect(level(page, 2).getByRole('link', { name: 'Practice level 2' })).toHaveCount(0)

  await level(page, 1).getByRole('link', { name: 'Practice level 1' }).click()
  await expect(page).toHaveURL(/mode=practice&mod=html&level=1/)
  await expect(page.getByText('Practice', { exact: true })).toBeVisible()
  await answerCorrectly(page, 8)
  await expect(resultsTitle(page)).toHaveText('Practice complete!')
  await page.getByRole('link', { name: 'Back to trail' }).click()
  await expect(page).toHaveURL(/\/trail\/html\/?$/)
})

test('the daily challenge is done for the day once played', async ({ page }) => {
  await seedProgress(page, player())
  await page.goto('/')
  const daily = page.getByRole('region', { name: 'Daily challenge' })
  await expect(daily).toContainText('5 mixed questions, 20 XP each.')
  await daily.getByRole('link', { name: 'Play the daily challenge' }).click()

  await expect(page.getByText('Daily challenge', { exact: true })).toBeVisible()
  await answerCorrectly(page, 5)
  await expect(resultsTitle(page)).toHaveText('Daily challenge crushed!')
  await expect(page.getByText('+100', { exact: true })).toBeVisible()
  await expect(page.getByText('Daily Dose', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Back home' }).click()
  await expect(daily).toContainText('Done for today. New one tomorrow!')
  await expect(daily.getByRole('button', { name: 'Daily challenge done' })).toBeDisabled()
  await expect(daily.getByRole('link')).toHaveCount(0)
})

test.describe('certificates', () => {
  // Hydration race bug (fixed separately): late islands keep server attributes, so this flakes.
  test('a finished trail shows the certificate', async ({ page }) => {
    await seedProgress(page, player({ lessons: lessonsDone('html', 15, 3) }))
    await page.goto('/trail/html')
    await expect(page.getByRole('heading', { name: 'Summit reached!' })).toBeVisible()
    await page.getByRole('link', { name: 'View certificate' }).click()

    await expect(page).toHaveURL(/\/cert\/html\/?$/)
    const cert = page.getByRole('article', { name: 'HTML certificate' })
    await expect(cert).toContainText('Certificate of completion')
    await expect(cert).toContainText('Mia')
    await expect(cert).toContainText('45 / 45 stars')
    await expect(cert).toContainText(`answering ${html.questions.length} questions`)
    await expect(page.getByText(/I just reached the summit of the HTML trail/)).toBeVisible()
  })

  test('an unfinished trail shows a friendly locked message', async ({ page }) => {
    await seedProgress(page, player({ lessons: lessonsDone('css', 4, 2) }))
    await page.goto('/cert/css')
    await expect(page.getByText('Not quite at the summit yet!')).toBeVisible()
    await expect(page.getByText('You have finished 4 so far.')).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)
    await page.getByRole('link', { name: 'Go to the CSS trail' }).click()
    await expect(page).toHaveURL(/\/trail\/css\/?$/)
  })
})
