# Byte Trail

A playful quiz website for beginner web developers. Seven trails (HTML, CSS, JavaScript, TypeScript, Web Platform, React, Git & Tools), each with 5 levels of short lessons.

Live at https://web-adventure.pages.dev/

It is a static site built with [Astro](https://astro.build), [Preact](https://preactjs.com) islands and [Signals](https://preactjs.com/guide/v10/signals), [StyleX](https://stylexjs.com), and [Valibot](https://valibot.dev).

## Development

```sh
pnpm install
pnpm run dev
```

| Script                  | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `pnpm run dev`          | Starts the Astro dev server.                                  |
| `pnpm run build`        | Builds the static site into `dist/`.                          |
| `pnpm run preview`      | Serves `dist/` locally.                                       |
| `pnpm run typecheck`    | Runs `astro check` (TypeScript and `.astro` files).           |
| `pnpm run lint`         | Runs ESLint, oxfmt, and knip.                                 |
| `pnpm run fix`          | Formats the code and fixes lint errors.                       |
| `pnpm run test`         | Runs unit tests in Node and component tests in Chromium.      |
| `pnpm run test:e2e`     | Runs the Playwright tests against `astro preview` of `dist/`. |
| `pnpm run test:install` | Installs Chromium for the component and e2e tests.            |

## Layout

See [AGENTS.md](./AGENTS.md) for the project layout and conventions. In short:

- `src/pages/`: Astro routes. Every page is static HTML plus Preact islands.
- `src/islands/` and `src/components/`: Preact components.
- `src/lib/`: framework-free logic (schemas, progress store, lesson rules, SEO helpers).
- `src/styles/`: StyleX tokens, themes, and shared styles.
- `src/questions/<trail>.json`: the question banks. A bad bank fails the build.
- `public/`: static files (`robots.txt`, `_headers`, `og.png`, icons, web manifest).

## Deployment

Cloudflare Pages builds and deploys every push to `master`. It runs `pnpm run build` and serves the `dist/` directory as a static site. There is no server. `.node-version` sets the Node.js version, and `public/_headers` sets the cache and security headers.
