import { correctText, isCaseSlip, isCorrect } from './answer.ts'
import { codeBlock } from './code.ts'
import {
  BADGES,
  COMBO_PRAISE,
  LEVELS,
  MOD,
  MODULES,
  PRAISE,
  REPO_URL,
  SOFT,
  SOFT_TAIL,
} from './constants.ts'
import { announce, closeModal, openModal, reducedMotion, sfx, toast } from './effects.ts'
import { buddySvg, icon } from './icons.ts'
import {
  addXp,
  currentStreak,
  levelDone,
  lkey,
  modComplete,
  modStats,
  summitCount,
  touchStreak,
} from './progress.ts'
import { app, go, route } from './router.ts'
import { save, state } from './state.ts'
import type { ModuleId, Question, Selection } from './types.ts'
import { $, esc, pick, rich, shuffle, todayStr } from './utils.ts'

export type SessionKind = 'lesson' | 'jump' | 'practice' | 'daily' | 'review'

export interface SessionMeta {
  mod?: ModuleId
  level?: number
  lesson?: number
  replay?: boolean
}

/** A question as it appears in a session, with its shuffled choice order. */
type LessonItem = Question & { order?: number[]; retry?: boolean }

interface AnswerResult {
  id: string
  ok: boolean
  first: boolean
  retry: boolean
}

interface Session {
  kind: SessionKind
  meta: SessionMeta
  queue: LessonItem[]
  idx: number
  total: number
  firstTry: Record<string, boolean>
  results: AnswerResult[]
  combo: number
  bestCombo: number
  xp: number
  hints: number
  hintShown?: number
  started: number
  xpBefore: number
  badges0: string[]
  freezes0: number
  answered: boolean
  selection: Selection
  last?: { ok: boolean; xp: number; caseSlip: boolean }
  fixed: number
  goalHit?: boolean
}

export interface LessonResult {
  kind: SessionKind
  meta: SessionMeta
  firstOk: number
  firstTotal: number
  acc: number
  secs: number
  xp: number
  xpBefore: number
  bestCombo: number
  fixed: number
  results: AnswerResult[]
  newBadges: string[]
  stars?: number
  firstClear?: boolean
  campCleared?: number
  summit?: boolean
  passed?: boolean
  goalHit?: boolean
  streak: number
  freezeEarned: boolean
}

let session: Session | null = null
export let lastResult: LessonResult | null = null

/** Wrong answers come back at the end of these sessions. */
function requeues(kind: SessionKind): boolean {
  return kind === 'lesson' || kind === 'practice' || kind === 'review'
}

function award(id: string): void {
  if (Object.hasOwn(state.badges, id)) return
  state.badges[id] = Date.now()
  // During a session, new badges show on the results screen instead.
  if (session) return
  const b = BADGES.find((x) => x.id === id)
  if (!b) return
  toast(
    `<div class="medal" style="--bc:${b.color};background:${b.color};color:#fff">${icon(b.icon)}</div><div><b>Badge earned: ${esc(b.name)}</b>${esc(b.desc)}</div>`,
    4200,
  )
  sfx('badge')
}

function prepQuestion(q: Question): LessonItem {
  if (q.type === 'single' || q.type === 'multi')
    return { ...q, order: shuffle(q.choices.map((_, i) => i)) }
  return { ...q }
}

export function startSession(kind: SessionKind, questions: Question[], meta: SessionMeta): void {
  const qs = questions.map((q) => prepQuestion(q))
  session = {
    kind,
    meta,
    queue: qs,
    idx: 0,
    total: qs.length,
    firstTry: {},
    results: [],
    combo: 0,
    bestCombo: 0,
    xp: 0,
    hints: 0,
    started: Date.now(),
    xpBefore: state.xp,
    badges0: Object.keys(state.badges),
    freezes0: state.freezes ?? 0,
    answered: false,
    selection: null,
    fixed: 0,
  }
  go('lesson')
}

