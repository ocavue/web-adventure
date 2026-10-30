import { startLesson } from '../actions.ts'
import { GOALS, MODULES } from '../constants.ts'
import { closeModal, openModal, sfx, toast } from '../effects.ts'
import { buddySvg, icon } from '../icons.ts'
import { app, go, render, route, topbar } from '../router.ts'
import { combineStates, freshState, parseState, save, setState, state } from '../state.ts'
import type { Settings } from '../state.ts'
import type { ModuleId } from '../types.ts'
import { $, esc, todayStr } from '../utils.ts'

export function applySettings(): void {
  const t = state.settings.theme
  if (t === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', t)
  document.documentElement.classList.toggle('calm', state.settings.calm)
}

/** Makes the buttons in `#id` act as one segmented control. */
function wireSeg(m: HTMLElement, id: string, onPick: (b: HTMLElement) => void): void {
  $(`#${id}`, m)?.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button')
    if (!b) return
    for (const x of m.querySelectorAll(`#${id} button`))
      x.setAttribute('aria-pressed', String(x === b))
    onPick(b)
  })
}

function goalSeg(id: string, current: number): string {
  return `<div class="seg" id="${id}">${GOALS.map(([v, l]) => `<button aria-pressed="${current === v}" data-v="${v}">${l}<br><span class="muted" style="font-weight:400;font-size:12px">${v} XP</span></button>`).join('')}</div>`
}

function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `byte-trail-backup-${todayStr()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast('Backup downloaded. Keep it somewhere safe.')
}

async function restoreBackup(file: File): Promise<void> {
  const backup = parseState(await file.text())
  if (!backup) {
    toast('That file is not a Byte Trail backup.')
    return
  }
  setState(combineStates(state, backup))
  save()
  applySettings()
  closeModal()
  toast('Backup restored. Welcome back!')
}

/** After settings close, refresh the page behind them without replaying a results celebration. */
function afterSettings(): void {
  if (route.name === 'results') {
    const bar = document.createElement('div')
    bar.innerHTML = topbar()
    $('.topbar', app)?.replaceWith(bar.firstElementChild!)
    $('.nav [data-act="settings"]')?.focus()
  } else if (route.name !== 'lesson') {
    const wasProfile = route.name === 'profile'
    render()
    $(wasProfile ? 'main [data-act="settings"]' : '.nav [data-act="settings"]')?.focus()
  }
}

function wireReset(m: HTMLElement): void {
  const zone = $('#resetzone', m)!
  $('#reset', m)?.addEventListener('click', () => {
    zone.innerHTML = `<p style="font-size:14px;margin-bottom:8px">This erases your XP, stars, streak, and badges. It cannot be undone.</p><div class="grid-2"><button class="btn small" id="resetno">Keep my progress</button><button class="btn small bad" id="resetyes">Erase everything</button></div>`
    $('#resetno', m)?.addEventListener('click', () => {
      zone.innerHTML =
        '<p class="muted" style="font-size:14px">Nothing was changed. Your progress is safe.</p>'
    })
    $('#resetyes', m)?.addEventListener('click', () => {
      const next = freshState()
      next.settings = { ...state.settings }
      next.onboarded = true
      setState(next)
      save()
      closeModal()
      go('home')
      toast('Progress reset. A fresh trail awaits!')
    })
  })
}

export function openSettings(): void {
  const s = state.settings
  openModal(
    `<div class="mh"><h2>Settings</h2><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="field"><label for="nm">Trail name</label><input id="nm" class="text-input" maxlength="24" value="${esc(state.name)}" placeholder="What should we call you?"></div>
    <div class="field"><span class="lbl">Daily goal</span>${goalSeg('goalseg', state.goal)}</div>
    <div class="field"><span class="lbl">Theme</span><div class="seg" id="themeseg">${(['system', 'light', 'dark'] as const).map((v) => `<button aria-pressed="${s.theme === v}" data-v="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
    <div class="switch-row"><span><b>Sound effects</b></span><button class="switch" role="switch" id="snd" aria-checked="${s.sound}" aria-label="Sound effects"></button></div>
    <div class="switch-row"><span><b>Reduce motion</b><br><span class="muted" style="font-size:13px">Turns off confetti and bouncy animations</span></span><button class="switch" role="switch" id="calm" aria-checked="${s.calm}" aria-label="Reduce motion"></button></div>
    <div class="field"><span class="lbl">Backup</span><p class="muted" style="font-size:13px">Your progress lives in this browser. Download a backup to keep it safe or move it to another device.</p>
      <div class="grid-2"><button class="btn small" id="backup">Download backup</button><button class="btn small" id="restore">Restore backup</button></div>
      <input type="file" id="restorefile" accept="application/json,.json" hidden></div>
    <button class="btn primary wide" data-act="close">Done</button>
    <div class="danger-zone"><div id="resetzone"><button class="btn ghost small" id="reset">Reset all progress</button></div></div>`,
    {
      onMount: (m) => {
        $<HTMLInputElement>('#nm', m)?.addEventListener('change', (e) => {
          state.name = (e.target as HTMLInputElement).value.trim().slice(0, 24)
          save()
        })
        wireSeg(m, 'goalseg', (b) => {
          state.goal = Number(b.dataset.v)
          save()
        })
        wireSeg(m, 'themeseg', (b) => {
          s.theme = b.dataset.v as Settings['theme']
          applySettings()
          save()
        })
        $('#snd', m)?.addEventListener('click', (e) => {
          s.sound = !s.sound
          ;(e.currentTarget as HTMLElement).setAttribute('aria-checked', String(s.sound))
          save()
          sfx('good')
        })
        $('#calm', m)?.addEventListener('click', (e) => {
          s.calm = !s.calm
          ;(e.currentTarget as HTMLElement).setAttribute('aria-checked', String(s.calm))
          applySettings()
          save()
        })
        const file = $<HTMLInputElement>('#restorefile', m)!
        $('#backup', m)?.addEventListener('click', downloadBackup)
        $('#restore', m)?.addEventListener('click', () => file.click())
        file.addEventListener('change', () => {
          const f = file.files?.[0]
          if (f) void restoreBackup(f)
        })
        wireReset(m)
      },
      onClose: afterSettings,
    },
  )
}

