import * as stylex from '@stylexjs/stylex'
import { createPortal } from 'preact/compat'

import { activeModal } from '../../lib/modal.ts'
import { toasts } from '../../lib/toast.ts'
import { colors } from '../../styles/tokens.stylex.ts'

const slideDown = stylex.keyframes({
  from: { transform: 'translateY(-16px)', opacity: 0 },
})

const styles = stylex.create({
  region: {
    position: 'fixed',
    zIndex: 50,
    left: '50%',
    transform: 'translateX(-50%)',
    top: 'calc(env(safe-area-inset-top, 0px) + 72px)',
    display: 'grid',
    gap: 8,
    width: 'min(92vw, 420px)',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.ink,
    color: colors.paper,
    paddingBlock: 12,
    paddingInline: 14,
    borderRadius: 14,
    boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.5)',
    animationName: slideDown,
    animationDuration: '0.3s',
    animationTimingFunction: 'cubic-bezier(0.3, 1.5, 0.5, 1)',
    fontSize: 15,
  },
})

/** Renders the toast queue from `toast()`, inside the open modal dialog if there is one. Mount it once per page. */
export function Toaster() {
  const region = (
    <div role="status" aria-live="polite" {...stylex.props(styles.region)}>
      {/* At most two at a time. The rest wait their turn, and expire on their own timers. */}
      {toasts.value.slice(0, 2).map((t) => (
        <div key={t.id} {...stylex.props(styles.toast)}>
          {t.content}
        </div>
      ))}
    </div>
  )
  const host = activeModal.value
  return host ? createPortal(region, host) : region
}
