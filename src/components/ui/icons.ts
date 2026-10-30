/** Inner SVG markup of each 24x24 icon. */
export const ICONS = {
  flame:
    '<path d="M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" fill="currentColor"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9z" fill="currentColor"/><path d="M2 9h20M12 21 8 9l4-6 4 6z" stroke="rgba(0,0,0,.18)" stroke-width="1.4" fill="none"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z" fill="currentColor"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.4" fill="none"/>',
  check:
    '<path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  boot: '<path d="M7 3h5v8l6 3c2 1 2 3 2 4v2H4v-5l3-2z" fill="currentColor"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  undo: '<path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  compass:
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor"/>',
  clock:
    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  sun: '<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="currentColor"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 3v15M15 6v15" stroke="currentColor" stroke-width="2.2"/>',
  rocket:
    '<path d="M12 2c4 2 6 6 6 11l-3 3H9l-3-3c0-5 2-9 6-11z" fill="currentColor"/><circle cx="12" cy="10" r="2" fill="rgba(0,0,0,.25)"/><path d="M9 18l-2 4M15 18l2 4M12 18v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  wrench:
    '<path d="M14.5 3.5a5 5 0 0 0-5.8 6.8L3 16l5 5 5.7-5.7a5 5 0 0 0 6.8-5.8l-3 3-3.5-1-1-3.5z" fill="currentColor"/>',
  hundred:
    '<text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" font-family="sans-serif" fill="currentColor">100</text>',
  mountain: '<path d="M2 20 9 7l4 6 2-3 7 10z" fill="currentColor"/>',
  tent: '<path d="M12 3 2 20h20zM12 3v17M9 20l3-6 3 6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
  flag: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5" stroke="currentColor" stroke-width="2.4" fill="currentColor" stroke-linejoin="round"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/>',
  gear: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  user: '<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/>',
  trophy:
    '<path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5a3.5 3.5 0 0 0 4 4.5M17 5h3.5a3.5 3.5 0 0 1-4 4.5M12 13v4M8 21h8l-1-4H9z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
  back: '<path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  repeat:
    '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  flagq:
    '<path d="M6 21V4M6 4h10l-2 3.5L16 11H6" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="2.2" fill="none"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" stroke-width="2.2" fill="none"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
} satisfies Record<string, string>

export type IconName = keyof typeof ICONS
