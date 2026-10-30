import * as stylex from '@stylexjs/stylex'
import { useId, useState } from 'preact/hooks'

import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { SegmentedControl } from '../../components/ui/SegmentedControl.tsx'
import { MOD, REPO_URL } from '../../lib/constants.ts'
import { toast } from '../../lib/toast.ts'
import type { Question } from '../../lib/types.ts'
import { text } from '../../styles/shared.ts'

const REASONS = [
  'The answer is wrong',
  'It is confusing',
  'Typo or formatting',
  'Too hard for this level',
] as const

type Reason = (typeof REASONS)[number]

const OPTIONS = REASONS.map((r) => ({ value: r, label: r }))

const styles = stylex.create({
  seg: { gridAutoFlow: 'row', gridTemplateColumns: '1fr 1fr' },
})

/** The prefilled GitHub "new issue" URL for a problem with a question. */
function issueUrl(q: Question, reason: string): string {
  const title = `Question ${q.id}: ${reason}`
  const body = `**Question:** \`${q.id}\` (${MOD[q.module].name}, level ${q.level})\n\n> ${q.prompt}\n\n**Problem:** ${reason}\n\n**Details:**\n\n`
  return `${REPO_URL}/issues/new?${new URLSearchParams({ title, body, labels: 'question' }).toString()}`
}

export interface ReportDialogProps {
  question: Question | null
  onClose: () => void
}

/** "Report a problem": opens a prefilled GitHub issue about the question in a new tab. */
export function ReportDialog({ question, onClose }: ReportDialogProps) {
  return (
    <Dialog open={question !== null} onClose={onClose} title="Report a problem">
      {question && <ReportForm question={question} onClose={onClose} />}
    </Dialog>
  )
}

function ReportForm({ question, onClose }: { question: Question; onClose: () => void }) {
  const [reason, setReason] = useState<Reason>(REASONS[0])
  const labelId = useId()
  return (
    <>
      <p id={labelId} {...stylex.props(text.muted)}>
        Question <span {...stylex.props(text.mono)}>{question.id}</span>. What seems wrong?
      </p>
      <SegmentedControl
        options={OPTIONS}
        value={reason}
        onChange={setReason}
        labelledBy={labelId}
        xstyle={styles.seg}
      />
      <p {...stylex.props(text.muted, text.tiny)}>
        This opens a GitHub issue in a new tab, with the details filled in.
      </p>
      <Button
        variant="primary"
        wide
        onClick={() => {
          window.open(issueUrl(question, reason), '_blank', 'noopener')
          onClose()
          toast('Thanks! Your report helps make the trail better.')
        }}
      >
        Open the report
      </Button>
    </>
  )
}
