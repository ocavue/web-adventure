import { signal } from '@preact/signals'

/** Whether the settings dialog is open. The app shell renders it. */
export const settingsOpen = signal(false)

/** Opens the settings dialog from any island. */
export function openSettings(): void {
  settingsOpen.value = true
}
