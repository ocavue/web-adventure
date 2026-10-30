import type { Page } from '@playwright/test'

import { MOD, MODULES } from '../src/lib/constants.ts'

import { BANKS, MOD_IDS, expect, test } from './support.ts'

const SITE = 'https://web-adventure.pages.dev'

/** Pages for search engines, with their canonical paths. */
const INDEXABLE = ['/', ...MOD_IDS.map((mod) => `/trail/${mod}/`)]
const NOINDEX = ['/play/', '/profile/', ...MOD_IDS.map((mod) => `/cert/${mod}/`), '/404']

// Without JavaScript, the page shows only the static HTML.
test.use({ javaScriptEnabled: false })

async function openStatic(page: Page, path: string): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(200)
}

function meta(page: Page, attr: 'name' | 'property', key: string) {
  return page.locator(`meta[${attr}="${key}"]`)
}

async function jsonLd(page: Page): Promise<Record<string, unknown>> {
  const scripts = page.locator('script[type="application/ld+json"]')
  await expect(scripts).toHaveCount(1)
  return JSON.parse((await scripts.textContent()) ?? '') as Record<string, unknown>
}

test('every indexable page has its own title, description, and social tags', async ({ page }) => {
  const titles = new Set<string>()
  const descriptions = new Set<string>()
  for (const path of INDEXABLE) {
    await openStatic(page, path)
    const title = await page.title()
    const description = (await meta(page, 'name', 'description').getAttribute('content')) ?? ''
    expect(title, path).toMatch(/Byte Trail/)
    expect(description.length, path).toBeGreaterThanOrEqual(80)
    titles.add(title)
    descriptions.add(description)

    const canonical = SITE + path
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
    await expect(meta(page, 'name', 'robots')).toHaveCount(0)
    await expect(meta(page, 'property', 'og:url')).toHaveAttribute('content', canonical)
    await expect(meta(page, 'property', 'og:title')).toHaveAttribute('content', title)
    await expect(meta(page, 'property', 'og:description')).toHaveAttribute('content', description)
    await expect(meta(page, 'property', 'og:type')).toHaveAttribute('content', 'website')
    await expect(meta(page, 'property', 'og:image')).toHaveAttribute('content', `${SITE}/og.png`)
    await expect(meta(page, 'name', 'twitter:card')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  }
  expect(titles.size).toBe(INDEXABLE.length)
  expect(descriptions.size).toBe(INDEXABLE.length)
})

test('the home page has the trails and WebSite structured data', async ({ page }) => {
  await openStatic(page, '/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Learn web dev one small step at a time.',
  )
  for (const m of MODULES) {
    const card = page.getByRole('link').filter({ hasText: m.tagline })
    await expect(card).toHaveAttribute('href', `/trail/${m.id}`)
    await expect(card.getByRole('heading', { level: 3 })).toHaveText(m.name)
  }
  const questions = BANKS.reduce((n, b) => n + b.questions.length, 0)
  await expect(
    page.getByText(`7 trails, ${questions.toLocaleString('en-US')} questions`),
  ).toBeVisible()

  const data = (await jsonLd(page)) as { '@graph': { '@type': string; [k: string]: unknown }[] }
  const site = data['@graph'].find((x) => x['@type'] === 'WebSite')
  expect(site).toMatchObject({ name: 'Byte Trail', url: `${SITE}/` })
  const list = data['@graph'].find((x) => x['@type'] === 'ItemList')
  expect(list).toMatchObject({
    itemListElement: INDEXABLE.slice(1).map((path, i) => ({ position: i + 1, url: SITE + path })),
  })
})

for (const bank of BANKS) {
  const mod = bank.module
  test(`the ${mod} trail page has its levels and Course structured data`, async ({ page }) => {
    await openStatic(page, `/trail/${mod}/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(MOD[mod].name)
    await expect(page).toHaveTitle(`${MOD[mod].name} trail · Byte Trail`)
    for (const [i, info] of bank.levels.entries()) {
      const camp = page.getByRole('region', { name: `Level ${i + 1}: ${info.title}` })
      await expect(camp).toBeVisible()
      await expect(camp).toContainText(info.blurb)
    }
    expect(await jsonLd(page)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: `${MOD[mod].name} trail`,
      url: `${SITE}/trail/${mod}/`,
      provider: { '@type': 'Organization', name: 'Byte Trail' },
      teaches: bank.levels.map((level) => level.title),
    })
  })
}

test('pages that need local progress are not indexed', async ({ page }) => {
  for (const path of NOINDEX) {
    await openStatic(page, path)
    await expect(meta(page, 'name', 'robots'), path).toHaveAttribute('content', 'noindex')
  }
})

test('the sitemap lists exactly the indexable pages', async ({ request }) => {
  const index = await request.get('/sitemap-index.xml')
  expect(index.ok()).toBe(true)
  const sitemaps = [...(await index.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  expect(sitemaps.length).toBeGreaterThan(0)
  const urls: string[] = []
  for (const sitemap of sitemaps) {
    expect(sitemap.startsWith(SITE)).toBe(true)
    const res = await request.get(sitemap.slice(SITE.length))
    expect(res.ok()).toBe(true)
    urls.push(...[...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))
  }
  expect(urls.sort()).toEqual(INDEXABLE.map((p) => SITE + p).sort())
})

test('robots.txt, the social image, and the question banks are served', async ({ request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain(`Sitemap: ${SITE}/sitemap-index.xml`)

  const og = await request.get('/og.png')
  expect(og.ok()).toBe(true)
  expect(og.headers()['content-type']).toBe('image/png')
  expect((await og.body()).subarray(1, 4).toString()).toBe('PNG')

  for (const bank of BANKS) {
    const res = await request.get(`/questions/${bank.module}.json`)
    expect(res.ok()).toBe(true)
    const served = (await res.json()) as {
      module: string
      levels: unknown[]
      questions: { id: string; code?: string; codeHtml?: string }[]
    }
    expect(served.module).toBe(bank.module)
    expect(served.levels).toEqual(bank.levels)
    expect(served.questions.map((q) => q.id)).toEqual(bank.questions.map((q) => q.id))
    for (const q of served.questions) {
      if (q.code) expect(q.codeHtml, q.id).toMatch(/^<pre class="shiki/)
      else expect(q.codeHtml, q.id).toBeUndefined()
    }
  }
})

test('an unknown path returns the 404 page', async ({ request }) => {
  const res = await request.get('/no-such-trail')
  expect(res.status()).toBe(404)
  const body = await res.text()
  expect(body).toContain('<h1')
  expect(body).toContain('Page not found')
  expect(body).toContain('<meta name="robots" content="noindex">')
})
