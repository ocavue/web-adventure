import { effect } from '@preact/signals'
import { useEffect } from 'preact/hooks'

import { Announcer } from '../../components/ui/Announcer.tsx'
import { Toaster } from '../../components/ui/Toaster.tsx'
import { useProgress } from '../../lib/hooks.ts'
import { progress, progressReady } from '../../lib/store.ts'
import { applySettings } from '../../lib/theme.ts'
import { showPendingToasts } from '../../lib/toast.ts'

import { OnboardingDialog } from './OnboardingDialog.tsx'
import { SettingsDialog } from './SettingsDialog.tsx'
import { TopBar } from './TopBar.tsx'

export interface AppShellProps {
  /** Shows the welcome dialog to a new player. */
  onboarding?: boolean
}

/** The app shell on every page but the lesson: top bar, settings, onboarding, toasts, announcer. */
export function AppShell({ onboarding = false }: AppShellProps) {
  const state = useProgress()
  // Badges earned in a lesson the player left early wait for the next page.
  useEffect(showPendingToasts, [])
  // Runs after `useProgress` loads the stored state, so the theme from the head script is kept.
  useEffect(() => {
    return effect(() => {
      if (progressReady.value) applySettings(progress.value.settings)
    })
  }, [])
  return (
    <>
      <TopBar state={state} />
      <SettingsDialog />
      {onboarding && <OnboardingDialog />}
      <Toaster />
      <Announcer />
    </>
  )
}
