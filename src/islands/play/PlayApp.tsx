import { useCallback, useEffect, useState } from 'preact/hooks'

import { Announcer } from '../../components/ui/Announcer.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Toaster } from '../../components/ui/Toaster.tsx'
import { loadBank } from '../../lib/bank.ts'
import { MOD } from '../../lib/constants.ts'
import {
  clearSession,
  restoreResult,
  restoreSession,
  savedModules,
  startSession,
  type LessonResult,
  type Session,
} from '../../lib/lesson.ts'
import { lastPlayed, nextLesson } from '../../lib/progress.ts'
import {
  banksFor,
  DAILY_SIZE,
  modulesOf,
  parsePlayParams,
  playAllowed,
  playHref,
  type PlayRequest,
} from '../../lib/selection.ts'
import { loadProgress, progress } from '../../lib/store.ts'
import type { ModuleId } from '../../lib/types.ts'
import { todayStr } from '../../lib/utils.ts'

import { Lesson } from './Lesson.tsx'
import { Loader } from './Loader.tsx'
import { Message } from './Message.tsx'
import { exitHref, type TrailLevels } from './navigation.ts'
import { Results } from './Results.tsx'

type Phase =
  | { name: 'loading' }
  | { name: 'bad-url' }
  | { name: 'empty'; request: PlayRequest }
  | { name: 'locked'; request: Exclude<PlayRequest, { mode: 'daily' | 'review' }> }
  | { name: 'daily-done'; score: number }
  | { name: 'error' }
  | { name: 'playing'; session: Session }
  | { name: 'results'; result: LessonResult; restored: boolean }

export interface PlayAppProps {
  levels: TrailLevels
  /** Leaves the page. Tests replace it. */
  navigate?: (href: string) => void
  /** How the page was opened. Tests replace it. */
  navigationType?: NavigationTimingType
}

function goTo(href: string): void {
  location.assign(href)
}

function pageNavigationType(): NavigationTimingType {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  return entry?.type ?? 'navigate'
}

async function loadBanks(mods: ModuleId[]): Promise<void> {
  await Promise.all([...new Set(mods)].map(loadBank))
}

/** The `/play` page: reads the URL, loads the questions, then runs the session and its results. */
export function PlayApp({
  levels,
  navigate = goTo,
  navigationType = pageNavigationType(),
}: PlayAppProps) {
  const [request] = useState(() => parsePlayParams(new URLSearchParams(location.search)))
  const [phase, setPhase] = useState<Phase>(request ? { name: 'loading' } : { name: 'bad-url' })
  const [attempt, setAttempt] = useState(0)
  // Only a reload or Back / Forward shows the last results again. A link starts a new session.
  const [returning] = useState(
    () => navigationType === 'reload' || navigationType === 'back_forward',
  )

  useEffect(() => {
    if (!request) return
    let live = true
    const start = async () => {
      loadProgress()
      const result = returning ? restoreResult(request) : null
      if (result) {
        // The answer list needs the banks. Without them it shows less, but the results still show.
        await loadBanks(modulesOf(result.results.map((x) => x.id))).catch(() => undefined)
        if (live) setPhase({ name: 'results', result, restored: true })
        return
      }
      const s = progress.peek()
      const today = s.challenges[todayStr()]
      if (request.mode === 'daily' && today !== undefined) {
        setPhase({ name: 'daily-done', score: today })
        return
      }
      if (request.mode !== 'daily' && request.mode !== 'review' && !playAllowed(request, s)) {
        clearSession(request)
        setPhase({ name: 'locked', request })
        return
      }
      try {
        await loadBanks([...banksFor(request, s), ...savedModules(request)])
      } catch {
        if (live) setPhase({ name: 'error' })
        return
      }
      if (!live) return
      const session = restoreSession(request) ?? startSession(request)
      setPhase(session ? { name: 'playing', session } : { name: 'empty', request })
    }
    void start()
    return () => {
      live = false
    }
  }, [request, attempt, returning])

  // Back after leaving can bring this page back from the back/forward cache, with a session that
  // already ended. A reload rebuilds the page from storage.
  useEffect(() => {
    const controller = new AbortController()
    window.addEventListener(
      'pageshow',
      (e) => {
        if (e.persisted) location.reload()
      },
      { signal: controller.signal },
    )
    return () => controller.abort()
  }, [])

  const onFinish = useCallback((result: LessonResult) => {
    setPhase({ name: 'results', result, restored: false })
  }, [])

  return (
    <>
      <PhaseView
        phase={phase}
        levels={levels}
        navigate={navigate}
        onFinish={onFinish}
        onRetry={() => {
          setPhase({ name: 'loading' })
          setAttempt((n) => n + 1)
        }}
      />
      <Toaster />
      <Announcer />
    </>
  )
}