function sessionTitle(s: Session): string {
  switch (s.kind) {
    case 'daily':
      return 'Daily challenge'
    case 'review':
      return 'Review'
    case 'jump':
      return `Jump test: level ${s.meta.level}`
    case 'practice':
      return 'Practice'
    case 'lesson':
      return `Level ${s.meta.level} · Lesson ${(s.meta.lesson ?? 0) + 1}`
  }
}

export function viewLesson(): void {
  const s = session
  if (!s) return go('home')
  const q = s.queue[s.idx]
  const progress = lessonProgress(s)
  const tag = q.retry
    ? `<span class="qtag retry">${icon('repeat')}Second try</span>`
    : state.seen[q.id]?.miss && s.kind !== 'lesson'
      ? `<span class="qtag retry">${icon('repeat')}Second chance: you missed this before</span>`
      : ''
  const sub =
    q.type === 'multi' && !/select all/i.test(q.prompt)
      ? '<p class="q-sub">Select all that apply.</p>'
      : q.type === 'fill'
        ? '<p class="q-sub">Type your answer.</p>'
        : ''
  app.innerHTML = `<div class="lesson" style="--mc:var(--m-${q.module})">
    <div class="lesson-top">
      <button class="icon-btn" data-lact="quit" aria-label="Quit lesson">${icon('x')}</button>
      <div class="bar" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}"><i style="width:${progress * 100}%"></i></div>
      <span class="combo ${s.combo >= 2 ? '' : 'cold'}" id="combo" title="Correct in a row">${icon('flame')}${s.combo}</span>
    </div>
    <main class="q-area" id="qarea">
      <div class="q-meta">
        <span class="qtag mod">${esc(MOD[q.module].name)}</span>
        <span class="qtag">${esc(q.topic)}</span>
        ${tag}
        <span class="qtag" style="margin-left:auto;background:none">${esc(sessionTitle(s))}</span>
      </div>
      <h1 class="q-prompt" id="qprompt" tabindex="-1">${rich(q.prompt)}</h1>
      ${sub}
      ${q.code ? codeBlock(q.code, q.lang) : ''}
      <div id="answer">${answerHtml(s, q)}</div>
      <div id="hintslot" aria-live="polite"></div>
    </main>
    <div class="dock" id="dock"><div class="inner" id="dockinner"></div></div>
  </div>`
  renderDock()
  wireAnswer(s, q)
  $('#qprompt')?.focus({ preventScroll: true })
}

function lessonProgress(s: Session): number {
  const done = requeues(s.kind) ? s.results.filter((r) => r.ok).length : s.results.length
  return Math.min(1, done / s.total)
}

function answerHtml(s: Session, q: LessonItem): string {
  if (q.type === 'tf') {
    return `<div class="tf-row" role="radiogroup" aria-label="True or false">
      <button class="choice" role="radio" aria-checked="${s.selection === true}" data-val="true"><span class="key">T</span><span class="txt">True</span></button>
      <button class="choice" role="radio" aria-checked="${s.selection === false}" data-val="false"><span class="key">F</span><span class="txt">False</span></button></div>`
  }
  if (q.type === 'fill') {
    const value = typeof s.selection === 'string' ? s.selection : ''
    return `<div class="fill-box"><label class="sr-only" for="fill">Your answer</label><input id="fill" class="fill-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type here..." value="${esc(value)}"></div>`
  }
  const multi = q.type === 'multi'
  const picked = Array.isArray(s.selection) ? s.selection : []
  return `<div class="choices" role="${multi ? 'group' : 'radiogroup'}" aria-label="Answers">${(
    q.order ?? []
  )
    .map((ci, pos) => {
      const sel = multi ? picked.includes(ci) : s.selection === ci
      return `<button class="choice ${multi ? 'multi' : ''}" ${multi ? `aria-pressed="${sel}"` : `role="radio" aria-checked="${sel}"`} data-ci="${ci}"><span class="key">${pos + 1}</span><span class="txt">${rich(q.choices[ci])}</span><span class="mark"></span></button>`
    })
    .join('')}</div>`
}

