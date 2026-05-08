import { defineConfig } from 'vitepress'

// Site is a thin landing page — all deep content lives in cortex/wiki/.
// GitHub wiki URLs are the canonical links.

export default defineConfig({
  title: 'lythoskill',
  description: 'Declarative skill governance for AI agents — deck, curate, validate, reconcile.',
  lang: 'en-US',

  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],

  themeConfig: {
    nav: [
      { text: 'Wiki', link: 'https://github.com/lythos-labs/lythoskill/tree/main/cortex/wiki' },
      { text: 'In Action', link: 'https://github.com/lythos-labs/lythoskill/blob/main/cortex/wiki/02-faq/lythoskill-in-action-guided-tour.md' },
      { text: 'GitHub', link: 'https://github.com/lythos-labs/lythoskill' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lythos-labs/lythoskill' },
    ],
  },
})
