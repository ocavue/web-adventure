import { bank } from '../bank.ts'
import { MOD } from '../constants.ts'
import { toast } from '../effects.ts'
import { buddySvg, icon, starsHtml } from '../icons.ts'
import { modComplete, modStats } from '../progress.ts'
import { app, go, route, topbar } from '../router.ts'
import { state } from '../state.ts'
import { $, esc } from '../utils.ts'

export function viewCert(): void {
  if (!route.mod) return go('home')
  const m = MOD[route.mod]
  if (!modComplete(m.id)) return go('trail', { mod: m.id })
  const st = modStats(m.id)
  const count = bank[m.id].all.length
  const maxStars = st.total * 3
  const last = Math.max(
    ...Object.entries(state.lessons)
      .filter(([k]) => k.startsWith(m.id + ':'))
      .map(([, r]) => r.at ?? 0),
  )
  const date = new Date(last || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const share = `I just reached the summit of the ${m.name} trail on Byte Trail: ${st.total} lessons, ${count} questions, ${st.stars}/${maxStars} stars.`
  app.innerHTML = `${topbar()}<main class="wrap" style="--mc:var(--m-${m.id})"><div class="results">
    <div class="cert">
      <div aria-hidden="true" class="blaze">${esc(m.glyph)}</div>
      <div class="eyebrow">Certificate of completion</div>
      <p class="muted">This certifies that</p>
      <div class="who">${esc(state.name || 'A determined hiker')}</div>
      <p>reached the summit of the <b>${esc(m.name)}</b> trail on Byte Trail,<br>answering ${count} questions across 5 levels.</p>
      ${starsHtml(3)}
      <p class="mono muted" style="font-size:13px">${st.stars} / ${maxStars} stars · ${esc(date)}</p>
    </div>
    <div class="buddy" style="text-align:left">${buddySvg('wow')}<div class="bubble">Screenshot this and share it. You earned it!</div></div>
    <div class="result-actions">
      <button class="btn" id="copyshare">${icon('copy')}Copy share text</button>
      <button class="btn primary" data-go="home">More trails</button>
    </div>
    <p class="muted" id="sharetext" style="font-size:14px">${esc(share)}</p>
  </div></main>`
  $('#copyshare')?.addEventListener('click', () => void copyShare(share))
}

async function copyShare(share: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(share)
    toast('Copied! Paste it anywhere.')
  } catch {
    const text = $('#sharetext')
    const sel = getSelection()
    if (!text || !sel) return
    const r = document.createRange()
    r.selectNodeContents(text)
    sel.removeAllRanges()
    sel.addRange(r)
    toast('Text selected. Press copy to copy it.')
  }
}
