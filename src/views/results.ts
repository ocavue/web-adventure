import { correctText } from '../answer.ts'
import { bank, qById } from '../bank.ts'
import { BADGES, CAMP_NAMES, ELEVATIONS, MOD } from '../constants.ts'
import type { ModuleInfo } from '../constants.ts'
import { announce, confetti, sfx } from '../effects.ts'
import { buddySvg, icon } from '../icons.ts'
import type { Mood } from '../icons.ts'
import { lastResult } from '../lesson.ts'
import type { LessonResult } from '../lesson.ts'
import { dailyXp, lastPlayed, mistakes, nextLesson, rankOf } from '../progress.ts'
import { app, go, topbar } from '../router.ts'
import { state } from '../state.ts'
import { $, esc, fmt, rich } from '../utils.ts'

import { badgeHtml } from './profile.ts'

interface Copy {
  title: string
  line: string
  mood: Mood
  primary: string
  secondary: string
  extra: string
}

function lessonCopy(r: LessonResult, m: ModuleInfo): Copy {
  const stars = r.stars ?? 1
  const copy: Copy = {
    title: stars === 3 ? 'Perfect lesson!' : stars === 2 ? 'Great hike!' : 'You made it!',
    line:
      stars === 3
        ? 'Every answer right on the first try. That is real skill.'
        : stars === 2
          ? r.firstTotal - r.firstOk === 1
            ? 'Strong work. One tricky one, and you fixed it before the end.'
            : 'Strong work. A few tricky ones, and you fixed them all before the end.'
          : `You finished it, and that is what counts. You fixed ${r.fixed} question${r.fixed === 1 ? '' : 's'} on the way. Replay it anytime for more stars.`,
    mood: 'happy',
    primary: '',
    secondary: `<button class="btn" data-go="trail" data-mod="${m.id}">Trail map</button>`,
    extra: '',
  }
  if (r.campCleared) {
    const next = bank[m.id].levels[r.campCleared]
    copy.title = `${CAMP_NAMES[r.campCleared]} reached!`
    copy.line = `Level ${r.campCleared} cleared. You climbed to ${fmt(ELEVATIONS[r.campCleared])} m and earned a 25 XP camp bonus. Next up: ${next.title}. ${next.blurb}`
    copy.mood = 'wow'
  }
  if (r.summit) {
    copy.title = 'Summit reached!'
    copy.line = `You finished the whole ${m.name} trail and earned a 100 XP summit bonus. Take a moment to enjoy the view.`
    copy.mood = 'wow'
  }
  const nl = nextLesson(m.id)
  copy.primary = r.summit
    ? `<button class="btn primary" data-go="cert" data-mod="${m.id}">See your certificate</button>`
    : nl
      ? `<button class="btn primary" data-act="start" data-mod="${nl.mod}" data-level="${nl.level}" data-lesson="${nl.lesson}">${icon('play')}Next lesson</button>`
      : `<button class="btn primary" data-go="trail" data-mod="${m.id}">Back to trail</button>`
  copy.extra = r.summit
    ? `<div class="summit-mark"><div aria-hidden="true" class="blaze">${esc(m.glyph)}</div>${icon('flag')}</div>`
    : `<div class="big-stars" aria-label="${stars} of 3 stars">${[0, 1, 2].map((i) => icon('star', i < stars ? 'on' : '')).join('')}</div>`
  return copy
}

function jumpCopy(r: LessonResult, m: ModuleInfo): Copy {
  const level = r.meta.level ?? 2
  const primary = `<button class="btn primary" data-go="trail" data-mod="${m.id}">Back to trail</button>`
  if (r.passed) {
    return {
      title: `Level ${level} unlocked!`,
      line: `${r.firstOk} of 10 correct. You clearly know your stuff. Welcome to ${CAMP_NAMES[level - 1]}.`,
      mood: 'wow',
      primary,
      secondary: '',
      extra: '',
    }
  }
  const close = r.firstOk >= 6
  return {
    title: close ? `Almost there! ${r.firstOk}/10` : 'Good warm-up!',
    line: close
      ? 'You need 8 to jump, and you are close. Try again now, or take the lessons. They will go fast for you.'
      : 'You need 8 to jump. The earlier lessons will build exactly what this test checks, and you can retry the jump anytime.',
    mood: 'happy',
    primary,
    secondary: `<button class="btn" data-act="jumpgo" data-mod="${m.id}" data-level="${level}">${icon('repeat')}Try again</button>`,
    extra: '',
  }
}

function dailyCopy(r: LessonResult): Copy {
  const mis = mistakes().length
  const last = lastPlayed()
  const nl = last && nextLesson(last)
  const home = '<button class="btn" data-go="home">Back home</button>'
  return {
    title: r.firstOk === 5 ? 'Daily challenge crushed!' : 'Daily challenge done!',
    line: `${r.firstOk} of 5 on the first try. Tomorrow brings 5 new questions${mis ? `, and you have ${mis} review card${mis === 1 ? '' : 's'} waiting` : ''}.`,
    mood: 'happy',
    primary: nl
      ? `<button class="btn primary" data-act="start" data-mod="${nl.mod}" data-level="${nl.level}" data-lesson="${nl.lesson}">${icon('play')}Continue ${esc(MOD[nl.mod].name)}</button>`
      : `<button class="btn primary" data-go="home">Back home</button>`,
    secondary: nl ? home : '',
    extra: '',
  }
}

