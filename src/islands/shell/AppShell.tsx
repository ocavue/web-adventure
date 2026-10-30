import { useEffect } from 'preact/hooks'

import { Announcer } from '../../components/ui/Announcer.tsx'
import { Toaster } from '../../components/ui/Toaster.tsx'
import { useProgressState } from '../../lib/hooks.ts'
import { useApplySettings } from '../../lib/theme.ts'
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
  const { state, ready } = useProgressState()
  // Badges earned in a lesson the player left early wait for the next page.
  useEffect(showPendingToasts, [])
  useApplySettings()
  return (
    <>
      <TopBar state={state} ready={ready} />
      <SettingsDialog />
      {onboarding && <OnboardingDialog state={state} ready={ready} />}
      <Toaster />
      <Announcer />
    </>
  )
}
