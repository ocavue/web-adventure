import { bankLoaded } from './bank.ts'
import { clearEffects } from './effects.ts'
import { buddySvg, icon, LOGO } from './icons.ts'
import { currentStreak, dailyXp } from './progress.ts'
import { state } from './state.ts'
import type { ModuleId } from './types.ts'
import { $, fmt } from './utils.ts'

export type RouteName = 'home' | 'trail' | 'lesson' | 'results' | 'profile' | 'cert'

export interface Route {
  name: RouteName
  mod?: ModuleId
}

export let route: Route = { name: 'home' }

export const app = $('#app')!

const views = {} as Record<RouteName, () => void>

export function registerView(name: RouteName, view: () => void): void {
  views[name] = view
}

let bankError = false

export function setBankError(): void {
  bankError = true
}

export function go(name: RouteName, params: { mod?: ModuleId } = {}): void {
  route = { name, ...params }
  clearEffects(name === 'cert')
  render()
  window.scrollTo({ top: 0 })
}

export function render(): void {
  if (bankError) {
    app.innerHTML = `${topbar()}<div class="wrap"><div class="loading"><div>${buddySvg('calm')}<h2>The trail map did not load</h2><p class="muted">Check your connection, then reload the page.</p></div></div></div>`
    return
  }
  if (!bankLoaded()) {
    app.innerHTML = `${topbar()}<div class="wrap"><div class="loading"><div>${buddySvg()}<p class="muted">Packing your backpack...</p></div></div></div>`
    return
  }
  ;(views[route.name] ?? views.home)()
}

export function topbar(): string {
  const s = currentStreak()
  const dx = dailyXp()
  const pct = Math.min(1, dx / state.goal)
  const C = 2 * Math.PI * 10
  const xp =
    state.xp >= 1000
      ? `<span class="full">${fmt(state.xp)}</span><span class="short">${(state.xp / 1000).toFixed(1).replace(/\.0$/, '')}k</span>`
      : state.xp
  return `<header class="topbar"><div class="inner">
    <button class="logo" data-go="home" aria-label="Byte Trail home">${LOGO}<span class="word">Byte Trail</span></button>
    <div class="chips">
      <span class="chip streak ${s ? 'on' : ''}" title="Day streak">${icon('flame')}<span>${s}</span><span class="label">day${s === 1 ? '' : 's'}</span></span>
      <span class="chip xp" title="Total XP: ${fmt(state.xp)}">${icon('bolt')}<span>${xp}</span><span class="label">XP</span></span>
      <span class="chip goal" title="Daily goal: ${dx} of ${state.goal} XP">
        <svg class="goal-ring" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="10" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="13" cy="13" r="10" fill="none" stroke="${pct >= 1 ? 'var(--good)' : 'var(--blaze)'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 13 13)"/></svg>
        <span class="label">${pct >= 1 ? 'Goal met' : `${dx}/${state.goal}`}</span></span>
    </div>
    <nav class="nav" aria-label="Main">
      <button class="icon-btn" data-go="profile" aria-label="Your progress" title="Your progress">${icon('user')}</button>
      <button class="icon-btn" data-act="settings" aria-label="Settings" title="Settings">${icon('gear')}</button>
    </nav>
  </div></header>`
}