function toggle(list: Selection, ci: number): number[] {
  const sel = new Set(Array.isArray(list) ? list : [])
  if (sel.has(ci)) sel.delete(ci)
  else sel.add(ci)
  return [...sel]
}

function wireAnswer(s: Session, q: LessonItem): void {
  $('#answer')?.addEventListener('click', (e) => {
    if (s.answered) return
    const b = (e.target as Element).closest<HTMLElement>('.choice')
    if (!b) return
    sfx('tap')
    if (q.type === 'tf') s.selection = b.dataset.val === 'true'
    else if (q.type === 'multi') s.selection = toggle(s.selection, Number(b.dataset.ci))
    else s.selection = Number(b.dataset.ci)
    refreshSelection(s, q)
  })
  const input = $<HTMLInputElement>('#fill')
  if (input) {
    input.addEventListener('input', () => {
      s.selection = input.value
      renderDock()
    })
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      e.stopPropagation()
      if (s.answered) next()
      else check()
    })
    setTimeout(() => input.focus({ preventScroll: true }), 50)
  }
}

function refreshSelection(s: Session, q: LessonItem): void {
  for (const b of document.querySelectorAll<HTMLElement>('#answer .choice')) {
    if (q.type === 'tf')
      b.setAttribute('aria-checked', String(s.selection === (b.dataset.val === 'true')))
    else if (q.type === 'multi')
      b.setAttribute(
        'aria-pressed',
        String(Array.isArray(s.selection) && s.selection.includes(Number(b.dataset.ci))),
      )
    else b.setAttribute('aria-checked', String(s.selection === Number(b.dataset.ci)))
  }
  renderDock()
}

function hasSelection(s: Session): boolean {
  const v = s.selection
  return (
    v !== null && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'string' && !v.trim())
  )
}

function renderDock(): void {
  const s = session
  const dock = $('#dock')
  const inner = $('#dockinner')
  if (!s || !dock || !inner) return
  const q = s.queue[s.idx]
  if (!s.answered) {
    dock.className = 'dock'
    const usedHint = s.hintShown === s.idx
    const hintTitle = requeues(s.kind)
      ? 'Press H. Hints are free. A correct answer after a hint earns 6 XP instead of 10.'
      : 'Press H. Hints are free here.'
    const keys =
      q.type === 'tf'
        ? 'Keys: T / F, Enter, H for hint'
        : q.type === 'fill'
          ? 'Enter to check'
          : 'Keys: 1-4, Enter, H for hint'
    inner.innerHTML = `<button class="btn ghost" data-lact="hint" title="${hintTitle}" ${usedHint ? 'disabled' : ''}>${icon('bulb')}Hint</button>
      <span class="kbd-hint">${keys}</span>
      <div class="actions"><button class="btn primary" data-lact="check" ${hasSelection(s) ? '' : 'disabled'}>Check</button></div>`
    fitDock()
    return
  }
  const r = s.last!
  dock.className = `dock ${r.ok ? 'good' : 'bad'}`
  const combo = r.ok && COMBO_PRAISE[s.combo]
  const head = r.ok
    ? combo || pick(PRAISE)
    : r.caseSlip
      ? 'So close! Check the capital letters.'
      : pick(SOFT)
  const ans = r.ok ? '' : `<div class="ans">Correct answer: ${correctText(q)}</div>`
  const tail = r.ok
    ? ''
    : `<div class="muted" style="margin-top:4px;font-size:14px">${esc(requeues(s.kind) ? pick(SOFT_TAIL) : 'Read the explanation. It sticks better than you think.')}</div>`
  inner.innerHTML = `<div class="feedback">
      <div class="fh">${buddySvg(combo ? 'wow' : r.ok ? 'happy' : 'calm')}<span>${esc(head)}</span>${r.xp ? `<span class="xp-gain">+${r.xp} XP</span>` : ''}</div>
      <div class="fx">${ans}<div>${rich(q.explain)}</div>${tail}</div>
      <button class="flag-link" data-lact="flag">Report a problem with this question</button>
    </div>
    <div class="actions"><button class="btn ${r.ok ? 'good' : 'bad'}" data-lact="next" id="nextbtn">Continue</button></div>`
  $('#nextbtn')?.focus({ preventScroll: true })
  fitDock()
  if (!reducedMotion()) $('.feedback .bit')?.classList.add(r.ok ? 'bounce' : 'wiggle')
  if (!r.ok) {
    setTimeout(() => {
      return $('#answer .missed, #answer .correct')?.scrollIntoView({
        block: 'nearest',
        behavior: reducedMotion() ? 'auto' : 'smooth',
      })
    }, 60)
  }
}

