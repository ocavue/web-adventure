import './style.css'

import { ACTIONS } from './actions.ts'
import { loadBank } from './bank.ts'
import { closeModal, modalOpen, trapFocus } from './effects.ts'
import { fitDock, onLessonClick, onLessonKey, viewLesson } from './lesson.ts'
import { go, registerView, render, route, setBankError } from './router.ts'
import type { RouteName } from './router.ts'
import { state } from './state.ts'
import type { ModuleId } from './types.ts'
import { viewCert } from './views/cert.ts'
import { viewHome } from './views/home.ts'
import { viewProfile } from './views/profile.ts'
import { viewResults } from './views/results.ts'
import { applySettings, onboarding } from './views/settings.ts'
import { drawPaths, viewTrail } from './views/trail.ts'

registerView('home', viewHome)
registerView('trail', viewTrail)
registerView('lesson', viewLesson)
registerView('results', viewResults)
registerView('profile', viewProfile)
registerView('cert', viewCert)

document.addEventListener('click', (e) => {
  const target = e.target as Element
  const g = target.closest<HTMLElement>('[data-go]')
  if (g) {
    e.preventDefault()
    const mod = g.dataset.mod as ModuleId | undefined
    go(g.dataset.go as RouteName, mod ? { mod } : {})
    return
  }
  const a = target.closest<HTMLElement>('[data-act]')
  const action = a && ACTIONS[a.dataset.act ?? '']
  if (a && action) {
    e.preventDefault()
    action(a.dataset)
    return
  }
  onLessonClick(e)
})

document.addEventListener('keydown', (e) => {
  if (trapFocus(e)) return
  if (e.key === 'Escape' && modalOpen()) {
    if (state.onboarded) closeModal()
    return
  }
  if (!modalOpen()) onLessonKey(e)
})

addEventListener('resize', () => {
  if (route.name === 'trail') drawPaths()
  if (route.name === 'lesson') fitDock()
})

applySettings()
render()
loadBank().then(
  () => {
    render()
    if (!state.onboarded) onboarding()
  },
  () => {
    setBankError()
    render()
  },
)
