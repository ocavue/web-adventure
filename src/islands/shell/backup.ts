import { combineStates, parseState, progress, replaceProgress } from '../../lib/store.ts'
import { todayStr } from '../../lib/utils.ts'

/** Saves the progress as a JSON file. */
export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(progress.peek(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `byte-trail-backup-${todayStr()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Merges a backup file into the current progress, so nothing earned on either side is lost.
 * Returns `false` when the text is not a Byte Trail backup.
 */
export function restoreBackup(json: string): boolean {
  const backup = parseState(json)
  if (!backup) return false
  replaceProgress(combineStates(progress.peek(), backup))
  return true
}
