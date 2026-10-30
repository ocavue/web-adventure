export function $<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(sel)
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function esc(s: unknown): string {
  return String(s).replaceAll(/[&<>"']/g, (c) => ESCAPES[c])
}

/** Escapes text and turns `backtick` spans into inline code. */
export function rich(s: string): string {
  return esc(s).replaceAll(/`([^`]+)`/g, '<code>$1</code>')
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

/** The local date as `YYYY-MM-DD`. */
export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Whole days from date `a` to date `b`, both `YYYY-MM-DD`. */
export function dayDiff(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000,
  )
}

export function shuffle<T>(arr: readonly T[], rnd: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** A deterministic random number generator seeded by a string. */
export function seeded(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
