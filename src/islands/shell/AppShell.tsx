import { useEffect } from 'preact/hooks'

import { Announcer } from '../../components/ui/Announcer.tsx'
import { Toaster } from '../../components/ui/Toaster.tsx'
import { useProgress } from '../../lib/hooks.ts'
import { useApplySettings } from '../../lib/theme.ts'
import { showPendingToasts } from '../../lib/toast.ts'

import { OnboardingDialog } from './OnboardingDialog.tsx'
import { SettingsDialog } from './SettingsDialog.tsx'
import { TopBar } from './TopBar.tsx'

/** The app shell on every page but the lesson: top bar, settings, onboarding, toasts, announcer. */
export function AppShell() {
  const state = useProgress()
  // Badges earned in a lesson the player left early wait for the next page.
  useEffect(showPendingToasts, [])
  useApplySettings()
  return (
    <>
      <TopBar state={state} />
      <SettingsDialog />
      <OnboardingDialog />
      <Toaster />
      <Announcer />
    </>
  )
}
