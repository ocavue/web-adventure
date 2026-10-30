import * as stylex from '@stylexjs/stylex'
import { useRef } from 'preact/hooks'

import { Buddy } from '../../components/ui/Bit.tsx'
import { Blaze } from '../../components/ui/Blaze.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Stars } from '../../components/ui/Stars.tsx'
import { MOD } from '../../lib/constants.ts'
import { useProgressState } from '../../lib/hooks.ts'
import { modComplete, modStats } from '../../lib/progress.ts'
import { toast } from '../../lib/toast.ts'
import type { ModuleId, State } from '../../lib/types.ts'
import { text } from '../../styles/shared.ts'
import { accent, colors, fonts, printColors, radii } from '../../styles/tokens.stylex.ts'

const PRINT = '@media print'

const styles = stylex.create({
  page: {
    maxWidth: 620,
    marginInline: 'auto',
    paddingTop: 36,
    paddingBottom: 60,
    display: 'grid',
    gap: 20,
    justifyItems: 'center',
    textAlign: 'center',
  },
  // On paper, the certificate covers the whole page, so the top bar and background do not print.
  printPage: {
    position: { default: null, [PRINT]: 'fixed' },
    inset: { default: null, [PRINT]: 0 },
    zIndex: { default: null, [PRINT]: 100 },
    alignContent: { default: null, [PRINT]: 'center' },
    paddingInline: { default: null, [PRINT]: 24 },
    maxWidth: { default: 620, [PRINT]: 'none' },
    backgroundColor: { default: null, [PRINT]: printColors.paper },
    color: { default: null, [PRINT]: printColors.ink },
    printColorAdjust: 'exact',
  },
  card: {
    width: '100%',
    maxWidth: { default: null, [PRINT]: 620 },
    backgroundColor: { default: colors.paper2, [PRINT]: printColors.paper },
    borderRadius: radii.l,
    paddingBlock: 28,
    paddingInline: 22,
    boxShadow: {
      default: `inset 0 0 0 2px ${accent.color}, inset 0 0 0 8px ${colors.paper2}, inset 0 0 0 9.5px color-mix(in srgb, ${accent.color} 45%, ${colors.line})`,
      [PRINT]: `inset 0 0 0 2px ${accent.color}, inset 0 0 0 8px ${printColors.paper}, inset 0 0 0 9.5px color-mix(in srgb, ${accent.color} 45%, ${printColors.paper})`,
    },
    display: 'grid',
    gap: 12,
    justifyItems: 'center',
    textAlign: 'center',
    printColorAdjust: 'exact',
    breakInside: 'avoid',
  },
  who: {
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: 30,
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  },
  printMuted: { color: { default: null, [PRINT]: printColors.ink2 } },
  buddy: { textAlign: 'start' },
  actions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap-reverse',
    justifyContent: 'center',
    width: '100%',
  },
  action: { flexGrow: 1, flexShrink: 1, flexBasis: 200 },
  // Each element keeps its own display on screen, and hides on paper.
  hideBlock: { display: { default: 'block', [PRINT]: 'none' } },
  hideFlex: { display: { default: 'flex', [PRINT]: 'none' } },
  hideInlineFlex: { display: { default: 'inline-flex', [PRINT]: 'none' } },
  message: { maxWidth: 520 },
  loading: { minHeight: '40vh', alignContent: 'center' },
})

/** The time of the last lesson finished in a trail, or now when there is none. */
function lastLessonAt(mod: ModuleId, s: State): number {
  let last = 0
  for (const [k, r] of Object.entries(s.lessons)) {
    if (k.startsWith(mod + ':')) last = Math.max(last, r.at)
  }
  return last || Date.now()
}

export interface CertificateProps {
  mod: ModuleId
  /** Questions in the trail, from the bank at build time. */
  questionCount: number
}

/** The certificate for a finished trail, or a friendly nudge when the trail is not finished yet. */
export function Certificate({ mod, questionCount }: CertificateProps) {
  const { state, ready, pending } = useProgressState()
  const shareRef = useRef<HTMLParagraphElement>(null)
  const m = MOD[mod]

  if (!ready) {
    return (
      <div {...pending} {...stylex.props(styles.page, styles.loading)}>
        <p {...stylex.props(text.muted)}>Checking your trail…</p>
      </div>
    )
  }

  const st = modStats(mod, state)
  if (!modComplete(mod, state)) {
    return (
      <div {...stylex.props(styles.page)}>
        <Buddy mood="calm" size="large" xstyle={[styles.buddy, styles.message]}>
          Not quite at the summit yet! Finish all {st.total} lessons of the {m.name} trail to earn
          this certificate. You have finished {st.done} so far.
        </Buddy>
        <Button variant="primary" href={`/trail/${mod}`}>
          Go to the {m.name} trail
        </Button>
      </div>
    )
  }

  const maxStars = st.total * 3
  const date = new Date(lastLessonAt(mod, state)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const share = `I just reached the summit of the ${m.name} trail on Byte Trail: ${st.total} lessons, ${questionCount} questions, ${st.stars}/${maxStars} stars.`

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(share)
      toast('Copied! Paste it anywhere.')
    } catch {
      const node = shareRef.current
      const sel = getSelection()
      if (!node || !sel) return
      const range = document.createRange()
      range.selectNodeContents(node)
      sel.removeAllRanges()
      sel.addRange(range)
      toast('Text selected. Press copy to copy it.')
    }
  }

  return (
    <div {...stylex.props(styles.page, styles.printPage)}>
      <article {...stylex.props(styles.card)} aria-label={`${m.name} certificate`}>
        <Blaze glyph={m.glyph} mod={mod} />
        <p {...stylex.props(text.eyebrow, styles.printMuted)}>Certificate of completion</p>
        <p {...stylex.props(text.muted, styles.printMuted)}>This certifies that</p>
        <p {...stylex.props(styles.who)}>{state.name || 'A determined hiker'}</p>
        <p>
          reached the summit of the <b>{m.name}</b> trail on Byte Trail,
          <br />
          answering {questionCount} questions across 5 levels.
        </p>
        <Stars count={3} />
        <p {...stylex.props(text.mono, text.muted, text.tiny, styles.printMuted)}>
          {st.stars} / {maxStars} stars · {date}
        </p>
      </article>
      <Buddy mood="wow" xstyle={[styles.buddy, styles.hideFlex]}>
        Screenshot this and share it. You earned it!
      </Buddy>
      <div {...stylex.props(styles.actions, styles.hideFlex)}>
        <Button icon="copy" onClick={() => void copyShare()} xstyle={styles.action}>
          Copy share text
        </Button>
        <Button variant="primary" href="/" xstyle={styles.action}>
          More trails
        </Button>
      </div>
      <p ref={shareRef} {...stylex.props(text.muted, text.small, styles.hideBlock)}>
        {share}
      </p>
      <Button
        variant="ghost"
        size="small"
        onClick={() => window.print()}
        xstyle={styles.hideInlineFlex}
      >
        Print or save as PDF
      </Button>
    </div>
  )
}
