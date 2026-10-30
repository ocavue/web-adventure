import * as stylex from '@stylexjs/stylex'

import { splitCode } from '../../lib/utils.ts'
import { colors, fonts } from '../../styles/tokens.stylex.ts'

const styles = stylex.create({
  code: {
    fontFamily: fonts.mono,
    fontSize: '0.9em',
    backgroundColor: colors.paper3,
    borderRadius: 6,
    paddingBlock: '0.08em',
    paddingInline: '0.35em',
    overflowWrap: 'anywhere',
  },
})

/** Text where `backtick` spans render as inline code. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {splitCode(text).map((part, i) => {
        return i % 2 ? (
          <code key={i} {...stylex.props(styles.code)}>
            {part}
          </code>
        ) : (
          part
        )
      })}
    </>
  )
}
