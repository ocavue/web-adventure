/** XP for narrow screens: `1.2k` from 1000 on, the plain number below. */
export function compactXp(xp: number): string {
  return xp < 1000 ? String(xp) : `${(xp / 1000).toFixed(1).replace(/\.0$/, '')}k`
}
