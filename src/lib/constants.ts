import type { ModuleId } from './types.ts'

export interface ModuleInfo {
  id: ModuleId
  name: string
  glyph: string
  tagline: string
}

export const MODULES: ModuleInfo[] = [
  { id: 'html', name: 'HTML', glyph: '<h>', tagline: 'Structure every page stands on.' },
  { id: 'css', name: 'CSS', glyph: '{ }', tagline: 'Color, layout, and a little magic.' },
  { id: 'js', name: 'JavaScript', glyph: 'JS', tagline: 'Make pages think and react.' },
  { id: 'ts', name: 'TypeScript', glyph: 'TS', tagline: 'JavaScript with a safety net.' },
  { id: 'web', name: 'Web Platform', glyph: '://', tagline: 'Browsers, HTTP, and the DOM.' },
  { id: 'react', name: 'React', glyph: '</>', tagline: 'Build UIs from components.' },
  { id: 'git', name: 'Git & Tools', glyph: 'git', tagline: 'Save, share, and ship your work.' },
]
export const MOD = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleId, ModuleInfo>
export const LEVELS = 5
export const GOALS: [number, string][] = [
  [40, 'Chill'],
  [80, 'Steady'],
  [150, 'Keen'],
  [250, 'Intense'],
]
export const LESSONS_PER_LEVEL = 3
export const Q_PER_LESSON = 8
export const CAMP_NAMES = ['Trailhead', 'Pine Camp', 'Ridge Camp', 'High Camp', 'Summit Push']
export const ELEVATIONS = [400, 900, 1500, 2200, 3000]
export const RANKS: [number, string][] = [
  [0, 'Trail Newbie'],
  [150, 'Code Scout'],
  [400, 'Bug Spotter'],
  [800, 'Junior Explorer'],
  [1500, 'Stack Ranger'],
  [2600, 'Web Pathfinder'],
  [4200, 'Summit Seeker'],
  [6500, 'Trail Legend'],
]

export type BadgeColor = ModuleId | 'blaze' | 'flame' | 'ember' | 'amber' | 'red'

export interface Badge {
  id: string
  name: string
  desc: string
  icon: string
  /** A color name that `Badge` maps to a design token. */
  color: BadgeColor
}

export const BADGES: Badge[] = [
  {
    id: 'first',
    name: 'First Steps',
    desc: 'Finish your first lesson',
    icon: 'boot',
    color: 'web',
  },
  {
    id: 'perfect',
    name: 'Flawless',
    desc: 'Earn 3 stars on a lesson',
    icon: 'star',
    color: 'blaze',
  },
  { id: 'combo5', name: 'On a Roll', desc: '5 correct in a row', icon: 'flame', color: 'flame' },
  {
    id: 'combo12',
    name: 'Unstoppable',
    desc: '12 correct in a row',
    icon: 'bolt',
    color: 'ember',
  },
  {
    id: 'comeback',
    name: 'Comeback',
    desc: 'Fix a missed question in the same lesson',
    icon: 'undo',
    color: 'ts',
  },
  {
    id: 'nohint',
    name: 'Solo Hiker',
    desc: 'Finish a lesson without hints (from lesson 3 on)',
    icon: 'compass',
    color: 'css',
  },
  {
    id: 'speedy',
    name: 'Trail Runner',
    desc: 'Finish 3 lessons in one day',
    icon: 'clock',
    color: 'react',
  },
  {
    id: 'daily',
    name: 'Daily Dose',
    desc: 'Complete a daily challenge',
    icon: 'sun',
    color: 'blaze',
  },
  {
    id: 'streak3',
    name: 'Warming Up',
    desc: 'Reach a 3-day streak',
    icon: 'flame',
    color: 'amber',
  },
  {
    id: 'streak7',
    name: 'Week Warrior',
    desc: 'Reach a 7-day streak',
    icon: 'flame',
    color: 'red',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    desc: 'Try 4 different trails',
    icon: 'map',
    color: 'web',
  },
  {
    id: 'jumper',
    name: 'Fast Track',
    desc: 'Pass a jump-ahead test',
    icon: 'rocket',
    color: 'git',
  },
  {
    id: 'reviewer',
    name: 'Patch Notes',
    desc: 'Clear 10 questions in Review',
    icon: 'wrench',
    color: 'ts',
  },
  {
    id: 'q100',
    name: 'Century',
    desc: 'Answer 100 questions',
    icon: 'hundred',
    color: 'html',
  },
  {
    id: 'q500',
    name: 'Marathon',
    desc: 'Answer 500 questions',
    icon: 'mountain',
    color: 'react',
  },
  {
    id: 'camp',
    name: 'Camp Cleared',
    desc: 'Finish every lesson in a level',
    icon: 'tent',
    color: 'css',
  },
  {
    id: 'summit',
    name: 'First Summit',
    desc: 'Finish a whole trail',
    icon: 'flag',
    color: 'html',
  },
  {
    id: 'allsummits',
    name: 'Mountaineer',
    desc: 'Finish all seven trails',
    icon: 'crown',
    color: 'blaze',
  },
  {
    id: 'owl',
    name: 'Night Owl',
    desc: 'Finish a lesson after 10 pm (from lesson 3 on)',
    icon: 'moon',
    color: 'ts',
  },
  {
    id: 'lark',
    name: 'Early Bird',
    desc: 'Finish a lesson before 8 am (from lesson 3 on)',
    icon: 'sun',
    color: 'amber',
  },
]
export const PRAISE = [
  'Nice!',
  'Correct!',
  'You got it!',
  'Great job!',
  'Spot on!',
  'Nailed it!',
  'Exactly right!',
  'Sharp!',
  'Well done!',
  'Yes!',
]
export const COMBO_PRAISE: Record<number, string> = {
  3: '3 in a row!',
  5: '5 in a row! On fire!',
  8: '8 in a row! Amazing!',
  12: '12 in a row! Unstoppable!',
  16: '16 in a row! Legendary!',
}
export const SOFT = [
  'Almost!',
  'Good try!',
  'Close one!',
  'Good guess! Here is the trick:',
  'This one trips up lots of devs.',
]
export const SOFT_TAIL = [
  'Now you know it, and that is the point.',
  'This one will come back at the end, and you will be ready.',
  'Read the explanation, then try it again later.',
  'Mistakes are how the brain files new facts.',
  'Even senior devs look this kind of thing up.',
]
export const BUDDY_LINES = [
  'Five minutes a day beats five hours once a month.',
  'Wrong answers cost nothing here. Guess boldly!',
  'Every expert was once a beginner who kept going.',
  'Small steps every day. That is the whole trick.',
  'Stuck? Tap the hint. That is what it is for.',
  'You are building real skills, one question at a time.',
  'Bugs are just puzzles wearing a disguise.',
]
export const REPO_URL = 'https://github.com/ocavue/web-adventure'
