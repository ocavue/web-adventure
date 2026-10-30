import { signal } from '@preact/signals'
import * as stylex from '@stylexjs/stylex'

const count = signal(0)
const styles = stylex.create({ btn: { backgroundColor: 'gold', padding: 8, borderRadius: 8 } })

export function Counter({ label }: { label: string }) {
  return (
    <button {...stylex.props(styles.btn)} onClick={() => count.value++}>
      {label} {count}
    </button>
  )
}
