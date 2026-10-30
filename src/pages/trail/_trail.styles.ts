import * as stylex from '@stylexjs/stylex'

export const styles = stylex.create({
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    paddingTop: 24,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  title: { flex: '1', minWidth: 200, display: 'grid', gap: 4 },
  name: { overflowWrap: 'anywhere' },
})