function otherCopy(r: LessonResult, m: ModuleInfo | null): Copy {
  const review = r.kind === 'review'
  return {
    title: review ? 'Review complete!' : 'Practice complete!',
    line: review
      ? 'Each question you fix here is one you truly understand now.'
      : 'Practice keeps the trail fresh. Nice work.',
    mood: 'happy',
    primary:
      !review && m
        ? `<button class="btn primary" data-go="trail" data-mod="${m.id}">Back to trail</button>`
        : `<button class="btn primary" data-go="home">Back home</button>`,
    secondary: '',
    extra: '',
  }
}

function resultCopy(r: LessonResult, m: ModuleInfo | null): Copy {
  if (r.kind === 'lesson' && m) return lessonCopy(r, m)
  if (r.kind === 'jump' && m) return jumpCopy(r, m)
  if (r.kind === 'daily') return dailyCopy(r)
  return otherCopy(r, m)
}

function rankProgressHtml(r: LessonResult): string {
  const before = rankOf(r.xpBefore)
  const now = rankOf(state.xp)
  const up = now.index > before.index
  const from = up ? 0 : now.next ? ((r.xpBefore - now.min) / (now.next - now.min)) * 100 : 100
  const to = now.next ? ((state.xp - now.min) / (now.next - now.min)) * 100 : 100
  return `<div class="rank-progress">
    ${up ? `<div class="celebrate"><div class="panel">${icon('crown')}<div><b>New rank: ${esc(now.name)}!</b> You are moving up the mountain.</div></div></div>` : ''}
    <div class="row"><b>${esc(now.name)}</b><span class="muted">${now.next ? `${fmt(now.next - state.xp)} XP to ${esc(now.nextName)}` : 'Top rank!'}</span></div>
    <div class="bar" style="--fill:var(--blaze)"><i style="width:${from}%" data-to="${to}%"></i></div></div>`
}

function answersHtml(r: LessonResult): string {
  const seen = new Map<string, boolean>()
  for (const x of r.results) if (!seen.has(x.id)) seen.set(x.id, x.ok)
  return [...seen]
    .map(([id, ok]) => {
      const q = qById(id)
      if (!q) return ''
      return `<div class="review-item ${ok ? 'ok' : 'miss'}"><div class="rp">${rich(q.prompt)}</div><div><span class="muted">Answer:</span> ${correctText(q)}</div><div class="muted">${rich(q.explain)}</div></div>`
    })
    .join('')
}

function confettiPower(r: LessonResult): number {
  if (r.kind === 'lesson') return r.summit ? 2 : r.campCleared ? 1.5 : r.stars === 3 ? 1.2 : 0.7
  if (r.passed) return 1
  return r.kind === 'daily' ? 0.8 : 0
}

export function viewResults(): void {
  const r = lastResult
  if (!r) return go('home')
  const m = r.meta.mod ? MOD[r.meta.mod] : null
  const { title, line, mood, primary, secondary, extra } = resultCopy(r, m)
  const pct = Math.round(r.acc * 100)
  const mins = Math.floor(r.secs / 60)
  const secs = r.secs % 60
  const newB = BADGES.filter((b) => r.newBadges.includes(b.id))
  app.innerHTML = `${topbar()}<main class="wrap" style="--mc:${m ? `var(--m-${m.id})` : 'var(--blaze)'}"><div class="results">
    ${extra}
    <div><h1 id="restitle" tabindex="-1">${esc(title)}</h1></div>
    <div class="buddy" style="text-align:left">${buddySvg(mood)}<div class="bubble">${esc(line)}</div></div>
    <div class="stat-grid">
      <div class="stat"><b>+${r.xp}</b><span>XP earned</span></div>
      <div class="stat"><b>${pct}%</b><span>First try</span></div>
      <div class="stat"><b>${mins ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`}</b><span>Time</span></div>
    </div>
    <div class="result-actions">
      ${secondary}
      ${primary}
    </div>
    ${rankProgressHtml(r)}
    ${r.goalHit ? `<div class="celebrate"><div class="panel">${icon('check')}<div><b>Daily goal reached!</b> ${dailyXp()} XP today (your goal is ${state.goal})${r.streak ? `, and your streak is ${r.streak} day${r.streak === 1 ? '' : 's'}` : ''}.</div></div></div>` : ''}
    ${r.freezeEarned ? `<div class="celebrate"><div class="panel">${icon('gem')}<div><b>Streak freeze earned!</b> It will protect your streak if you miss a day.</div></div></div>` : ''}
    ${r.bestCombo >= 3 ? `<p class="muted">${icon('flame')} Best streak this round: <b>${r.bestCombo}</b> in a row</p>` : ''}
    ${newB.length > 0 ? `<div class="panel" style="width:100%"><div class="eyebrow" style="margin-bottom:12px">New badge${newB.length > 1 ? 's' : ''}</div><div class="badges-grid">${newB.map((b) => badgeHtml(b, true)).join('')}</div></div>` : ''}
    <details style="width:100%;text-align:left"><summary class="btn ghost small" style="list-style:none;cursor:pointer;display:flex;width:fit-content;margin:0 auto">See every answer</summary>
      <div class="review-list" style="margin-top:12px">${answersHtml(r)}</div>
    </details>
  </div></main>`
  $('#restitle')?.focus({ preventScroll: true })
  announce(`${title} ${line}`)
  const bar = $('.rank-progress .bar > i', app)
  if (bar) {
    requestAnimationFrame(() => {
      return requestAnimationFrame(() => {
        bar.style.width = bar.dataset.to ?? ''
      })
    })
  }
  const power = confettiPower(r)
  if (power) setTimeout(() => confetti(power), 250)
  if (
    r.newBadges.length > 0 ||
    r.campCleared ||
    r.summit ||
    rankOf(r.xpBefore).index < rankOf(state.xp).index
  ) {
    setTimeout(() => sfx('badge'), 700)
  }
}
