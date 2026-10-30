import { useCallback, useEffect, useState } from 'preact/hooks'

import { Announcer } from '../../components/ui/Announcer.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Toaster } from '../../components/ui/Toaster.tsx'
import { loadBank } from '../../lib/bank.ts'
import { restoreSession, startSession, type LessonResult, type Session } from '../../lib/lesson.ts'
import { banksFor, parsePlayParams, type PlayRequest } from '../../lib/selection.ts'
import { loadProgress } from '../../lib/store.ts'

import { Lesson } from './Lesson.tsx'
import { Loader } from './Loader.tsx'
import { Message } from './Message.tsx'
import { exitHref, type TrailLevels } from './navigation.ts'
import { Results } from './Results.tsx'

type Phase =
  | { name: 'loading' }
  | { name: 'bad-url' }
  | { name: 'empty'; request: PlayRequest }
  | { name: 'error' }
  | { name: 'playing'; session: Session }
  | { name: 'results'; result: LessonResult }

export interface PlayAppProps {
  levels: TrailLevels
  /** Leaves the page. Tests replace it. */
  navigate?: (href: string) => void
}

function goTo(href: string): void {
  location.assign(href)
}

/** The `/play` page: reads the URL, loads the questions, then runs the session and its results. */
export function PlayApp({ levels, navigate = goTo }: PlayAppProps) {
  const [request] = useState(() => parsePlayParams(new URLSearchParams(location.search)))
  const [phase, setPhase] = useState<Phase>(request ? { name: 'loading' } : { name: 'bad-url' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!request) return
    let live = true
    const start = async () => {
      loadProgress()
      try {
        await Promise.all(banksFor(request).map(loadBank))
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
  }, [request, attempt])

  const onFinish = useCallback((result: LessonResult) => {
    setPhase({ name: 'results', result })
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
      return <Results result={phase.result} levels={levels} />
    case 'bad-url':
      return (
        <Message
          title="This trail does not exist"
          mood="wow"
          actions={
            <Button href="/" variant="primary">
              Back to the trailhead
            </Button>
          }
        >
          Hmm, this lesson link looks broken. Pick a lesson from a trail map instead.
        </Message>
      )
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
