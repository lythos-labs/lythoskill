import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'lythoskill',
  description: 'Declarative skill governance for AI agents — deck, curate, validate, reconcile.',
  lang: 'en-US',

  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Patterns', link: '/patterns/' },
      { text: 'ADRs', link: '/adr/' },
    ],

    sidebar: {
      '/guide/': [
        { text: 'Overview', link: '/guide/' },
        { text: 'Deck Governance', link: '/guide/deck' },
        { text: 'Arena Testing', link: '/guide/arena' },
        { text: 'Curator Discovery', link: '/guide/curator' },
      ],
      '/patterns/': [
        { text: 'All Patterns', link: '/patterns/' },
        { text: 'Player-Deck Separation', link: '/patterns/player-deck' },
        { text: 'AGENTS.md Bootloader', link: '/patterns/agents-md-bootloader' },
        { text: 'Curator Comparison', link: '/patterns/curator-comparison' },
      ],
      '/adr/': [
        { text: 'All ADRs', link: '/adr/' },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lythos-labs/lythoskill' },
    ],
  },
})
