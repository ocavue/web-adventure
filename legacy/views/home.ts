import { bank } from '../bank.ts'
import { BUDDY_LINES, LESSONS_PER_LEVEL, MOD, MODULES } from '../constants.ts'
import { buddySvg, icon } from '../icons.ts'
import {
  currentStreak,
  dailyXp,
  lastPlayed,
  mistakes,
  modStats,
  nextLesson,
  rankOf,
} from '../progress.ts'
import { app, topbar } from '../router.ts'
import { state } from '../state.ts'
import { esc, fmt, pick, todayStr } from '../utils.ts'

function greeting(): string {
  const h = new Date().getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function buddyLine(started: boolean): string {
  const streak = currentStreak()
  if (!started)
    return 'Pick any trail below. Every one starts with the very basics, so you cannot pick wrong.'
  if (dailyXp() >= state.goal)
    return `Daily goal done! You are on a ${streak}-day streak. Anything more is a bonus.`
  if (state.usedFreeze === todayStr())
    return `A streak freeze saved your ${streak}-day streak. Welcome back!`
  if (streak > 1) return `${streak} days in a row! Keep the flame alive today.`
  if (state.streak.best > 1 && streak === 0) {
    return `A new streak starts today. Your best so far is ${state.streak.best} days. Let's beat it!`
  }
  return pick(BUDDY_LINES)
}

function continueCard(started: boolean): string {
  const last = lastPlayed()
  const cont = (last && nextLesson(last)) || MODULES.map((m) => nextLesson(m.id)).find(Boolean)
  if (!cont) return ''
  const m = MOD[cont.mod]
  return `<div class="continue-card" style="--mc:var(--m-${m.id})">
      <div aria-hidden="true" class="blaze">${esc(m.glyph)}</div>
      <div class="meta"><div class="eyebrow">${started ? 'Continue' : 'Start here'}</div>
        <div class="title">${esc(m.name)}: ${esc(bank[m.id].levels[cont.level - 1].title)}</div>
        <div class="muted" style="font-size:14px">Level ${cont.level}, lesson ${cont.lesson + 1} of ${LESSONS_PER_LEVEL}</div></div>
      <button class="btn primary" data-act="start" data-mod="${cont.mod}" data-level="${cont.level}" data-lesson="${cont.lesson}">${icon('play')}Go</button>
    </div>`
}

function rankCard(): string {
  const r = rankOf(state.xp)
  const rpct = r.next ? (state.xp - r.min) / (r.next - r.min) : 1
  const freezes = state.freezes ?? 0
  return `<div class="panel rank-card">
      <div class="eyebrow">Your rank</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:4px"><h3>${esc(r.name)}</h3><span class="muted mono" style="font-size:13px">${fmt(state.xp)} XP</span></div>
      <div class="bar" style="--fill:var(--blaze)"><i style="width:${rpct * 100}%"></i></div>
      <p class="muted" style="font-size:13px;margin-top:6px">${r.next ? `${fmt(r.next - state.xp)} XP to ${esc(r.nextName)}` : 'Top rank reached. Legendary!'}</p>
      ${freezes ? `<p class="muted" style="font-size:13px;margin-top:4px">${icon('gem')} ${freezes} streak freeze${freezes > 1 ? 's' : ''} ready.${freezes < 2 ? ' Earn one every 7 days in a row.' : ' That is the most you can hold.'}</p>` : ''}
    </div>`
}

const HOW_IT_WORKS = `<div class="panel"><div class="eyebrow">How it works</div><ul class="how">
    <li>${icon('play')}<span>Lessons are 8 short questions, about 3 minutes.</span></li>
    <li>${icon('repeat')}<span>Miss one? It comes back later. No lives, no penalties.</span></li>
    <li>${icon('star')}<span>Earn stars, XP, badges, and a certificate for each trail.</span></li></ul></div>`

function trailCards(): string {
  return MODULES.map((m) => {
    const st = modStats(m.id)
    const nl = nextLesson(m.id)
    const status =
      st.done === st.total
        ? 'Summit reached!'
        : nl
          ? `Level ${nl.level}: ${bank[m.id].levels[nl.level - 1].title}`
          : ''
    return `<button class="trail-card" style="--mc:var(--m-${m.id})" data-go="trail" data-mod="${m.id}">
      <div aria-hidden="true" class="blaze">${esc(m.glyph)}</div>
      <div class="info"><div class="name">${esc(m.name)}</div><div class="sub">${esc(m.tagline)}</div>
        <div class="bar" style="--fill:var(--m-${m.id})"><i style="width:${(st.done / st.total) * 100}%"></i></div>
        <div class="foot"><span>${esc(status)}</span>${st.done ? `<span>${icon('star', 'foot-star')} ${st.stars}/${st.total * 3}</span>` : '<span>15 lessons</span>'}</div>
      </div></button>`
  }).join('')
}

export function viewHome(): void {
  const started = Object.keys(state.lessons).length > 0
  const dailyDone = state.challenges[todayStr()] != null
  const mis = mistakes().length
  const total = MODULES.reduce((n, m) => n + bank[m.id].all.length, 0)
  app.innerHTML = `${topbar()}<main class="wrap">
    <section class="home-hero">
      <div class="hero-main">
        <div>
          <div class="eyebrow">${greeting()}, ${esc(state.name || 'hiker')}</div>
          <h1 style="margin-top:6px">${started ? 'Ready for a few more steps?' : 'Learn web dev one small step at a time.'}</h1>
        </div>
        <div class="buddy">${buddySvg()}<div class="bubble">${esc(buddyLine(started))}</div></div>
        ${continueCard(started)}
      </div>
      <div class="side-stack">
        <div class="panel daily-card">
          <div class="row">
            <div class="medal" style="background:var(--blaze);color:var(--blaze-ink)">${icon('sun')}</div>
            <div style="flex:1;min-width:0"><h3>Daily challenge</h3><p class="muted" style="font-size:14px">${dailyDone ? 'Done for today. New one tomorrow!' : '5 mixed questions, 20 XP each.'}</p></div>
            <button class="btn small ${dailyDone || !started ? '' : 'primary'}" data-act="daily" ${dailyDone ? 'disabled' : ''}>${dailyDone ? icon('check') : 'Play'}</button>
          </div>
        </div>
        ${started ? rankCard() : HOW_IT_WORKS}
        ${
          mis
            ? `<div class="panel">
          <div class="row" style="display:flex;align-items:center;gap:12px">
            <div class="medal" style="background:var(--m-ts);color:#fff">${icon('repeat')}</div>
            <div style="flex:1;min-width:0"><h3>Review</h3><p class="muted" style="font-size:14px">${mis} question${mis === 1 ? '' : 's'} to lock in. Practice makes them stick.</p></div>
            <button class="btn small" data-act="review">Practice</button>
          </div>
        </div>`
            : ''
        }
      </div>
    </section>
    <div class="section-head"><h2>Choose a trail</h2><span class="muted" style="font-size:14px">${MODULES.length} trails, ${total} questions, 5 camps each</span></div>
    <section class="trails">${trailCards()}</section>
  </main>`
}
