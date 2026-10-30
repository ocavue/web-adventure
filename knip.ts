import type { KnipConfig } from 'knip'

export default {
  compilers: {
    // Lets knip see the font packages that `src/styles/global.css` imports.
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join('\n'),
  },
} satisfies KnipConfig
