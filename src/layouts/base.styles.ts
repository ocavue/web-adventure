import * as stylex from '@stylexjs/stylex'

import { colors, fonts } from '../styles/tokens.stylex.ts'

export const styles = stylex.create({
  body: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 1.5,
    minHeight: '100vh',
  },
  // With `viewport-fit=cover`, content would scroll visibly under the status bar of a notched phone.
  safeArea: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 'env(safe-area-inset-top, 0px)',
    backgroundColor: colors.paper,
    zIndex: 30,
    pointerEvents: 'none',
  },
  contours: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    backgroundColor: colors.contour,
    maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640' fill='none' stroke='black' stroke-width='1.4'%3E%3Cpath d='M120 140c60-50 170-40 210 10s20 130-50 150-170 0-190-60 0-70 30-100z'/%3E%3Cpath d='M95 135c70-75 215-62 262 2s28 168-62 192-210-4-232-82c-10-40 4-82 32-112z'/%3E%3Cpath d='M70 128c82-100 260-86 316-6s38 206-74 236-250-8-276-104c-12-46 6-92 34-126z'/%3E%3Cpath d='M160 160c30-22 90-18 112 8s10 64-26 74-92 0-100-32 0-34 14-50z'/%3E%3Cpath d='M470 430c50-40 140-30 160 20s-10 120-70 130-120-10-130-60 10-60 40-90z'/%3E%3Cpath d='M445 420c62-62 180-48 208 18s-12 160-92 172-160-14-172-80c-6-40 22-74 56-110z'/%3E%3Cpath d='M500 450c30-20 80-14 92 14s-6 64-40 70-66-6-70-32 0-34 18-52z'/%3E%3Cpath d='M-20 520c80-30 180 10 230 60s40 100 0 120'/%3E%3Cpath d='M-20 480c100-40 220 4 280 70s50 120 0 150'/%3E%3Cpath d='M420 -10c20 60 90 110 170 100s80-40 80-40'/%3E%3Cpath d='M380 -10c20 90 120 150 220 136s60-30 60-30'/%3E%3C/svg%3E")`,
    maskRepeat: 'repeat',
  },
})
