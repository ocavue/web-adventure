import { state } from './state.ts'
import { $, pick } from './utils.ts'

export function reducedMotion(): boolean {
  return state.settings.calm || matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Reads text to screen readers. */
export function announce(text: string): void {
  const el = $('#sr')
  if (!el) return
  el.textContent = ''
  setTimeout(() => {
    el.textContent = text
  }, 30)
}

type Sound = 'good' | 'bad' | 'done' | 'badge' | 'tap'

const NOTES: Record<Sound, [frequency: number, delay: number][]> = {
  good: [
    [660, 0],
    [990, 0.08],
  ],
  bad: [
    [220, 0],
    [196, 0.12],
  ],
  done: [
    [523, 0],
    [659, 0.1],
    [784, 0.2],
    [1047, 0.32],
  ],
  badge: [
    [784, 0],
    [1175, 0.1],
  ],
  tap: [[440, 0]],
}

let audioCtx: AudioContext | null = null

export function sfx(kind: Sound): void {
  if (!state.settings.sound) return
  try {
    audioCtx ??= new AudioContext()
    const now = audioCtx.currentTime
    for (const [f, t] of NOTES[kind]) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.type = kind === 'bad' ? 'triangle' : 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, now + t)
      g.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.04 : 0.13, now + t + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + (kind === 'bad' ? 0.3 : 0.22))
      o.connect(g).connect(audioCtx.destination)
      o.start(now + t)
      o.stop(now + t + 0.35)
    }
  } catch {
    // Some browsers block audio until the first user gesture.
  }
}

export function confetti(power = 1): void {
  if (reducedMotion()) return
  const c = document.createElement('canvas')
  c.className = 'confetti'
  document.body.append(c)
  const ctx = c.getContext('2d')
  if (!ctx) return c.remove()
  const dpr = Math.min(2, devicePixelRatio || 1)
  c.width = innerWidth * dpr
  c.height = innerHeight * dpr
  ctx.scale(dpr, dpr)
  const css = getComputedStyle(document.documentElement)
  const colors = [
    '--blaze',
    '--m-html',
    '--m-css',
    '--m-web',
    '--m-react',
    '--m-git',
    '--m-ts',
  ].map((v) => css.getPropertyValue(v).trim())
  const parts = Array.from({ length: Math.round(140 * power) }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    s: 5 + Math.random() * 6,
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    c: pick(colors),
    square: Math.random() < 0.5,
  }))
  let frame = 0
  const tick = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of parts) {
      p.vy += 0.35
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c
      if (p.square) {
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.6)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.s / 2.4, 0, 7)
        ctx.fill()
      }
      ctx.restore()
    }
    if (++frame < 170) requestAnimationFrame(tick)
    else c.remove()
  }
  requestAnimationFrame(tick)
}

export function clearEffects(keepConfetti = false): void {
  $('#toasts')?.replaceChildren()
  if (!keepConfetti) for (const c of document.querySelectorAll('canvas.confetti')) c.remove()
}

export function toast(html: string, ms = 2600): void {
  const el = document.createElement('div')
  el.className = 'toast'
  el.innerHTML = html
  $('#toasts')?.append(el)
  setTimeout(() => el.remove(), ms)
}

let modalReturnFocus: Element | null = null
let modalOnClose: (() => void) | null = null

export function openModal(
  html: string,
  options: { onMount?: (modal: HTMLElement) => void; onClose?: () => void } = {},
): void {
  closeModal()
  modalReturnFocus = document.activeElement
  const s = document.createElement('div')
  s.className = 'scrim'
  s.id = 'scrim'
  s.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`
  s.addEventListener('mousedown', (e) => {
    if (e.target === s && state.onboarded) closeModal()
  })
  document.body.append(s)
  options.onMount?.(s.firstElementChild as HTMLElement)
  modalOnClose = options.onClose ?? null
  const f = $('[autofocus]', s) ?? $('button, input', s)
  f?.focus()
}

export function closeModal(): void {
  const scrim = $('#scrim')
  if (!scrim) return
  scrim.remove()
  const onClose = modalOnClose
  modalOnClose = null
  if (modalReturnFocus instanceof HTMLElement && modalReturnFocus.isConnected)
    modalReturnFocus.focus()
  modalReturnFocus = null
  onClose?.()
}

export function modalOpen(): boolean {
  return !!$('#scrim')
}

/** Keeps keyboard focus inside the open modal. Returns `true` when it handled the key. */
export function trapFocus(e: KeyboardEvent): boolean {
  const scrim = $('#scrim')
  if (e.key !== 'Tab' || !scrim) return false
  const f = [...scrim.querySelectorAll<HTMLElement>('button:not([disabled]), input')]
  if (f.length === 0) return true
  const first = f[0]
  const last = f[f.length - 1]
  if (!scrim.contains(document.activeElement)) {
    e.preventDefault()
    first.focus()
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
  return true
}
