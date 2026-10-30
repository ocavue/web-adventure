# Byte Trail

A playful quiz site for beginner web developers: 7 trails (modules), 5 levels each, 3 lessons of 8 questions per level.

## Stack

- [Astro](https://astro.build) with `output: 'static'`. Every page is HTML built at build time. No server runs in production. Cloudflare Pages runs `pnpm run build` and serves `dist/`.
- [Preact](https://preactjs.com) islands for everything interactive, with [Signals](https://preactjs.com/guide/v10/signals) for state.
- [StyleX](https://stylexjs.com) for all styles. No other CSS, except `src/styles/global.css`.
- [Valibot](https://valibot.dev) for every untrusted or external data: question banks, stored progress, backup files.
- [Shiki](https://shiki.style) highlights question code at build time.
- Vitest (unit tests in Node, component tests in Chromium) and Playwright (e2e).

## Layout

```
src/
  pages/                 Astro routes. Each page is static HTML plus islands.
    questions/[mod].json.ts  Build-time endpoint: validated bank + Shiki HTML -> /questions/<mod>.json
  layouts/Base.astro     <html>, SEO head tags, theme bootstrap script, background.
  islands/               Preact components hydrated with `client:*` directives. One folder per feature.
  components/ui/         Shared Preact components (buttons, dialogs, bars, ...). They render on the server too.
  lib/                   Framework-free logic: schemas, store, progress rules, lesson engine, answer checks.
  styles/
    tokens.stylex.ts     Design tokens (`defineVars`): colors, fonts, radii, shadows, accent.
    themes.ts            `createTheme`s: light, dark, and one accent theme per trail.
    shared.ts            Shared `stylex.create` styles: text, layout, surfaces, focus ring.
    global.css           Reset, fonts, Shiki colors, reduced motion. Nothing else.
  questions/<mod>.json   Question banks (source data).
```

## Conventions

### Astro and islands

- Static content (headings, descriptions, level lists) stays in `.astro` files so it is in the HTML for search engines.
- Anything that depends on the player's progress is an island. Islands render on the server with a fresh progress state, then `useProgressState()` (`src/lib/hooks.ts`) loads the stored state after hydration. Never read `localStorage` during render.
- Pass build-time data (level titles, question counts) to islands as props. Islands load full question banks with `loadBank()` from `src/lib/bank.ts` only when they need questions.
- Navigation is plain links between pages (`<a href>`). There is no client router.
- Lessons run at `/play?mode=lesson&mod=js&level=1&lesson=0`. Other modes: `jump` (`mod`, `level`), `practice` (`mod`, `level`), `daily`, `review`.

### StyleX

- Never call `stylex.create` in an `.astro` file: the compiler does not see `.astro` files. Put styles in a `.ts` or `.tsx` file and use `stylex.attrs(...)` in Astro, `stylex.props(...)` in Preact.
- A style file inside `src/pages/` must start with `_` (for example `src/pages/_404.styles.ts`). Otherwise Astro treats it as a route.
- In dev, `Base.astro` loads `/virtual:stylex.css` and the StyleX HMR runtime. Pages that do not use `Base` get no StyleX styles in dev.
- Variables (`defineVars`) live only in `*.stylex.ts` files. `createTheme` calls live in other files, each bound to its own `const`.
- Use tokens from `tokens.stylex.ts` for every color, font, radius, and shadow. Do not write raw colors in components, except one-off decorative colors.
- The trail accent color is `accent.color`. Pages set it with `moduleThemes[mod]` on an ancestor.
- StyleX has no descendant selectors. Style each element directly. For parent states use `stylex.when.ancestor(':hover')` and `stylex.defaultMarker()`.
- StyleX CSS is collected from modules the server build compiles. A `client:only` island is not in that build, so import its style modules from the page (see `src/islands/play/server-styles.ts`), or its screens have no CSS.
- Components accept an optional `xstyle?: stylex.StyleXStyles` prop for overrides, applied last.
- Every interactive element needs a visible focus ring: use `focus.ring` from `shared.ts`.
- Respect reduced motion: `global.css` stops animations when the system asks for it or when the player turns on "Reduce motion".

### State

- `progress` (`src/lib/store.ts`) is the single source of truth for saved progress. Change it only through `updateProgress((draft) => { ... })` or `replaceProgress(next)`. Both save to `localStorage`.
- Islands that render on the server read progress only through `useProgressState()`, which returns `{ state, ready, pending }`. Each component gets the fresh state until its own mount effect runs, so its hydration render matches the server HTML even when another island loaded the stored progress first. Never read `progress.value` or `progressReady` during render there. `useProgress()` is only for `client:only` islands (the lesson page).
- Helpers in `src/lib/progress.ts` read the current progress by default. In islands, always pass the hook's `state` as the last argument.
- The inline script in `Base.astro` sets `data-returning` on `<html>` when progress is stored. Spread `pending` on every element that shows progress: a rule in `global.css` hides `[data-pending]` for returning players until the island is ready, so they never see new-player content.
- `StateSchema` is forgiving per field: invalid values fall back to defaults, records drop only bad entries. Unreadable stored data is copied to `byte-trail:v1:corrupt` before the next save.
- Mutating helpers (`addXp`, `touchStreak`) take the draft as their first argument.

### Data

- Question bank schema: `BankFileSchema` in `src/lib/schema.ts`. A bad bank fails the build.
- Lessons are consecutive groups of 8 questions per level, in file order. Every lesson mixes question types: see `src/questions.test.ts`.
- Choices are shuffled at runtime. Never write position-based choices such as "All of the above".
- Fill answers are case-insensitive, except camelCase identifiers in `js`/`ts`/`react` and CLI flags.

### E2E tests

- `e2e/server.ts` serves `dist/` like Cloudflare Pages: `/play` redirects to `/play/`, and an unknown path gets `404.html` with status 404. Run `pnpm run build` before `pnpm run test:e2e`.
- Helpers live in `e2e/support.ts`. Its `test` fails on any console error or page error.
- Island buttons do nothing before hydration. Call `hydrated(page)` before clicking one on a fresh page.

### Tone

Warm and encouraging. Wrong answers never cost anything; they come back at the end of the lesson. Bit, the mascot, cheers the player on.

### Code style

- TypeScript strict. No `any`.
- Accessible by default: real buttons and links, labels, `aria-*` where needed, native `<dialog>` for modals, keyboard shortcuts in lessons (1-4, T/F, H, Enter).
- Comments explain why, not what.

## Scripts

| Script               | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `pnpm run dev`       | Starts the dev server.                              |
| `pnpm run build`     | Builds the static site into `dist/`.                |
| `pnpm run typecheck` | Runs `astro check` (TypeScript and `.astro` files). |
| `pnpm run lint`      | Runs ESLint, oxfmt, and knip.                       |
| `pnpm run fix`       | Formats and fixes lint errors.                      |
| `pnpm run test`      | Unit tests (Node) and component tests (Chromium).   |
| `pnpm run test:e2e`  | Builds nothing. Runs Playwright against `dist/`.    |
