import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import stylex from '@stylexjs/unplugin'
import { defineConfig } from 'astro/config'

import { SITE_URL } from './src/lib/seo.ts'

// Pages that only make sense with local progress, plus the not-found page.
const NOINDEX = /^\/(?:play|profile|cert|404)(?:\/|$)/

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // Pages build to `<path>/index.html`; links use the same form (see `src/lib/routes.ts`).
  trailingSlash: 'always',
  build: {
    // StyleX appends its CSS to an emitted stylesheet, so stylesheets must not be inlined.
    inlineStylesheets: 'never',
  },
  integrations: [preact(), sitemap({ filter: (page) => !NOINDEX.test(new URL(page).pathname) })],
  vite: {
    plugins: [stylex.vite({ useCSSLayers: true })],
  },
})