export function onboarding(): void {
  let goal = 80
  let first: ModuleId = 'html'
  openModal(
    `<div class="buddy">${buddySvg()}<div class="bubble">Hi! I am Bit, your trail buddy. I will cheer you on.</div></div>
    <h2>Welcome to Byte Trail</h2>
    <p class="muted intro">Short, friendly lessons on HTML, CSS, JavaScript, TypeScript, the web platform, React, and Git. Wrong answers never cost you anything here.</p>
    <div class="field"><label for="onm">What should we call you?</label><input id="onm" class="text-input" maxlength="24" placeholder="Your trail name" ${matchMedia('(pointer: coarse)').matches ? '' : 'autofocus'}></div>
    <div class="field"><span class="lbl">Daily goal</span>${goalSeg('ogoal', goal)}
      <p class="muted" style="font-size:13px">Steady is about one lesson a day.</p></div>
    <div class="field"><span class="lbl">Where do you want to start? <span class="muted" style="font-weight:400">(HTML is the classic first step)</span></span><div class="pick-trail" id="otrail">${MODULES.map((x, i) => `<button aria-pressed="${i === 0}" data-mod="${x.id}" style="--mc:var(--m-${x.id})"><span aria-hidden="true" class="blaze sm">${esc(x.glyph)}</span>${esc(x.name)}</button>`).join('')}</div>
      </div>
    <div class="actions-sticky"><button class="btn primary wide" id="obgo">${icon('play')}Start my first lesson</button>
    <button class="btn ghost small" id="oblook" style="justify-self:center">Look around first</button></div>`,
    {
      onMount: (m) => {
        m.classList.add('onb')
        wireSeg(m, 'otrail', (b) => {
          first = b.dataset.mod as ModuleId
        })
        wireSeg(m, 'ogoal', (b) => {
          goal = Number(b.dataset.v)
        })
        const name = $<HTMLInputElement>('#onm', m)!
        const done = (startNow: boolean) => {
          state.name = name.value.trim().slice(0, 24)
          state.goal = goal
          state.onboarded = true
          save()
          closeModal()
          if (startNow) startLesson(first, 1, 0)
          else render()
        }
        $('#obgo', m)?.addEventListener('click', () => done(true))
        $('#oblook', m)?.addEventListener('click', () => done(false))
        name.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            $('#obgo', m)?.focus()
          }
        })
      },
    },
  )
}