function PhaseView({
  phase,
  levels,
  navigate,
  onFinish,
  onRetry,
}: {
  phase: Phase
  levels: TrailLevels
  navigate: (href: string) => void
  onFinish: (result: LessonResult) => void
  onRetry: () => void
}) {
  switch (phase.name) {
    case 'loading':
      return <Loader />
    case 'playing':
      return <Lesson session={phase.session} onFinish={onFinish} onLeave={navigate} />
    case 'results':
      return <Results result={phase.result} levels={levels} restored={phase.restored} />
    case 'bad-url':
      return (
        <Message
          title="This lesson link is broken"
          mood="wow"
          actions={
            <Button href="/" variant="primary">
              Back to the trailhead
            </Button>
          }
        >
          Hmm, Bit cannot find a lesson at this address. Pick one from a trail map instead.
        </Message>
      )
    case 'locked':
      return <Locked request={phase.request} />
    case 'daily-done':
      return <DailyDone score={phase.score} />
    case 'empty':
      return phase.request.mode === 'review' ? (
        <Message
          title="Nothing to review"
          mood="happy"
          actions={
            <Button href="/" variant="primary">
              Back home
            </Button>
          }
        >
          You have no mistakes waiting. Questions you miss come back here, so keep hiking!
        </Message>
      ) : (
        <Message
          title="No questions here yet"
          actions={
            <Button href={exitHref(phase.request)} variant="primary">
              Back to the trail
            </Button>
          }
        >
          This part of the trail has no questions yet. Try another lesson.
        </Message>
      )
    case 'error':
      return (
        <Message
          title="The trail map did not load"
          actions={
            <>
              <Button href="/">Back home</Button>
              <Button variant="primary" icon="repeat" onClick={onRetry}>
                Try again
              </Button>
            </>
          }
        >
          The questions could not be downloaded. Check your connection, then try again.
        </Message>
      )
  }
}

function Locked({ request }: { request: Extract<Phase, { name: 'locked' }>['request'] }) {
  const copy =
    request.mode === 'lesson'
      ? {
          title: 'This lesson is still locked',
          body: 'Finish the lessons before it first, and it opens up. Bit is saving your spot on the trail!',
        }
      : request.mode === 'practice'
        ? {
            title: `Practice opens after level ${request.level}`,
            body: `Finish all the lessons of level ${request.level}, then come back here to practice them.`,
          }
        : {
            title: `Level ${request.level} is already open`,
            body: 'No need for a jump test. You can start its lessons right away from the trail map.',
          }
  return (
    <Message
      title={copy.title}
      mood={request.mode === 'jump' ? 'happy' : 'calm'}
      actions={
        <Button href={`/trail/${request.mod}`} variant="primary">
          Back to the trail
        </Button>
      }
    >
      {copy.body}
    </Message>
  )
}

function DailyDone({ score }: { score: number }) {
  const s = progress.peek()
  const last = lastPlayed(s)
  const nl = last && nextLesson(last, s)
  return (
    <Message
      title="Done for today!"
      mood="happy"
      actions={
        nl ? (
          <>
            <Button href="/">Back home</Button>
            <Button href={playHref({ mode: 'lesson', ...nl })} variant="primary" icon="play">
              Continue {MOD[nl.mod].name}
            </Button>
          </>
        ) : (
          <Button href="/" variant="primary">
            Back home
          </Button>
        )
      }
    >
      You got {score} of {DAILY_SIZE} on today's challenge. A fresh one waits for you tomorrow.
      Until then, keep climbing a trail!
    </Message>
  )
}
