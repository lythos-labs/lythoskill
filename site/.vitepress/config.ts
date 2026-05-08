import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'lythoskill',
  description: 'Declarative skill governance for AI agents — deck, curate, validate, reconcile.',
  lang: 'en-US',

  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],

  themeConfig: {
    nav: [
      { text: 'In Action', link: '/in-action/level-0' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Packages', link: '/packages/' },
      { text: 'Patterns', link: '/patterns/' },
    ],

    sidebar: {
      '/in-action/': [
        { text: 'Level 0: Taste', link: '/in-action/level-0' },
        { text: 'Level 1: First Deck', link: '/in-action/level-1' },
        { text: 'Level 2: Governance', link: '/in-action/level-2' },
        { text: 'Level 3: Skill Author', link: '/in-action/level-3' },
        { text: 'Level 4: Arena', link: '/in-action/level-4' },
        { text: 'Level 5: Team Scale', link: '/in-action/level-5' },
      ],
      '/guide/': [
        { text: 'Overview', link: '/guide/' },
        { text: 'Deck Governance', link: '/guide/deck' },
        { text: 'Arena Testing', link: '/guide/arena' },
        { text: 'Curator Discovery', link: '/guide/curator' },
      ],
      '/packages/': [
        { text: 'All Packages', link: '/packages/' },
      ],
      '/patterns/': [
        { text: 'Player-Deck Separation', link: '/patterns/player-deck' },
        { text: 'AGENTS.md Bootloader', link: '/patterns/agents-md-bootloader' },
        { text: 'Curator Comparison', link: '/patterns/curator-comparison' },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lythos-labs/lythoskill' },
    ],
  },
})
