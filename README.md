# Byte Trail

A playful quiz website for beginner web developers. Seven trails (HTML, CSS, JavaScript, TypeScript, Web Platform, React, Git & Tools), each with 5 levels and 120 questions.

Live at https://web-adventure.pages.dev/

## Development

```sh
pnpm install
pnpm run dev
```

| Script               | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `pnpm run build`     | Builds the site into `dist/`.                     |
| `pnpm run typecheck` | Type-checks with `tsc`.                           |
| `pnpm run lint`      | Runs ESLint, oxfmt, and knip.                     |
| `pnpm run fix`       | Formats the code and fixes lint errors.           |
| `pnpm run test`      | Runs the unit tests and the question bank checks. |
| `pnpm run test:e2e`  | Plays real lessons in Chromium with Playwright.   |

## Layout

- `src/main.ts`: entry point and global event handlers.
- `src/lesson.ts`: the lesson engine (answers, XP, results).
- `src/views/`: one module per screen.
- `src/state.ts`: player progress, saved in `localStorage`.
- `src/questions/<module>.json`: the question banks. `src/questions.test.ts` checks their format and the type mix of every lesson.

Lessons are consecutive groups of 8 questions per level, in file order. Choices are shuffled at runtime, so never write position-based choices such as "All of the above".

## Deployment

Cloudflare Pages builds and deploys every push to `master`. It runs `pnpm run build` and serves `dist/`. The build settings live in the Cloudflare dashboard, and `.node-version` sets the Node.js version.
