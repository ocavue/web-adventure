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

// Stored progress is forgiving field by field: one bad value must never cost the player the rest.
// Each field falls back to its default, and records drop only their invalid entries.

/** A finite number, or a numeric string such as `"80"`. */
const num = v.union([
  v.pipe(v.number(), v.finite()),
  v.pipe(v.string(), v.trim(), v.decimal(), v.transform(Number)),
])
const nonNegative = v.pipe(
  num,
  v.transform((n) => Math.max(0, n)),
)
const count = v.fallback(nonNegative, 0)
const day = v.fallback(v.string(), '')

/** A record that keeps the entries that match `item` and drops the others. */
function entries<T extends v.GenericSchema>(item: T) {
  return v.fallback(
    v.pipe(
      v.record(v.string(), v.unknown()),
      v.transform((input) => {
        const out: Record<string, v.InferOutput<T>> = {}
        for (const [key, value] of Object.entries(input)) {
          const result = v.safeParse(item, value)
          if (result.success) out[key] = result.output
        }
        return out
      }),
    ),
    () => ({}),
  )
}

const numberMap = entries(nonNegative)

/** Like `v.optional(schema)`, but an invalid value such as `null` also becomes `undefined`. */
function maybe<T extends v.GenericSchema>(schema: T) {
  return v.fallback(v.optional(schema), undefined)
}

const ThemeSchema = v.union([
  v.picklist(['system', 'light', 'dark']),
  // An older name of `system`.
  v.pipe(
    v.literal('auto'),
    v.transform(() => 'system' as const),
  ),
])

/** Player progress as stored in `localStorage` and in backup files. Missing or invalid fields get defaults. */
export const StateSchema = v.object({
  v: v.literal(1),
  name: v.fallback(
    v.pipe(
      v.string(),
      v.transform((s) => s.slice(0, 24)),
    ),
    '',
  ),
  onboarded: v.fallback(v.boolean(), false),
  xp: count,
  goal: v.fallback(v.pipe(num, v.minValue(1)), 80),
  streak: v.fallback(v.object({ count, best: count, last: day }), () => ({
    count: 0,
    best: 0,
    last: '',
  })),
  daily: v.fallback(v.object({ date: day, xp: count }), () => ({ date: '', xp: 0 })),
  week: numberMap,
  lessons: entries(
    v.object({
      stars: v.pipe(
        num,
        v.transform((n) => Math.min(3, Math.max(0, n))),
      ),
      at: count,
    }),
  ),
  jumps: numberMap,
  seen: entries(v.object({ c: count, w: count, miss: maybe(v.boolean()) })),
  badges: numberMap,
  stats: v.fallback(
    v.object({
      answered: count,
      correct: count,
      bestCombo: count,
      lessons: count,
      reviewCleared: count,
      hints: count,
      time: count,
    }),
    () => ({
      answered: 0,
      correct: 0,
      bestCombo: 0,
      lessons: 0,
      reviewCleared: 0,
      hints: 0,
      time: 0,
    }),
  ),
  challenges: numberMap,
  settings: v.fallback(
    v.object({
      sound: v.fallback(v.boolean(), true),
      calm: v.fallback(v.boolean(), false),
      theme: v.fallback(ThemeSchema, 'system'),
    }),
    () => ({ sound: true, calm: false, theme: 'system' as const }),
  ),
  updatedAt: count,
  freezes: maybe(nonNegative),
  usedFreeze: maybe(v.string()),
  freezeEarned: maybe(v.string()),
  dailySeen: maybe(v.object({ date: v.string(), ids: v.array(v.string()) })),
  dayLessons: maybe(v.object({ date: v.string(), n: nonNegative })),
})
