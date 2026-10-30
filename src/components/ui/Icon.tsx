import * as stylex from '@stylexjs/stylex'

import { ICONS } from './icons.ts'
import type { IconName } from './icons.ts'

const styles = stylex.create({
  icon: { width: 22, height: 22, flexShrink: 0 },
})

export function Icon({ name, xstyle }: { name: IconName; xstyle?: stylex.StyleXStyles }) {
  return (
    <svg
      {...stylex.props(styles.icon, xstyle)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      // The markup is a fixed string from `icons.ts`, never user input.
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
