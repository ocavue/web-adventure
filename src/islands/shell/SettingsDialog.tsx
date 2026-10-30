import * as stylex from '@stylexjs/stylex'
import { useRef, useState } from 'preact/hooks'

import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.tsx'
import { Switch } from '../../components/ui/Switch.tsx'
import { sfx } from '../../lib/sound.ts'
import { freshState, progress, replaceProgress, updateProgress } from '../../lib/store.ts'
import { toast, toastAfterNavigation } from '../../lib/toast.ts'
import type { Settings } from '../../lib/types.ts'
import { settingsOpen } from '../../lib/ui-state.ts'
import { colors } from '../../styles/tokens.stylex.ts'

import { downloadBackup, restoreBackup } from './backup.ts'
import { form } from './form.styles.ts'
import { GOAL_OPTIONS } from './goals.tsx'

const styles = stylex.create({
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  danger: {
    borderTopWidth: 1.5,
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
    paddingTop: 14,
    display: 'grid',
    gap: 10,
  },
  warn: { fontSize: 14, marginBottom: 8 },
  safe: { fontSize: 14, color: colors.ink2 },
})

const THEME_OPTIONS: { value: Settings['theme']; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function close(): void {
  settingsOpen.value = false
}

function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  updateProgress((d) => {
    d.settings[key] = value
  })
}

function ResetZone() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'kept'>('idle')
  if (step === 'idle') {
    return (
      <div>
        <Button variant="ghost" size="small" onClick={() => setStep('confirm')}>
          Reset all progress
        </Button>
      </div>
    )
  }
  if (step === 'kept') {
    return <p {...stylex.props(styles.safe)}>Nothing was changed. Your progress is safe.</p>
  }
  return (
    <div>
      <p {...stylex.props(styles.warn)}>
        This erases your XP, stars, streak, and badges. It cannot be undone.
      </p>
      <div {...stylex.props(form.grid2)}>
        <Button size="small" onClick={() => setStep('kept')}>
          Keep my progress
        </Button>
        <Button
          size="small"
          variant="bad"
          onClick={() => {
            const next = freshState()
            next.settings = { ...progress.peek().settings }
            next.onboarded = true
            replaceProgress(next)
            // A fresh trail starts at the trailhead.
            toastAfterNavigation({ text: 'Progress reset. A fresh trail awaits!' })
            location.assign('/')
          }}
        >
          Erase everything
        </Button>
      </div>
    </div>
  )
}

function SettingsForm() {
  const p = progress.value
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <div {...stylex.props(form.field)}>
        <label for="nm" {...stylex.props(form.label)}>
          Trail name
        </label>
        <input
          id="nm"
          maxLength={24}
          defaultValue={p.name}
          placeholder="What should we call you?"
          onChange={(e) => {
            const name = e.currentTarget.value.trim().slice(0, 24)
            updateProgress((d) => {
              d.name = name
            })
          }}
          {...stylex.props(form.input)}
        />
      </div>
      <div {...stylex.props(form.field)}>
        <span id="goal-label" {...stylex.props(form.label)}>
          Daily goal
        </span>
        <SegmentedControl
          labelledBy="goal-label"
          options={GOAL_OPTIONS}
          value={p.goal}
          onChange={(goal) => {
            updateProgress((d) => {
              d.goal = goal
            })
          }}
        />
      </div>
      <div {...stylex.props(form.field)}>
        <span id="theme-label" {...stylex.props(form.label)}>
          Theme
        </span>
        <SegmentedControl
          labelledBy="theme-label"
          options={THEME_OPTIONS}
          value={p.settings.theme}
          onChange={(theme) => setSetting('theme', theme)}
        />
      </div>
      <div {...stylex.props(styles.switchRow)}>
        <span>
          <b>Sound effects</b>
        </span>
        <Switch
          id="snd"
          label="Sound effects"
          checked={p.settings.sound}
          onChange={(on) => {
            setSetting('sound', on)
            sfx('good')
          }}
        />
      </div>
      <div {...stylex.props(styles.switchRow)}>
        <span>
          <b>Reduce motion</b>
          <br />
          <span {...stylex.props(form.note)}>Turns off confetti and bouncy animations</span>
        </span>
        <Switch
          id="calm"
          label="Reduce motion"
          checked={p.settings.calm}
          onChange={(on) => setSetting('calm', on)}
        />
      </div>
      <div {...stylex.props(form.field)}>
        <span {...stylex.props(form.label)}>Backup</span>
        <p {...stylex.props(form.note)}>
          Your progress lives in this browser. Download a backup to keep it safe or move it to
          another device.
        </p>
        <div {...stylex.props(form.grid2)}>
          <Button
            id="backup"
            size="small"
            onClick={() => {
              downloadBackup()
              toast('Backup downloaded. Keep it somewhere safe.')
            }}
          >
            Download backup
          </Button>
          <Button id="restore" size="small" onClick={() => fileRef.current?.click()}>
            Restore backup
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          id="restorefile"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const input = e.currentTarget
            const f = input.files?.[0]
            if (!f) return
            const text = await f.text()
            input.value = ''
            if (restoreBackup(text)) {
              close()
              toast('Backup restored. Welcome back!')
            } else {
              toast('That file is not a Byte Trail backup.')
            }
          }}
        />
      </div>
      <Button variant="primary" wide onClick={close}>
        Done
      </Button>
      <div {...stylex.props(styles.danger)}>
        <ResetZone />
      </div>
    </>
  )
}

/** The settings dialog. Open it with `openSettings()` from `src/lib/ui-state.ts`. */
export function SettingsDialog() {
  return (
    <Dialog open={settingsOpen.value} onClose={close} title="Settings">
      <SettingsForm />
    </Dialog>
  )
}