/** Keeps the question clear of the fixed dock. */
export function fitDock(): void {
  const d = $('#dock')
  const a = $('#qarea')
  if (d && a) a.style.paddingBottom = `${d.offsetHeight + 28}px`
}

function questionXp(s: Session, q: LessonItem, dailyRepeat: boolean): number {
  const usedHint = s.hintShown === s.idx
  const mastered = (state.seen[q.id]?.c ?? 0) > 0
  let xp = q.retry ? 4 : usedHint ? 6 : 10
  if (s.combo >= 5) xp += 2
  if (mastered && s.kind !== 'review') xp = 2
  if (s.kind === 'daily') xp = dailyRepeat ? 2 : 20
  if (s.kind === 'jump') xp = mastered ? 0 : 5
  return xp
}

function check(): void {
  const s = session
  if (!s || s.answered || !hasSelection(s)) return
  const q = s.queue[s.idx]
  const ok = isCorrect(q, s.selection)
  const caseSlip = isCaseSlip(q, s.selection)
  touchStreak()
  const today = todayStr()
  const dailyRepeat =
    s.kind === 'daily' && state.dailySeen?.date === today && state.dailySeen.ids.includes(q.id)
  if (s.kind === 'daily') {
    if (state.dailySeen?.date !== today) state.dailySeen = { date: today, ids: [] }
    if (!dailyRepeat) state.dailySeen.ids.push(q.id)
  }
  const first = !Object.hasOwn(s.firstTry, q.id)
  if (first) s.firstTry[q.id] = ok
  let xp = 0
  if (ok) {
    s.combo++
    s.bestCombo = Math.max(s.bestCombo, s.combo)
    xp = questionXp(s, q, dailyRepeat)
    if (q.retry) {
      s.fixed++
      award('comeback')
    }
  } else {
    s.combo = 0
    if (requeues(s.kind)) s.queue.push({ ...prepQuestion(q), retry: true })
  }
  s.xp += xp
  s.answered = true
  s.last = { ok, xp, caseSlip }
  s.results.push({ id: q.id, ok, first, retry: !!q.retry })

  state.stats.answered++
  if (ok) state.stats.correct++
  state.stats.bestCombo = Math.max(state.stats.bestCombo, s.combo)
  const seen = state.seen[q.id] ?? { c: 0, w: 0 }
  if (ok) seen.c++
  else seen.w++
  if (!ok && s.kind !== 'jump') seen.miss = true
  if (ok && s.kind === 'review' && seen.miss) {
    seen.miss = false
    state.stats.reviewCleared++
  }
  state.seen[q.id] = seen
  if (xp && addXp(xp)) s.goalHit = true
  if (s.combo === 5) award('combo5')
  if (s.combo === 12) award('combo12')
  if (state.stats.answered >= 100) award('q100')
  if (state.stats.answered >= 500) award('q500')
  if (state.stats.reviewCleared >= 10) award('reviewer')
  save()

  paintAnswer(s, q, ok)
  sfx(ok ? 'good' : 'bad')
  const comboEl = $('#combo')
  if (comboEl) {
    comboEl.innerHTML = `${icon('flame')}${s.combo}`
    comboEl.classList.toggle('cold', s.combo < 2)
    if (ok && !reducedMotion()) {
      comboEl.classList.remove('pop')
      void comboEl.offsetWidth
      comboEl.classList.add('pop')
    }
  }
  const bar = $('.lesson-top .bar > i')
  if (bar) {
    const pr = lessonProgress(s)
    bar.style.width = `${pr * 100}%`
    bar.parentElement?.setAttribute('aria-valuenow', String(Math.round(pr * 100)))
  }
  announce(
    ok
      ? 'Correct.'
      : `Not quite. The correct answer is ${correctText(q).replaceAll(/<[^>]+>/g, '')}.`,
  )
  renderDock()
}

