import * as stylex from '@stylexjs/stylex'

import { REPO_URL } from '../../lib/constants.ts'
import { focus } from '../../styles/shared.ts'
import { colors, fonts } from '../../styles/tokens.stylex.ts'

import { Icon } from './Icon.tsx'

const styles = stylex.create({
  footer: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 980,
    marginInline: 'auto',
    paddingTop: 20,
    paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))',
    paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
    paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
    display: { default: 'flex', '@media print': 'none' },
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 4,
    fontSize: 14,
    color: colors.ink2,
    textAlign: 'center',
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingInline: 4,
    borderRadius: 8,
    color: colors.ink,
    fontFamily: fonts.mono,
    fontWeight: 600,
    textDecoration: { default: 'none', ':hover': 'underline' },
    overflowWrap: 'anywhere',
  },
  icon: { width: 18, height: 18 },
})

/** The site footer with a link to the source code. */
export function SiteFooter() {
  return (
    <footer {...stylex.props(styles.footer)}>
      <span>Web Adventure is free and open source:</span>
      <a href={REPO_URL} {...stylex.props(styles.link, focus.ring)}>
        <Icon name="github" xstyle={styles.icon} />
        {REPO_URL.replace('https://', '')}
      </a>
    </footer>
  )
}
