import * as stylex from '@stylexjs/stylex'

import { colors } from '../../styles/tokens.stylex.ts'

/** Form layout shared by the settings and onboarding dialogs. */
export const form = stylex.create({
  field: { display: 'grid', gap: 6 },
  label: { fontWeight: 700, fontSize: 14 },
  input: {
    font: 'inherit',
    fontSize: 17,
    paddingBlock: 12,
    paddingInline: 14,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: colors.paper,
    color: colors.ink,
    outline: 'none',
    boxShadow: {
      default: `inset 0 0 0 2px ${colors.line}`,
      ':focus': `inset 0 0 0 2.5px ${colors.focus}`,
    },
    width: '100%',
  },
  note: { fontSize: 13, color: colors.ink2 },
  optionSub: { fontWeight: 400, fontSize: 12, color: colors.ink2 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
})
