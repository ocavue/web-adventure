import {
  answer,
  answerAndContinue,
  answerCorrectly,
  answerKeys,
  checkButton,
  continueButton,
  currentQuestion,
  expect,
  expectFeedback,
  lessonUrl,
  player,
  plain,
  prompt,
  readProgress,
  resultsTitle,
  seedProgress,
  test,
  xpChip,
} from './support.ts'

const FIRST_LESSON = lessonUrl('html', 1, 0)

test('a new player onboards, aces the first lesson, and keeps the progress', async ({ page }) => {
  await page.goto('/')
  const welcome = page.getByRole('dialog', { name: 'Welcome to Web Adventure' })
  await expect(welcome).toBeVisible()
  await welcome.getByLabel('What should we call you?').fill('Mia')
  await welcome.getByRole('button', { name: /Keen/ }).click()
  await expect(welcome.getByRole('button', { name: /Keen/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await welcome.getByRole('button', { name: 'CSS' }).click()
  await welcome.getByRole('button', { name: 'HTML' }).click()
  await expect(welcome.getByRole('button', { name: 'HTML' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await welcome.getByRole('button', { name: 'Start my first lesson' }).click()

  await expect(page).toHaveURL(/\/play\/?\?mode=lesson&mod=html&level=1&lesson=0$/)
  const types = new Set<string>()
  for (let i = 0; i < 8; i++) {
    const q = await answerAndContinue(page)
    types.add(q.type)
  }
  // The first lesson mixes every question type.
  expect([...types].sort()).toEqual(['fill', 'multi', 'single', 'tf'])

  await expect(resultsTitle(page)).toHaveText('Perfect lesson!')
  await expect(page.getByText('100%', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible()
  const earned = Number((await page.getByText(/^\+\d+$/).textContent())?.slice(1))
  expect(earned).toBeGreaterThan(0)
  await expect(page.getByText('New badges')).toBeVisible()
  await expect(page.getByText('First Steps', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Web Adventure home' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(xpChip(page, earned)).toBeVisible()
  await expect(page.getByText(/, Mia$/)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.reload()
  await expect(xpChip(page, earned)).toBeVisible()
  await expect(page.getByText(/, Mia$/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ready for a few more steps?' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const state = await readProgress(page)
  expect(state).toMatchObject({ name: 'Mia', goal: 150, onboarded: true, xp: earned })
  expect(state.lessons['html:1:0']?.stars).toBe(3)
})

test('a missed question shows the answer, comes back, and waits in Review', async ({ page }) => {
  await seedProgress(page, player())
  await page.goto(FIRST_LESSON)

  const missed = await answer(page, false)
  await continueButton(page).click()
  await answerCorrectly(page, 7)

  // The missed question comes back at the end as a second try.
  await expect(page.getByText('Second try')).toBeVisible()
  expect(await currentQuestion(page)).toEqual(missed)
  await answerAndContinue(page)

  await expect(resultsTitle(page)).toHaveText('Great hike!')
  await expect(page.getByRole('img', { name: '2 of 3 stars' })).toBeVisible()
  await expect(page.getByText('88%', { exact: true })).toBeVisible()

  await page.goto('/')
  const review = page.getByRole('region', { name: 'Review' })
  await expect(review).toContainText('1 question to lock in.')
  await review.getByRole('link', { name: 'Practice your mistakes' }).click()

  await expect(page).toHaveURL(/mode=review/)
  await expect(page.getByText('Second chance: you missed this before')).toBeVisible()
  expect(await currentQuestion(page)).toEqual(missed)
  await answerAndContinue(page)
  await expect(resultsTitle(page)).toHaveText('Review complete!')

  await page.getByRole('link', { name: 'Back home' }).click()
  await expect(page.getByRole('heading', { name: 'Daily challenge' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Review' })).toHaveCount(0)

  await page.goto('/play/?mode=review')
  await expect(page.getByRole('heading', { name: 'Nothing to review' })).toBeVisible()
})

test('a lesson plays with the keyboard alone', async ({ page }) => {
  await seedProgress(page, player())
  await page.goto(FIRST_LESSON)
  await expect(prompt(page)).toBeFocused()

  // H opens the hint on the first question.
  await page.keyboard.press('h')
  await expect(page.getByText('Hint:')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hint' })).toBeDisabled()

  const seen = new Set<string>()
  for (let i = 0; i < 8; i++) {
    const { q, keys } = await answerKeys(page)
    seen.add(q.type)
    if (q.type === 'fill') {
      await expect(page.getByLabel('Your answer')).toBeFocused()
      await page.keyboard.type(q.answer[0])
    } else {
      for (const key of keys) await page.keyboard.press(key)
    }
    await expect(checkButton(page)).toBeEnabled()
    await page.keyboard.press('Enter')
    await expectFeedback(page, true)
    await expect(continueButton(page)).toBeFocused()
    await page.keyboard.press('Enter')
    if (i < 7) await expect(checkButton(page)).toBeDisabled()
  }
  expect([...seen].sort()).toEqual(['fill', 'multi', 'single', 'tf'])
  await expect(resultsTitle(page)).toHaveText('Perfect lesson!')
  expect((await readProgress(page)).stats.hints).toBe(1)
})

test('a reload in the middle of a lesson resumes it', async ({ page }) => {
  await seedProgress(page, player())
  await page.goto(lessonUrl('css', 1, 0))
  await answerCorrectly(page, 2)
  await answer(page, false)
  await continueButton(page).click()
  await expect(checkButton(page)).toBeVisible()

  const bar = page.getByRole('progressbar', { name: 'Lesson progress' })
  const before = {
    prompt: await prompt(page).textContent(),
    value: await bar.getAttribute('aria-valuenow'),
  }
  expect(before.value).toBe('25')
  await page.reload()
  await expect(prompt(page)).toHaveText(before.prompt ?? '')
  await expect(bar).toHaveAttribute('aria-valuenow', before.value ?? '')

  // An answered question resumes with its feedback.
  const q = await answer(page, true)
  await page.reload()
  await expect(prompt(page)).toHaveText(plain(q.prompt))
  await expectFeedback(page, true)
  await expect(bar).toHaveAttribute('aria-valuenow', '38')
  await continueButton(page).click()

  // The rest of the lesson, plus the missed question at the end.
  await answerCorrectly(page, 5)
  await expect(resultsTitle(page)).toHaveText('Great hike!')
})

test.describe('quitting a lesson', () => {
  test('with no answers it leaves at once', async ({ page }) => {
    await seedProgress(page, player())
    await page.goto(FIRST_LESSON)
    await expect(prompt(page)).toBeVisible()
    await page.getByRole('button', { name: 'Quit lesson' }).click()
    await expect(page).toHaveURL(/\/trail\/html\/?$/)
    await expect(page.getByRole('heading', { name: 'HTML', level: 1 })).toBeVisible()
  })

  test('with answers it asks first, then shows the badges earned', async ({ page }) => {
    await seedProgress(page, player())
    await page.goto(FIRST_LESSON)
    await answerCorrectly(page, 5)

    await page.getByRole('button', { name: 'Quit lesson' }).click()
    const dialog = page.getByRole('dialog', { name: 'Take a break?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Keep going' })).toBeFocused()
    await dialog.getByRole('button', { name: 'Keep going' }).click()
    await expect(dialog).toBeHidden()
    await expect(checkButton(page)).toBeVisible()

    await page.getByRole('button', { name: 'Quit lesson' }).click()
    await dialog.getByRole('button', { name: 'Leave' }).click()
    await expect(page).toHaveURL(/\/trail\/html\/?$/)
    await expect(page.getByText('Badge earned: On a Roll')).toBeVisible()

    // The lesson is not done, but the XP stays.
    const state = await readProgress(page)
    expect(state.lessons).toEqual({})
    expect(state.xp).toBeGreaterThan(0)
    await expect(xpChip(page, state.xp)).toBeVisible()
  })
})

// Guards against a hydration race: an island that hydrates after another one loaded the progress
// must not keep server-rendered attributes, such as this tooltip.
test('the top bar attributes match the stored progress', async ({ page }) => {
  await seedProgress(page, player({ xp: 103 }))
  for (const path of ['/', '/trail/html/', '/profile/']) {
    await page.goto(path)
    await expect(page.getByTitle('Total XP: 103', { exact: true })).toBeVisible()
  }
})
