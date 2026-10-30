import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import { Buddy, type Mood } from '../../components/ui/Bit.tsx'
import { layout, text } from '../../styles/shared.ts'

const styles = stylex.create({
  main: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingBlock: 48,
    textAlign: 'center',
  },
  title: { outline: 'none' },
  buddy: { maxWidth: 520, textAlign: 'start' },
  actions: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
})

export interface MessageProps {
  title: string
  mood?: Mood
  children: ComponentChildren
  /** Buttons and links under the message. */
  actions: ComponentChildren
}

/** A friendly full-page message with Bit, for the states where there is nothing to play. */
export function Message({ title, mood = 'calm', children, actions }: MessageProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    document.title = `${title} · Web Adventure`
  }, [title])
  return (
    <main {...stylex.props(layout.wrap, styles.main)}>
      <h1 ref={titleRef} tabIndex={-1} {...stylex.props(text.display, text.h1, styles.title)}>
        {title}
      </h1>
      <Buddy mood={mood} size="large" xstyle={styles.buddy}>
        {children}
      </Buddy>
      <div {...stylex.props(styles.actions)}>{actions}</div>
    </main>
  )
}
