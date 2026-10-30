import { beforeEach, describe, expect, it } from 'vitest'

import { freshState, progress } from '../../lib/store.ts'

import { restoreBackup } from './backup.ts'

describe('restoreBackup', () => {
  beforeEach(() => {
    progress.value = freshState()
  })

  it('merges the backup into the current progress', () => {
    const current = freshState()
    current.xp = 50
    current.lessons = { 'css:1:0': { stars: 1, at: 5 } }
    progress.value = current

    const backup = freshState()
    backup.xp = 120
    backup.name = 'Mia'
    backup.lessons = { 'html:1:0': { stars: 3, at: 10 } }

    expect(restoreBackup(JSON.stringify(backup))).toBe(true)
    expect(progress.value.xp).toBe(120)
    expect(progress.value.name).toBe('Mia')
    expect(Object.keys(progress.value.lessons).sort()).toEqual(['css:1:0', 'html:1:0'])
  })

  it('rejects a file that is not a backup and keeps the progress', () => {
    const before = progress.value
    expect(restoreBackup('{"hello": "world"}')).toBe(false)
    expect(restoreBackup('not json')).toBe(false)
    expect(progress.value).toBe(before)
  })
})
