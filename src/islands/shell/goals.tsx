import * as stylex from '@stylexjs/stylex'

import type { SegmentedOption } from '../../components/ui/SegmentedControl.tsx'
import { GOALS } from '../../lib/constants.ts'

import { form } from './form.styles.ts'

/** Daily goal choices: the name, with the XP below it. */
export const GOAL_OPTIONS: SegmentedOption<number>[] = GOALS.map(([value, name]) => ({
  value,
  label: (
    <>
      {name}
      <br />
      <span {...stylex.props(form.optionSub)}>{value} XP</span>
    </>
  ),
}))
