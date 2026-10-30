import { progress } from './store.ts'

export type Sound = 'good' | 'bad' | 'done' | 'badge' | 'tap'

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

/** Plays a short synthesized sound, unless the player turned sound off. */
export function sfx(kind: Sound): void {
  if (!progress.peek().settings.sound) return
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
