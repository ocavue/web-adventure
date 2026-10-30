import type { TrailSummary } from './bank.server.ts'
import { LESSONS_PER_LEVEL, LEVELS, MOD, MODULES, Q_PER_LESSON } from './constants.ts'
import type { ModuleId } from './types.ts'

export const SITE_URL = 'https://web-adventure.pages.dev'

const SITE_NAME = 'Byte Trail'
const SITE_DESCRIPTION =
  'A playful quiz site for beginner web developers. Learn HTML, CSS, JavaScript, TypeScript, React, Git, and how the web works, one small lesson at a time.'

/** Meta descriptions of the trail pages. Each one names the themes of the 5 levels. */
export const TRAIL_DESCRIPTIONS: Record<ModuleId, string> = {
  html: 'Learn HTML step by step: page structure, links and images, semantic landmarks, friendly forms and tables, then media and accessibility for everyone.',
  css: 'Learn CSS step by step: selectors and colors, the box model and units, the cascade, flexbox and grid, then media queries, variables, and transitions.',
  js: 'Learn JavaScript step by step: values and variables, conditions and loops, functions and arrays, objects and JSON, then classes, errors, and async code.',
  ts: 'Learn TypeScript step by step: your first type annotations, interfaces and aliases, unions and narrowing, generics, then utility types and tsconfig.',
  web: 'Learn how the web works: browsers and DevTools, HTTP and DNS, DOM scripting, fetch and browser storage, then pages that are fast, accessible, and safe.',
  react:
    'Learn React step by step: components and JSX, props and lists, state and events, effects and refs, then context, custom hooks, and memoization.',
  git: 'Learn Git and dev tools step by step: the terminal and commits, history and diffs, branches and merges, remotes and pull requests, then pro habits.',
}

const provider = { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` }

function trailUrl(mod: ModuleId): string {
  return `${SITE_URL}/trail/${mod}`
}

/** Structured data for the home page: the site and the list of its trails. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
      },
      {
        '@type': 'ItemList',
        name: 'Trails',
        itemListElement: MODULES.map((m, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: m.name,
          url: trailUrl(m.id),
        })),
      },
    ],
  }
}

/** Structured data for a trail page, as a schema.org `Course`. */
export function trailJsonLd(mod: ModuleId, summary: TrailSummary): Record<string, unknown> {
  const lessons = LEVELS * LESSONS_PER_LEVEL
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${MOD[mod].name} trail`,
    description: TRAIL_DESCRIPTIONS[mod],
    url: trailUrl(mod),
    inLanguage: 'en',
    provider,
    educationalLevel: 'Beginner',
    isAccessibleForFree: true,
    numberOfLessons: lessons,
    teaches: summary.levels.map((level) => level.title),
    offers: { '@type': 'Offer', category: 'Free', price: 0, priceCurrency: 'USD' },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      // Self-paced: there is no schedule, only an estimate of about 30 seconds per question.
      courseWorkload: `PT${Math.round((lessons * Q_PER_LESSON) / 2)}M`,
    },
  }
}
