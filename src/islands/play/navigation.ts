import { trailHref } from '../../lib/routes.ts'
import type { PlayRequest } from '../../lib/selection.ts'
import type { LevelInfo, ModuleId } from '../../lib/types.ts'

/** Level titles and blurbs of every trail, passed from the page at build time. */
export type TrailLevels = Record<ModuleId, LevelInfo[]>

/** Where the player goes when leaving a session early: the trail map, or home. */
export function exitHref(req: PlayRequest): string {
  return req.mode === 'lesson' || req.mode === 'jump' || req.mode === 'practice'
    ? trailHref(req.mod)
    : '/'
}
