import { test as base, expect } from '@playwright/test'
import type { BrowserContext, Locator, Page } from '@playwright/test'

import type { BankFile, ModuleId, RawQuestion, State } from '../src/lib/types.ts'
import css from '../src/questions/css.json' with { type: 'json' }
import git from '../src/questions/git.json' with { type: 'json' }
import html from '../src/questions/html.json' with { type: 'json' }
import js from '../src/questions/js.json' with { type: 'json' }
import react from '../src/questions/react.json' with { type: 'json' }
import ts from '../src/questions/ts.json' with { type: 'json' }
import web from '../src/questions/web.json' with { type: 'json' }

const STORE_KEY = 'byte-trail:v1'

export const BANKS = [html, css, js, ts, web, react, git] as BankFile[]
export const MOD_IDS: ModuleId[] = BANKS.map((b) => b.module)
const ALL: RawQuestion[] = BANKS.flatMap((b) => b.questions)

/** Collapses white space, as the page shows text. */
function squash(s: string): string {
  return s.replaceAll(/\s+/g, ' ').trim()
}

/** Text as the page shows it: backtick spans become `<code>`, so the text loses the backticks. */
export function plain(s: string): string {
  return s.replaceAll('`', '')
}

function escapeRegExp(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

// --- Errors -------------------------------------------------------------------------------------

/** Console errors and uncaught page errors of a browser context. */
export function trackErrors(context: BrowserContext, allowed: RegExp[] = []): string[] {
  const errors: string[] = []
  context.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (!allowed.some((re) => re.test(text)))
      errors.push(`console: ${text} (${msg.location().url})`)
  })
  context.on('weberror', (e) => {
    // A known bug, fixed separately: Chrome skips the cross-document view transition with this
    // error. Remove this filter once the fix lands.
    if (e.error().message.includes('ViewTransition opt-in disabled')) return
    errors.push(`pageerror: ${e.error().message} (${e.page()?.url()})`)
  })
  return errors
}

interface Fixtures {
  /** Console messages that a test expects. Every other console error fails the test. */
  allowedConsoleErrors: RegExp[]
  /** Fails the test on any console error or page error. Runs for every test. */
  noErrors: undefined
}

export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  noErrors: [
    async ({ context, allowedConsoleErrors }, use) => {
      const errors = trackErrors(context, allowedConsoleErrors)
      await use(undefined)
      expect(errors, 'console errors and page errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

// --- Progress -----------------------------------------------------------------------------------

/** A stored progress state. Missing fields get their defaults when the app reads it. */
export type Seed = Partial<State> & { v?: 1 }

/** A player who has finished onboarding, plus `extra`. */
export function player(extra: Seed = {}): Seed {
  return { v: 1, name: 'Mia', onboarded: true, ...extra }
}

/** `n` finished lessons of a trail, in order, with `stars` each. */
export function lessonsDone(mod: ModuleId, n: number, stars = 3): State['lessons'] {
  const lessons: State['lessons'] = {}
  for (let i = 0; i < n; i++) {
    lessons[`${mod}:${Math.floor(i / 3) + 1}:${i % 3}`] = { stars, at: 1_700_000_000_000 + i }
  }
  return lessons
}

/** Stores `state` before the first page loads. Later reloads keep whatever the app saved. */
export async function seedProgress(page: Page, state: Seed): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem('e2e:seeded') !== null) return
      sessionStorage.setItem('e2e:seeded', '')
      localStorage.setItem(key, value)
    },
    { key: STORE_KEY, value: JSON.stringify({ v: 1, ...state }) },
  )
}

export async function readProgress(page: Page): Promise<State> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORE_KEY)
  if (raw === null) throw new Error('No stored progress')
  return JSON.parse(raw) as State
}

/** The URL of a lesson. */
export function lessonUrl(mod: ModuleId, level: number, lesson: number): string {
  return `/play?mode=lesson&mod=${mod}&level=${level}&lesson=${lesson}`
}

// --- Lessons ------------------------------------------------------------------------------------

export function prompt(page: Page): Locator {
  return page.locator('#qprompt')
}

