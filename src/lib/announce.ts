import { signal } from '@preact/signals'

/** The text of the assertive live region. `Announcer` renders it. */
export const announcement = signal('')

let timer: ReturnType<typeof setTimeout> | undefined

/** Reads text to screen readers. */
export function announce(text: string): void {
  clearTimeout(timer)
  // Clearing first makes screen readers repeat a message that did not change.
  announcement.value = ''
  timer = setTimeout(() => {
    announcement.value = text
  }, 30)
}
