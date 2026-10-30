import * as stylex from '@stylexjs/stylex'
import { createPortal } from 'preact/compat'

import { announcement } from '../../lib/announce.ts'
import { activeModal } from '../../lib/modal.ts'
import { layout } from '../../styles/shared.ts'

/** The assertive live region for `announce()`. Mount it once per page. */
export function Announcer() {
  const region = (
    <div aria-live="assertive" {...stylex.props(layout.srOnly)}>
      {announcement.value}
    </div>
  )
  const host = activeModal.value
  return host ? createPortal(region, host) : region
}
