/**
 * VitePress Site Configuration — lythoskill
 *
 * == Frontmatter Conventions (avoid YAML/vitepress parser bugs) ==
 *
 * 1. `→` (Unicode RIGHT ARROW U+2192) BREAKS YAML frontmatter parsing.
 *    Use `>`, `-&gt;`, or `&#8594;` inside YAML blocks (--- delimited).
 *    In markdown body (below frontmatter), `→` IS safe.
 *
 * 2. `import { defineConfig } from 'vitepress'` BREAKS local install
 *    (ESM/CJS resolution conflict with esbuild). Use plain object export.
 *
 * 3. `features.details` values must NOT contain `:` followed by `→`.
 *    "description → ecosystem" triggers YAML "incomplete explicit mapping pair".
 *
 * 4. Use `srcExclude: ['../**']` if running `vitepress dev` from project root
 *    (prevents HMR watcher from parsing root .md files as Vue SFCs).
 *    `drafts/**` is also excluded — rejected drafts kept as raw material,
 *    not publishable pages (unescaped `<...>` in them breaks the Vue SFC parse).
 *
 * 5. Static assets (favicon.svg etc.) go in `site/public/`, served at `/`.
 *
 * == Best practices ==
 *
 * - Copy this comment block when creating new VitePress site pages.
 * - Prefer plain markdown (no YAML frontmatter) for content pages.
 * - Only index.md (home layout) needs `---` frontmatter.
 * - Test with `npx vitepress build .` before committing.
 */
const config = {
  // Shared across all locales
  base: '/lythoskill/',
  srcExclude: ['../**', 'drafts/**'],
  head: [['link', { rel: 'icon', href: '/lythoskill/favicon.svg' }]],

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'lythoskill',
      description: 'Declarative skill governance for AI agents — deck, curate, validate, reconcile.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Ecosystem', link: '/ecosystem' },
          { text: 'Philosophy', link: '/philosophy' },
          { text: 'Articles', link: '/articles/' },
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
    },

    zh: {
      label: '繁體中文',
      lang: 'zh-TW',
      title: 'lythoskill',
      description: 'AI agent 宣告式技能治理：牌組管理、策展、驗證、對帳。',
      themeConfig: {
        nav: [
          { text: '實戰指南', link: '/zh/guide/' },
          { text: '架構', link: '/zh/architecture' },
          { text: '生態', link: '/zh/ecosystem' },
          { text: '哲學', link: '/zh/philosophy' },
          { text: '文章 (EN)', link: '/articles/' },
          { text: 'GitHub', link: 'https://github.com/lythos-labs/lythoskill' },
        ],

        sidebar: {
          '/zh/guide/': [
            {
              text: '實戰指南',
              items: [
                { text: '總覽', link: '/zh/guide/' },
              ]
            }
          ]
        },

        socialLinks: [
          { icon: 'github', link: 'https://github.com/lythos-labs/lythoskill' },
        ],
      },
    },
  },
}

export default config