function paintAnswer(s: Session, q: LessonItem, ok: boolean): void {
  if (q.type === 'fill') {
    const inp = $<HTMLInputElement>('#fill')
    if (!inp) return
    inp.readOnly = true
    inp.classList.add(ok ? 'correct' : 'wrong')
    return
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('#answer .choice')) {
    b.disabled = true
    let isAns: boolean
    let isSel: boolean
    if (q.type === 'tf') {
      const v = b.dataset.val === 'true'
      isAns = v === q.answer
      isSel = v === s.selection
    } else {
      const ci = Number(b.dataset.ci)
      isAns = q.type === 'multi' ? q.answer.includes(ci) : ci === q.answer
      isSel = Array.isArray(s.selection) ? s.selection.includes(ci) : ci === s.selection
    }
    const mark = $('.mark', b)
    if (isAns && isSel) {
      b.classList.add('correct')
      if (mark) mark.innerHTML = icon('check')
    } else if (isSel) {
      b.classList.add('wrong')
      if (mark) mark.innerHTML = icon('x')
    } else if (isAns) {
      b.classList.add(ok ? 'correct' : 'missed')
    } else {
      b.classList.add('dim')
    }
  }
}

function showHint(): void {
  const s = session
  if (!s || s.answered || s.hintShown === s.idx) return
  const q = s.queue[s.idx]
  s.hintShown = s.idx
  s.hints++
  state.stats.hints++
  const slot = $('#hintslot')
  if (slot)
    slot.innerHTML = `<div class="hint-box" tabindex="-1">${icon('bulb')}<div><b>Hint:</b> ${rich(q.hint)}</div></div>`
  renderDock()
  const active = document.activeElement
  if (!active || active === document.body || !active.isConnected) {
    $('.hint-box')?.focus({ preventScroll: true })
  }
}

function next(): void {
  const s = session
  if (!s || !s.answered) return
  s.idx++
  s.answered = false
  s.selection = null
  if (s.idx >= s.queue.length) return finish(s)
  viewLesson()
  window.scrollTo({ top: 0 })
}

function finishLesson(s: Session, res: LessonResult, acc: number): void {
  const { mod, level, lesson, replay } = s.meta as Required<SessionMeta>
  const stars = acc >= 0.99 ? 3 : acc >= 0.7 ? 2 : 1
  const bonus = replay ? 0 : stars * 5
  res.stars = stars
  s.xp += bonus
  if (bonus) addXp(bonus)
  const k = lkey(mod, level, lesson)
  const prev = state.lessons[k]
  res.firstClear = !prev
  state.lessons[k] = { stars: Math.max(stars, prev?.stars ?? 0), at: Date.now() }
  state.stats.lessons++
  award('first')
  if (stars === 3) award('perfect')
  if (s.hints === 0 && state.stats.lessons >= 3) award('nohint')
  const t = todayStr()
  state.dayLessons =
    state.dayLessons?.date === t ? { date: t, n: state.dayLessons.n + 1 } : { date: t, n: 1 }
  if (state.dayLessons.n >= 3) award('speedy')
  if (!prev && levelDone(mod, level)) {
    award('camp')
    if (level < LEVELS) {
      res.campCleared = level
      s.xp += 25
      addXp(25)
    }
  }
  if (MODULES.filter((m) => modStats(m.id).done > 0).length >= 4) award('explorer')
  if (modComplete(mod)) {
    award('summit')
    res.summit = !prev
    if (res.summit) {
      s.xp += 100
      addXp(100)
    }
  }
  if (summitCount() === MODULES.length) award('allsummits')
}

