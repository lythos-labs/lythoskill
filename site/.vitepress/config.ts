import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'lythoskill',
  description: 'Declarative skill governance for AI agents — deck, curate, validate, reconcile.',
  lang: 'en-US',

  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],

  themeConfig: {
    nav: [
      { text: 'Philosophy', link: '/philosophy' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Ecosystem', link: '/ecosystem' },
      { text: 'GitHub', link: 'https://github.com/lythos-labs/lythoskill' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'In Action Guide',
          items: [
            { text: 'Overview', link: '/guide/' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lythos-labs/lythoskill' },
    ],
  },
})