/** Finds the question on screen in the source banks, by its prompt and its code. */
export async function currentQuestion(page: Page): Promise<RawQuestion> {
  const text = squash((await prompt(page).textContent()) ?? '')
  const codeBlock = page.getByLabel('Code example')
  const code = (await codeBlock.count()) ? squash((await codeBlock.textContent()) ?? '') : null
  const found = ALL.filter((q) => {
    return squash(plain(q.prompt)) === text && (q.code ? squash(q.code) : null) === code
  })
  if (found.length !== 1) throw new Error(`Found ${found.length} questions for: ${text}`)
  return found[0]
}

/** The button of a choice. Its name starts with its key, 1 to 4. */
function choice(page: Page, label: string): Locator {
  const name = new RegExp(`^[1-4] ${escapeRegExp(squash(plain(label)))}$`)
  return page.getByRole('radio', { name }).or(page.getByRole('button', { name }))
}

function tfChoice(page: Page, value: boolean): Locator {
  return page.getByRole('radio', { name: value ? 'T True' : 'F False' })
}

/** The indexes of the choices that make a right (or a wrong) answer. */
function choiceIndexes(q: RawQuestion, correct: boolean): number[] {
  if (q.type === 'single') {
    return [correct ? q.answer : q.choices.findIndex((_, i) => i !== q.answer)]
  }
  if (q.type === 'multi') {
    return correct ? q.answer : [q.choices.findIndex((_, i) => !q.answer.includes(i))]
  }
  return []
}

/** Picks a right or a wrong answer for the question on screen, with the mouse. */
async function pickAnswer(page: Page, correct: boolean): Promise<RawQuestion> {
  const q = await currentQuestion(page)
  if (q.type === 'tf') {
    await tfChoice(page, correct ? q.answer : !q.answer).click()
  } else if (q.type === 'fill') {
    await page.getByLabel('Your answer').fill(correct ? q.answer[0] : 'not-the-answer')
  } else {
    for (const ci of choiceIndexes(q, correct)) await choice(page, q.choices[ci]).click()
  }
  return q
}

/** The keys that pick a right answer for the question on screen. */
export async function answerKeys(page: Page): Promise<{ q: RawQuestion; keys: string[] }> {
  const q = await currentQuestion(page)
  if (q.type === 'tf') return { q, keys: [q.answer ? 't' : 'f'] }
  if (q.type === 'fill') return { q, keys: [] }
  const keys: string[] = []
  for (const ci of choiceIndexes(q, true)) {
    const text = (await choice(page, q.choices[ci]).textContent()) ?? ''
    keys.push(text.trim()[0])
  }
  return { q, keys }
}

export function checkButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Check', exact: true })
}

export function continueButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Continue', exact: true })
}

/** Waits for the feedback dock and checks that it says right or wrong. */
export async function expectFeedback(page: Page, correct: boolean): Promise<void> {
  await expect(continueButton(page)).toBeVisible()
  const reveal = page.getByText('Correct answer:')
  if (correct) await expect(reveal).toHaveCount(0)
  else await expect(reveal).toBeVisible()
}

/** Answers the question on screen, right or wrong, and checks it. Stops at the feedback dock. */
export async function answer(page: Page, correct = true): Promise<RawQuestion> {
  const q = await pickAnswer(page, correct)
  await checkButton(page).click()
  await expectFeedback(page, correct)
  return q
}

/** Answers the question on screen and continues to the next question or the results. */
export async function answerAndContinue(page: Page, correct = true): Promise<RawQuestion> {
  const q = await answer(page, correct)
  await continueButton(page).click()
  await expect(checkButton(page).or(resultsTitle(page))).toBeVisible()
  return q
}

/** Answers `n` questions right. */
export async function answerCorrectly(page: Page, n = 1): Promise<RawQuestion[]> {
  const qs: RawQuestion[] = []
  for (let i = 0; i < n; i++) qs.push(await answerAndContinue(page, true))
  return qs
}

export function resultsTitle(page: Page): Locator {
  return page.locator('#restitle')
}

/** The total XP chip in the top bar, found by its visible text. */
export function xpChip(page: Page, xp: number): Locator {
  return page.getByRole('banner').getByText(new RegExp(String.raw`^${xp}\s*XP$`))
}

/** Waits until every island has hydrated. Astro drops their `ssr` attribute then. */
export async function hydrated(page: Page): Promise<void> {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0)
}

export async function openSettings(page: Page): Promise<Locator> {
  await hydrated(page)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()
  return dialog
}