function finish(s: Session): void {
  const firstTotal = Object.keys(s.firstTry).length
  const firstOk = Object.values(s.firstTry).filter(Boolean).length
  const acc = firstTotal ? firstOk / firstTotal : 0
  const secs = Math.round((Date.now() - s.started) / 1000)
  state.stats.time += secs
  const res: LessonResult = {
    kind: s.kind,
    meta: s.meta,
    firstOk,
    firstTotal,
    acc,
    secs,
    xp: s.xp,
    xpBefore: s.xpBefore,
    bestCombo: s.bestCombo,
    fixed: s.fixed,
    results: s.results,
    newBadges: [],
    streak: 0,
    freezeEarned: false,
  }
  if (s.kind === 'lesson') {
    finishLesson(s, res, acc)
  } else if (s.kind === 'jump') {
    const mod = s.meta.mod!
    res.passed = firstOk >= 8
    if (res.passed) {
      state.jumps[mod] = Math.max(state.jumps[mod] ?? 1, s.meta.level!)
      award('jumper')
      s.xp += 30
      addXp(30)
    }
  } else if (s.kind === 'daily') {
    state.challenges[todayStr()] = firstOk
    const ks = Object.keys(state.challenges).sort()
    while (ks.length > 30) delete state.challenges[ks.shift()!]
    award('daily')
  }
  res.xp = s.xp
  const h = new Date().getHours()
  if (state.stats.lessons >= 3 && (h >= 22 || h < 4)) award('owl')
  if (state.stats.lessons >= 3 && h >= 4 && h < 8) award('lark')
  if (
    s.goalHit ||
    (state.daily.date === todayStr() &&
      state.daily.xp >= state.goal &&
      state.daily.xp - s.xp < state.goal)
  ) {
    res.goalHit = true
  }
  if (currentStreak() >= 3) award('streak3')
  if (currentStreak() >= 7) award('streak7')
  const badgesBefore = new Set(s.badges0)
  res.newBadges = Object.keys(state.badges).filter((b) => !badgesBefore.has(b))
  res.streak = currentStreak()
  res.freezeEarned = (state.freezes ?? 0) > s.freezes0
  save()
  session = null
  lastResult = res
  sfx('done')
  go('results')
}

function exitRoute(s: Session): void {
  const mod = s.meta.mod
  const toTrail = mod && (s.kind === 'lesson' || s.kind === 'jump' || s.kind === 'practice')
  if (toTrail) go('trail', { mod })
  else go('home')
}

function quitLesson(): void {
  const s = session
  if (!s) return
  if (s.results.length === 0) {
    session = null
    return exitRoute(s)
  }
  const left = s.queue.length - s.idx - (s.answered ? 1 : 0)
  const leftText =
    s.queue.length - s.idx <= 4 ? `, and only ${left} question${left === 1 ? '' : 's'} left` : ''
  openModal(`<div class="mh"><h2>Take a break?</h2></div>
    <div class="buddy">${buddySvg('calm')}<div class="bubble">You are doing great${leftText}. If you leave now, you keep your XP, but the lesson is not marked done.</div></div>
    <div class="grid-2"><button class="btn" data-lact="quitconfirm">Leave</button><button class="btn primary" data-act="close" autofocus>Keep going</button></div>`)
}

function confirmQuit(): void {
  const s = session
  if (!s) return
  closeModal()
  session = null
  // Badges earned during the session were held back for the results screen. Show them now.
  const fresh = Object.keys(state.badges).filter((b) => !s.badges0.includes(b))
  setTimeout(() => {
    for (const [i, id] of fresh.entries())
      setTimeout(() => {
        delete state.badges[id]
        award(id)
      }, i * 600)
  }, 300)
  exitRoute(s)
}

