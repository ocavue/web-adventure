import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import stylex from '@stylexjs/unplugin'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://web-adventure.pages.dev',
  output: 'static',
  build: {
    // StyleX appends its CSS to an emitted stylesheet, so stylesheets must not be inlined.
    inlineStylesheets: 'never',
  },
  integrations: [preact(), sitemap()],
  vite: {
    plugins: [stylex.vite({ useCSSLayers: true })],
  },
})
