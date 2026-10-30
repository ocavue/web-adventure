import { bank } from '../bank.ts'
import { CAMP_NAMES, ELEVATIONS, LESSONS_PER_LEVEL, LEVELS, MOD } from '../constants.ts'
import { reducedMotion } from '../effects.ts'
import { buddySvg, icon, starsHtml } from '../icons.ts'
import {
  lessonUnlocked,
  levelDone,
  levelUnlocked,
  lkey,
  modStats,
  nextLesson,
} from '../progress.ts'
import { app, go, route, topbar } from '../router.ts'
import { state } from '../state.ts'
import type { ModuleId } from '../types.ts'
import { esc, fmt } from '../utils.ts'

const OFFSETS = [0, -70, 70]

function campHtml(mod: ModuleId, l: number): string {
  const unlocked = levelUnlocked(mod, l)
  const lv = bank[mod].levels[l - 1]
  const nl = nextLesson(mod)
  let nodes = ''
  for (let i = 0; i < LESSONS_PER_LEVEL; i++) {
    const r = state.lessons[lkey(mod, l, i)]
    const open = lessonUnlocked(mod, l, i)
    const cur = nl && nl.level === l && nl.lesson === i
    const cls = r ? 'done' : open ? '' : 'locked'
    const ic = r ? icon('check') : open ? icon('play') : icon('lock')
    const label = r ? starsHtml(r.stars) : `<span class="node-label">Lesson ${i + 1}</span>`
    nodes += `<div class="node-wrap" style="transform:translateX(${OFFSETS[i] * (l % 2 ? 1 : -1)}px)">
        ${cur ? '<span class="start-tag">Start</span>' : ''}
        <button class="node ${cls} ${cur ? 'current' : ''}" data-act="${open ? 'start' : 'locked'}" data-mod="${mod}" data-level="${l}" data-lesson="${i}" aria-label="Level ${l} lesson ${i + 1}${r ? `, done, ${r.stars} stars` : open ? '' : ', locked'}">${ic}</button>
        ${label}</div>`
  }
  const action = !unlocked
    ? `<button class="btn small" data-act="jump" data-mod="${mod}" data-level="${l}">${icon('rocket')}Jump here</button>`
    : levelDone(mod, l)
      ? `<button class="btn small ghost" data-act="practice" data-mod="${mod}" data-level="${l}">${icon('dice')}Practice</button>`
      : ''
  return `<section class="camp ${unlocked ? '' : 'locked'}">
      <div class="camp-head">
        <div aria-hidden="true" class="blaze sm">${l}</div>
        <div class="ct"><div class="elev">${CAMP_NAMES[l - 1]} · ${fmt(ELEVATIONS[l - 1])} m</div><h3>Level ${l}: ${esc(lv.title)}</h3><p class="muted" style="font-size:14px">${esc(lv.blurb)}</p></div>
        ${action}
      </div>
      ${unlocked ? `<div class="path">${nodes}</div>` : `<div class="locked-note">${icon('lock')}3 lessons wait here. Finish level ${l - 1} to open them.</div>`}
    </section>`
}

export function viewTrail(): void {
  if (!route.mod) return go('home')
  const m = MOD[route.mod]
  const st = modStats(m.id)
  const complete = st.done === st.total
  let camps = ''
  for (let l = 1; l <= LEVELS; l++) camps += campHtml(m.id, l)
  app.innerHTML = `${topbar()}<main class="wrap" style="--mc:var(--m-${m.id})">
    <div class="trail-head">
      <button class="icon-btn" data-go="home" aria-label="Back to all trails">${icon('back')}</button>
      <div aria-hidden="true" class="blaze">${esc(m.glyph)}</div>
      <div class="t"><div class="eyebrow">Trail</div><h1>${esc(m.name)}</h1></div>
      <div style="min-width:180px;flex:0 1 240px"><div style="display:flex;justify-content:space-between;font-size:14px" class="muted"><span>${st.done}/${st.total} lessons</span><span>${st.stars} stars</span></div><div class="bar" style="--fill:var(--mc);margin-top:6px"><i style="width:${(st.done / st.total) * 100}%"></i></div></div>
    </div>
    ${st.done === 0 && !Object.hasOwn(state.jumps, m.id) ? `<div class="buddy" style="margin-top:8px">${buddySvg()}<div class="bubble">Already know some ${esc(m.name)}? Tap <b>Jump here</b> on any locked level to test out and skip ahead.</div></div>` : ''}
    <div class="trail-map">${camps}</div>
    <div class="summit">
      ${icon('flag', 'summit-flag')}
      <h2>${complete ? 'Summit reached!' : 'The summit'}</h2>
      <p class="muted">${complete ? `You finished every lesson on the ${esc(m.name)} trail.` : `Finish all ${st.total} lessons to earn your ${esc(m.name)} certificate.`}</p>
      ${complete ? `<button class="btn primary" data-go="cert" data-mod="${m.id}">View certificate</button>` : ''}
    </div>
  </main>`
  requestAnimationFrame(() => {
    drawPaths()
    const cur = app.querySelector('.node.current')
    if (cur && st.done > 0)
      cur.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
  })
}

/** Draws the winding trail line through the lesson nodes of each camp. */
export function drawPaths(): void {
  for (const p of app.querySelectorAll('.path')) {
    const nodes = [...p.querySelectorAll('.node')]
    if (nodes.length < 2) continue
    const pr = p.getBoundingClientRect()
    const pts = nodes.map((n) => {
      const r = n.getBoundingClientRect()
      return [r.left + r.width / 2 - pr.left, r.top + r.height / 2 - pr.top]
    })
    let d = `M${pts[0][0]} ${pts[0][1] - 40}L${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      d += `C${x0} ${(y0 + y1) / 2} ${x1} ${(y0 + y1) / 2} ${x1} ${y1}`
    }
    p.querySelector('svg.line')?.remove()
    p.insertAdjacentHTML(
      'afterbegin',
      `<svg class="line" aria-hidden="true"><path d="${d}"/></svg>`,
    )
  }
}
