import { signal } from '@preact/signals'

/**
 * The open modal `<dialog>`, if any. A modal dialog makes the rest of the page inert and covers it
 * in the top layer, so live regions (toasts, announcements) render inside it while it is open.
 */
export const activeModal = signal<HTMLDialogElement | null>(null)
