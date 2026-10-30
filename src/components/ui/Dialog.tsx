import * as stylex from '@stylexjs/stylex'
import type { ComponentChildren } from 'preact'
import { useEffect, useId, useRef } from 'preact/hooks'

import { activeModal } from '../../lib/modal.ts'
import { text } from '../../styles/shared.ts'
import { colors, radii } from '../../styles/tokens.stylex.ts'

import { IconButton } from './IconButton.tsx'

const fade = stylex.keyframes({ from: { opacity: 0 } })

const slideUp = stylex.keyframes({
  from: { transform: 'translateY(14px)', opacity: 0 },
  to: { transform: 'none', opacity: 1 },
})

/** The padding of the dialog body. `DialogActions` bleeds over it. */
const PAD = 22

const styles = stylex.create({
  dialog: {
    borderWidth: 0,
    padding: 0,
    backgroundColor: colors.paper2,
    color: colors.ink,
    borderRadius: radii.l,
    width: 480,
    maxWidth: 'calc(100% - 32px)',
    maxHeight: 'calc(100dvh - 32px)',
    overflow: 'hidden',
    boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.5)',
    animationName: slideUp,
    animationDuration: '0.2s',
    animationTimingFunction: 'ease',
    '::backdrop': {
      backgroundColor: `color-mix(in srgb, ${colors.ink} 45%, transparent)`,
      animationName: fade,
      animationDuration: '0.15s',
      animationTimingFunction: 'ease',
    },
  },
  body: {
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
    padding: PAD,
    display: 'grid',
    gap: 16,
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actions: {
    position: 'sticky',
    bottom: -PAD,
    marginTop: 0,
    marginInline: -PAD,
    marginBottom: -PAD,
    paddingTop: 12,
    paddingInline: PAD,
    paddingBottom: 18,
    backgroundColor: colors.paper2,
    borderTopWidth: 1.5,
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
    display: 'grid',
    gap: 6,
  },
})

export interface DialogProps {
  open: boolean
  /** Called when the player asks to close: Esc, a backdrop click, or the close button. */
  onClose: () => void
  /** When `false`, Esc and backdrop clicks do nothing and there is no close button. */
  dismissible?: boolean
  /** A heading row with a close button. Without it, pass `labelledBy`. */
  title?: ComponentChildren
  /** The id of the element that names the dialog, when there is no `title`. */
  labelledBy?: string
  children?: ComponentChildren
  /** Styles for the dialog body, which is a grid with a 16px gap. */
  xstyle?: stylex.StyleXStyles
}

/**
 * A modal dialog on the native `<dialog>` element, so the browser traps focus and makes the page
 * behind it inert. Its children render only while it is open, so they start fresh each time.
 */
export function Dialog({
  open,
  onClose,
  dismissible = true,
  title,
  labelledBy,
  children,
  xstyle,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<Element | null>(null)
  const titleId = useId()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      openerRef.current = document.activeElement
      el.showModal()
      activeModal.value = el
    } else if (!open && el.open) {
      el.close()
      if (activeModal.peek() === el) activeModal.value = null
      const back = openerRef.current
      openerRef.current = null
      if (back instanceof HTMLElement && back.isConnected) back.focus()
    }
  }, [open])

  useEffect(
    () => () => {
      const el = dialogRef.current
      el?.close()
      if (el && activeModal.peek() === el) activeModal.value = null
    },
    [],
  )

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? titleId : labelledBy}
      onKeyDown={(e) => {
        // Chrome closes a dialog on a second Esc even when `cancel` is prevented. A prevented keydown never cancels.
        if (e.key === 'Escape' && !dismissible) e.preventDefault()
      }}
      onCancel={(e) => {
        // The parent owns `open`, so the dialog never closes itself.
        e.preventDefault()
        if (dismissible) onClose()
      }}
      onMouseDown={(e) => {
        // The body fills the dialog, so only a backdrop press targets the dialog itself.
        if (dismissible && e.target === e.currentTarget) onClose()
      }}
      {...stylex.props(styles.dialog)}
    >
      {open && (
        <div {...stylex.props(styles.body, xstyle)}>
          {title && (
            <div {...stylex.props(styles.head)}>
              <h2 id={titleId} {...stylex.props(text.display, text.h2)}>
                {title}
              </h2>
              {dismissible && <IconButton icon="x" label="Close" onClick={onClose} />}
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  )
}

/** A footer that sticks to the bottom of a scrolling dialog, for the main actions. */
export function DialogActions({
  children,
  xstyle,
}: {
  children?: ComponentChildren
  xstyle?: stylex.StyleXStyles
}) {
  return <div {...stylex.props(styles.actions, xstyle)}>{children}</div>
}