const FLAG_REASONS = [
  'The answer is wrong',
  'It is confusing',
  'Typo or formatting',
  'Too hard for this level',
]

function issueUrl(q: Question, reason: string): string {
  const title = `Question ${q.id}: ${reason}`
  const body = `**Question:** \`${q.id}\` (${MOD[q.module].name}, level ${q.level})\n\n> ${q.prompt}\n\n**Problem:** ${reason}\n\n**Details:**\n\n`
  return `${REPO_URL}/issues/new?${new URLSearchParams({ title, body, labels: 'question' }).toString()}`
}

function flagQuestion(): void {
  const q = session?.queue[session.idx]
  if (!q) return
  openModal(
    `<div class="mh"><h2>Report a problem</h2><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <p class="muted">Question <span class="mono">${esc(q.id)}</span>. What seems wrong?</p>
    <div class="seg" id="flagseg" style="grid-auto-flow:row;grid-template-columns:1fr 1fr">
      ${FLAG_REASONS.map((r, i) => `<button aria-pressed="${i === 0}" data-r="${esc(r)}">${esc(r)}</button>`).join('')}
    </div>
    <p class="muted" style="font-size:13px">This opens a GitHub issue in a new tab, with the details filled in.</p>
    <button class="btn primary wide" id="flagsend">Open the report</button>`,
    {
      onMount: (m) => {
        let reason = FLAG_REASONS[0]
        $('#flagseg', m)?.addEventListener('click', (e) => {
          const b = (e.target as Element).closest<HTMLElement>('button')
          if (!b) return
          reason = b.dataset.r ?? reason
          for (const x of m.querySelectorAll('#flagseg button'))
            x.setAttribute('aria-pressed', String(x === b))
        })
        $('#flagsend', m)?.addEventListener('click', () => {
          window.open(issueUrl(q, reason), '_blank', 'noopener')
          closeModal()
          toast('Thanks! Your report helps make the trail better.')
        })
      },
    },
  )
}

/** Handles clicks on `[data-lact]` controls in a lesson. */
export function onLessonClick(e: MouseEvent): void {
  const a = (e.target as Element).closest<HTMLElement>('[data-lact]')
  if (!a) return
  switch (a.dataset.lact) {
    case 'check':
      return check()
    case 'next':
      return next()
    case 'hint':
      return showHint()
    case 'quit':
      return quitLesson()
    case 'flag':
      return flagQuestion()
    case 'quitconfirm':
      return confirmQuit()
  }
}

/** Keyboard shortcuts in a lesson: 1-4, T / F, H, and Enter. */
export function onLessonKey(e: KeyboardEvent): void {
  const s = session
  if (route.name !== 'lesson' || !s) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const q = s.queue[s.idx]
  const target = e.target as Element
  if (e.key === 'Enter') {
    if (
      target.closest('button') &&
      !target.closest('.choice, [data-lact="next"], [data-lact="check"]')
    )
      return
    e.preventDefault()
    const c = target.closest<HTMLElement>('.choice')
    if (c && !s.answered && q.type === 'multi') return c.click()
    if (c && !s.answered) {
      s.selection = q.type === 'tf' ? c.dataset.val === 'true' : Number(c.dataset.ci)
      refreshSelection(s, q)
    }
    if (s.answered) next()
    else check()
    return
  }
  if (target.matches('input, textarea') || s.answered) return
  const key = e.key.toLowerCase()
  if (q.type === 'tf' && (key === 't' || key === 'f')) {
    s.selection = key === 't'
    refreshSelection(s, q)
    sfx('tap')
  } else if ((q.type === 'single' || q.type === 'multi') && /^[1-4]$/.test(e.key)) {
    const order = q.order ?? []
    const pos = Number(e.key) - 1
    if (pos >= order.length) return
    const ci = order[pos]
    s.selection = q.type === 'single' ? ci : toggle(s.selection, ci)
    refreshSelection(s, q)
    sfx('tap')
  } else if (key === 'h') {
    showHint()
  }
}
