import type { ModuleId } from './types.ts'

// Pages are built as `<path>/index.html`, so every internal link ends with a slash.
// Cloudflare Pages redirects the slash-less form, which would cost a round trip.

export const HOME_HREF = '/'
export const PROFILE_HREF = '/profile/'
export const PLAY_PATH = '/play/'

export function trailHref(mod: ModuleId): string {
  return `/trail/${mod}/`
}

export function certHref(mod: ModuleId): string {
  return `/cert/${mod}/`
}
