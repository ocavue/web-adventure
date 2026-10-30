import type { Question, Selection } from './types.ts'
import { esc, rich } from './utils.ts'

/** Normalizes a typed answer: trims quotes, backticks, a trailing semicolon, and extra spaces. */
export function norm(s: string): string {
  return s
    .trim()
    .replaceAll(/^`|`$/g, '')
    .replace(/;$/, '')
    .replaceAll(/\s+/g, ' ')
    .replace(/^['"](.*)['"]$/, '$1')
    .trim()
}

/** camelCase identifiers in code modules and CLI flags must match case exactly. */
function caseSensitive(q: Question, answer: string): boolean {
  return (
    (['js', 'ts', 'react'].includes(q.module) && /[a-z][A-Z]|[A-Z][a-z]/.test(answer)) ||
    /(?:^|\s)-[a-z]\b/i.test(answer)
  )
}

export function isCorrect(q: Question, sel: Selection): boolean {
  switch (q.type) {
    case 'tf':
    case 'single':
      return sel === q.answer
    case 'multi': {
      if (!Array.isArray(sel)) return false
      const a = new Set(q.answer)
      return sel.length === a.size && sel.every((x) => a.has(x))
    }
    case 'fill': {
      const v = norm(String(sel ?? ''))
      return q.answer.some((a) => {
        return caseSensitive(q, a) ? norm(a) === v : norm(a).toLowerCase() === v.toLowerCase()
      })
    }
  }
}

/** A fill answer that is only wrong because of letter case. */
export function isCaseSlip(q: Question, sel: Selection): boolean {
  if (q.type !== 'fill' || isCorrect(q, sel)) return false
  const v = norm(String(sel ?? '')).toLowerCase()
  return q.answer.some((a) => norm(a).toLowerCase() === v)
}

export function correctText(q: Question): string {
  switch (q.type) {
    case 'tf':
      return q.answer ? 'True' : 'False'
    case 'fill':
      return `<code>${esc(q.answer[0])}</code>`
    case 'multi':
      return q.answer.map((i) => rich(q.choices[i])).join(', ')
    case 'single':
      return rich(q.choices[q.answer])
  }
}
