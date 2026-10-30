import * as stylex from '@stylexjs/stylex'
import { useId } from 'preact/hooks'

import { Buddy } from '../../components/ui/Bit.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { text } from '../../styles/shared.ts'

const styles = stylex.create({
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
})

export interface QuitDialogProps {
  open: boolean
  /** Questions left, without the one just answered. */
  left: number
  /** Questions left, counting the one on screen. Decides whether to mention `left`. */
  ahead: number
  onStay: () => void
  onLeave: () => void
}

/** "Take a break?": asks before leaving a session that has answers. */
export function QuitDialog({ open, left, ahead, onStay, onLeave }: QuitDialogProps) {
  const titleId = useId()
  const leftText = ahead <= 4 ? `, and only ${left} question${left === 1 ? '' : 's'} left` : ''
  return (
    <Dialog open={open} onClose={onStay} labelledBy={titleId}>
      <h2 id={titleId} {...stylex.props(text.display, text.h2)}>
        Take a break?
      </h2>
      <Buddy mood="calm">
        You are doing great{leftText}. If you leave now, you keep your XP, but the lesson is not
        marked done.
      </Buddy>
      <div {...stylex.props(styles.grid)}>
        <Button onClick={onLeave}>Leave</Button>
        <Button variant="primary" autofocus onClick={onStay}>
          Keep going
        </Button>
      </div>
    </Dialog>
  )
}
