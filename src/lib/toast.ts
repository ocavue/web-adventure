import { signal } from '@preact/signals'
import { h, type ComponentChildren } from 'preact'
import * as v from 'valibot'

import { BadgeToast } from '../components/ui/BadgeToast.tsx'

import { BADGES } from './constants.ts'
import { sfx } from './sound.ts'

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

const PENDING_KEY = 'web-adventure:pending-toasts'

const PendingListSchema = v.array(
  v.object({ text: v.optional(v.string()), badge: v.optional(v.string()) }),
)

/** A toast that waits for the next page: a plain message, or a "Badge earned" toast. */
export type PendingToast = { text: string; badge?: undefined } | { badge: string; text?: undefined }

function readPending(): v.InferOutput<typeof PendingListSchema> {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    const parsed = v.safeParse(PendingListSchema, raw === null ? [] : JSON.parse(raw))
    return parsed.success ? parsed.output : []
  } catch {
    return []
  }
}

/** Keeps toasts for the next page, which shows them with `showPendingToasts()`. */
export function toastAfterNavigation(...items: PendingToast[]): void {
  if (items.length === 0) return
  try {
    const list = [...readPending(), ...items]
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(list))
  } catch {
    // Storage can be blocked. The toasts are then lost, which costs nothing.
  }
}

/** Shows the toasts that an earlier page kept with `toastAfterNavigation()`, one after another. */
export function showPendingToasts(): void {
  for (const [i, item] of readPending().entries()) {
    setTimeout(
      () => {
        if (item.text !== undefined) return toast(item.text)
        const badge = BADGES.find((b) => b.id === item.badge)
        if (!badge) return
        toast(h(BadgeToast, { badge }), 4200)
        sfx('badge')
      },
      300 + i * 600,
    )
  }
}
