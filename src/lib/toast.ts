import { signal } from '@preact/signals'
import type { ComponentChildren } from 'preact'

export interface Toast {
  id: number
  content: ComponentChildren
}

/** Toasts on screen, oldest first. `Toaster` renders them. */
export const toasts = signal<readonly Toast[]>([])

let nextId = 0

/** Shows a short message for `ms` milliseconds. */
export function toast(content: ComponentChildren, ms = 2600): void {
  const id = nextId++
  toasts.value = [...toasts.peek(), { id, content }]
  setTimeout(() => {
    toasts.value = toasts.peek().filter((t) => t.id !== id)
  }, ms)
}
