import * as stylex from '@stylexjs/stylex'

import { ProgressBar } from '../../components/ui/ProgressBar.tsx'
import { MOD } from '../../lib/constants.ts'
import { useProgress } from '../../lib/hooks.ts'
import { modStats } from '../../lib/progress.ts'
import type { ModuleId } from '../../lib/types.ts'
import { text } from '../../styles/shared.ts'
import { accent } from '../../styles/tokens.stylex.ts'

const styles = stylex.create({
  stats: { minWidth: 180, flexGrow: 0, flexShrink: 1, flexBasis: 240 },
  row: { display: 'flex', justifyContent: 'space-between' },
  bar: { marginTop: 6 },
})

/** Lessons done and stars earned on one trail. */
export function TrailStats({ mod }: { mod: ModuleId }) {
  const st = modStats(mod, useProgress())
  return (
    <div {...stylex.props(styles.stats)}>
      <div {...stylex.props(styles.row, text.muted, text.small)}>
        <span>
          {st.done}/{st.total} lessons
        </span>
        <span>{st.stars} stars</span>
      </div>
      <ProgressBar
        value={st.done / st.total}
        color={accent.color}
        label={`${MOD[mod].name} trail progress`}
        xstyle={styles.bar}
      />
    </div>
  )
}
