import { bank, qById } from '../bank.ts'
import { BADGES, MOD, MODULES } from '../constants.ts'
import type { Badge } from '../constants.ts'
import { icon } from '../icons.ts'
import { currentStreak, mistakes, modComplete, modStats, rankOf } from '../progress.ts'
import { app, topbar } from '../router.ts'
import { state } from '../state.ts'
import { esc, fmt, todayStr } from '../utils.ts'

export function badgeHtml(b: Badge, got: boolean): string {
  return `<div class="badge ${got ? 'got' : ''}" style="--bc:${b.color}"><div class="medal">${got ? icon(b.icon) : icon('lock')}</div><div class="bn">${esc(b.name)}</div><div class="bd">${esc(b.desc)}</div></div>`
}

function weekChart(): string {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return todayStr(d)
  })
  const maxW = Math.max(state.goal, ...days.map((d) => state.week[d] ?? 0))
  const goalY = 100 - (state.goal / maxW) * 80
  const bars = days
    .map((d, i) => {
      const v = state.week[d] ?? 0
      const h = (v / maxW) * 80
      const day = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
      return `<rect x="${i * 40 + 8}" y="${100 - h}" width="24" height="${Math.max(h, 2)}" rx="5" fill="${v >= state.goal ? 'var(--good)' : 'var(--ink-3)'}"/><text x="${i * 40 + 20}" y="116" text-anchor="middle" font-size="11" fill="var(--ink-2)">${day}</text>${v ? `<text x="${i * 40 + 20}" y="${95 - h}" text-anchor="middle" font-size="10" fill="var(--ink-2)">${v}</text>` : ''}`
    })
    .join('')
  return `<svg viewBox="0 0 280 120" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="XP earned each of the last 7 days">
      <line x1="0" x2="280" y1="${goalY}" y2="${goalY}" stroke="var(--blaze)" stroke-dasharray="4 4" stroke-width="1.5"/>
      ${bars}
    </svg>`
}

function moduleRows(): string {
  return MODULES.map((m) => {
    const st = modStats(m.id)
    let c = 0
    let t = 0
    for (const q of bank[m.id].all) {
      const s = state.seen[q.id]
      if (s) {
        c += s.c
        t += s.c + s.w
      }
    }
    return `<div class="mod-row" style="--mc:var(--m-${m.id})"><div aria-hidden="true" class="blaze sm">${esc(m.glyph)}</div><div style="min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(m.name)}</b><span class="muted">${st.done}/${st.total}</span></div><div class="bar" style="--fill:var(--mc);margin-top:4px"><i style="width:${(st.done / st.total) * 100}%"></i></div></div><span class="muted mono" style="font-size:12px;width:64px;text-align:right" title="Accuracy">${t ? Math.round((c / t) * 100) + '% acc.' : ''}</span></div>`
  }).join('')
}

function topicsHtml(): string {
  const groups = new Map<string, number>()
  for (const id of mistakes()) {
    const q = qById(id)
    if (!q) continue
    const k = `${q.module}|${q.topic}`
    groups.set(k, (groups.get(k) ?? 0) + 1)
  }
  if (groups.size === 0) return ''
  const top = [...groups].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const tags = top
    .map(([k, n]) => {
      const [mod, topic] = k.split('|') as [keyof typeof MOD, string]
      return `<span class="qtag mod" style="--mc:var(--m-${mod})">${esc(MOD[mod].name)} · ${esc(topic)} <span class="muted">${n}</span></span>`
    })
    .join('')
  return `<div class="section-head"><h2>Topics to grow</h2><button class="btn small" data-act="review">${icon('repeat')}Practice these</button></div>
    <div class="panel"><div class="badge-row">${tags}</div>
    <p class="muted" style="font-size:14px;margin-top:10px">These are questions you missed. A quick review locks them in.</p></div>`
}

function timeText(secs: number): string {
  const hours = Math.floor(secs / 3600)
  const mins = Math.round((secs % 3600) / 60)
  return hours ? `${hours}h ${mins}m` : secs < 60 ? `${secs}s` : `${mins}m`
}

export function viewProfile(): void {
  const r = rankOf(state.xp)
  const acc = state.stats.answered
    ? Math.round((state.stats.correct / state.stats.answered) * 100)
    : 0
  const got = BADGES.filter((b) => state.badges[b.id]).length
  const badges = [...BADGES].sort(
    (a, b) => Number(Object.hasOwn(state.badges, b.id)) - Number(Object.hasOwn(state.badges, a.id)),
  )
  const certs = MODULES.filter((m) => modComplete(m.id))
  app.innerHTML = `${topbar()}<main class="wrap">
    <div class="trail-head"><button class="icon-btn" data-go="home" aria-label="Back home">${icon('back')}</button>
      <div class="t"><div class="eyebrow">${esc(r.name)}</div><h1>${esc(state.name || 'Hiker')}</h1></div>
      <button class="btn small" data-act="settings">${icon('gear')}Edit</button></div>
    <div class="profile-grid">
      <div class="panel">
        <div class="eyebrow">This week</div>
        ${weekChart()}
        <p class="muted" style="font-size:13px">Dashed line: your daily goal of ${state.goal} XP.</p>
        <div class="kv">
          <div class="stat"><b>${fmt(state.xp)}</b><span>Total XP</span></div>
          <div class="stat"><b>${currentStreak()}</b><span>Day streak (best ${state.streak.best})</span></div>
          <div class="stat"><b>${fmt(state.stats.answered)}</b><span>Answers</span></div>
          <div class="stat"><b>${acc}%</b><span>Accuracy</span></div>
          <div class="stat"><b>${state.stats.lessons}</b><span>Lessons</span></div>
          <div class="stat"><b>${timeText(state.stats.time)}</b><span>Time on trail</span></div>
        </div>
      </div>
      <div class="panel">
        <div class="eyebrow">Trails</div>
        <div class="mod-rows">${moduleRows()}</div>
      </div>
    </div>
    ${topicsHtml()}
    <div class="section-head"><h2>Badges</h2><span class="muted">${got} of ${BADGES.length}</span></div>
    <div class="panel"><div class="badges-grid">${badges.map((b) => badgeHtml(b, Object.hasOwn(state.badges, b.id))).join('')}</div></div>
    ${certs.length > 0 ? `<div class="section-head"><h2>Certificates</h2></div><div class="badge-row">${certs.map((m) => `<button class="btn" data-go="cert" data-mod="${m.id}">${esc(m.name)}</button>`).join('')}</div>` : ''}
  </main>`
}
