import * as v from 'valibot'

export const ModuleIdSchema = v.picklist(['html', 'css', 'js', 'ts', 'web', 'react', 'git'])

export const CodeLangSchema = v.picklist([
  'js',
  'ts',
  'html',
  'css',
  'jsx',
  'tsx',
  'bash',
  'json',
  'http',
  'text',
])

const text = v.pipe(v.string(), v.trim(), v.nonEmpty())

const base = {
  id: v.pipe(v.string(), v.regex(/^[a-z]+-\d{3}$/)),
  level: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5)),
  topic: text,
  prompt: text,
  code: v.optional(v.string()),
  lang: v.optional(CodeLangSchema),
  hint: text,
  explain: text,
}

// Choices are shuffled at runtime, so a choice must never refer to the others.
const choice = v.pipe(
  text,
  v.check(
    (c) => !/all of the above|none of the above|both a and b/i.test(c),
    'Choices must not refer to other choices',
  ),
)

const choices = v.pipe(
  v.array(choice),
  v.minLength(3),
  v.maxLength(4),
  v.check((list) => new Set(list).size === list.length, 'Choices must be unique'),
)

const SingleSchema = v.pipe(
  v.object({
    ...base,
    type: v.literal('single'),
    choices,
    answer: v.pipe(v.number(), v.integer(), v.minValue(0)),
  }),
  v.check((q) => q.answer < q.choices.length, 'The answer must be a choice index'),
)

const MultiSchema = v.pipe(
  v.object({
    ...base,
    type: v.literal('multi'),
    choices,
    answer: v.pipe(v.array(v.pipe(v.number(), v.integer(), v.minValue(0))), v.minLength(2)),
  }),
  v.check((q) => q.answer.every((i) => i < q.choices.length), 'Answers must be choice indices'),
  v.check((q) => new Set(q.answer).size === q.answer.length, 'Answers must be unique'),
  v.check((q) => q.answer.length < q.choices.length, 'The answer cannot be every choice'),
)

const TrueFalseSchema = v.object({ ...base, type: v.literal('tf'), answer: v.boolean() })

const FillSchema = v.object({
  ...base,
  type: v.literal('fill'),
  answer: v.pipe(v.array(text), v.minLength(1)),
})

export const QuestionSchema = v.pipe(
  v.variant('type', [SingleSchema, MultiSchema, TrueFalseSchema, FillSchema]),
  v.check((q) => q.code === undefined || q.lang !== undefined, 'Code needs a lang'),
)

export const LevelSchema = v.object({ title: text, blurb: text })

/** The shape of a `src/questions/<module>.json` file. */
export const BankFileSchema = v.object({
  module: ModuleIdSchema,
  levels: v.pipe(v.array(LevelSchema), v.length(5)),
  questions: v.array(QuestionSchema),
})

const count = v.optional(v.pipe(v.number(), v.minValue(0)), 0)
const numberMap = v.optional(v.record(v.string(), v.number()), {})
const day = v.optional(v.string(), '')

/** Player progress as stored in `localStorage` and in backup files. Missing fields get defaults. */
export const StateSchema = v.object({
  v: v.literal(1),
  name: v.optional(v.pipe(v.string(), v.maxLength(24)), ''),
  onboarded: v.optional(v.boolean(), false),
  xp: count,
  goal: v.optional(v.number(), 80),
  streak: v.optional(v.object({ count, best: count, last: day }), { count: 0, best: 0, last: '' }),
  daily: v.optional(v.object({ date: day, xp: count }), { date: '', xp: 0 }),
  week: numberMap,
  lessons: v.optional(v.record(v.string(), v.object({ stars: v.number(), at: count })), {}),
  jumps: numberMap,
  seen: v.optional(
    v.record(v.string(), v.object({ c: count, w: count, miss: v.optional(v.boolean()) })),
    {},
  ),
  badges: numberMap,
  stats: v.optional(
    v.object({
      answered: count,
      correct: count,
      bestCombo: count,
      lessons: count,
      reviewCleared: count,
      hints: count,
      time: count,
    }),
    { answered: 0, correct: 0, bestCombo: 0, lessons: 0, reviewCleared: 0, hints: 0, time: 0 },
  ),
  challenges: numberMap,
  settings: v.optional(
    v.object({
      sound: v.optional(v.boolean(), true),
      calm: v.optional(v.boolean(), false),
      theme: v.optional(v.picklist(['system', 'light', 'dark']), 'system'),
    }),
    { sound: true, calm: false, theme: 'system' },
  ),
  updatedAt: count,
  freezes: v.optional(v.number()),
  usedFreeze: v.optional(v.string()),
  freezeEarned: v.optional(v.string()),
  dailySeen: v.optional(v.object({ date: v.string(), ids: v.array(v.string()) })),
  dayLessons: v.optional(v.object({ date: v.string(), n: v.number() })),
})
