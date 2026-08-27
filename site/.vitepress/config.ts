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
import versionMeta from './version.json' with { type: 'json' }

const { version, commit, date } = versionMeta
const commitUrl = `https://github.com/lythos-labs/lythoskill/commit/${commit}`

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
                { text: 'Level 0: Quick Start', link: '/guide/#level-0-quick-start' },
                { text: 'Level 1: Understand Your Deck', link: '/guide/#level-1-understand-your-deck' },
                { text: 'Level 2: Discover More Skills', link: '/guide/#level-2-discover-more-skills' },
                { text: 'Level 3: Test Before You Trust', link: '/guide/#level-3-test-before-you-trust' },
                { text: 'Level 4: Compose Pipelines', link: '/guide/#level-4-compose-pipelines' },
                { text: 'Level 5: Govern at Scale', link: '/guide/#level-5-govern-at-scale' },
                { text: 'Level 6: Contribute Back', link: '/guide/#level-6-contribute-back' },
              ]
            }
          ],
          '/articles/': [
            {
              text: 'Articles',
              items: [
                { text: 'Overview', link: '/articles/' },
                { text: 'Agent-Boosted UX (canonical)', link: '/articles/agent-boosted-ux' },
                { text: 'The Goldilocks Consumer', link: '/articles/goldilocks-consumer' },
                { text: 'ZK Review and Concept Migration', link: '/articles/zk-concept-symmetry' },
                { text: 'OS Vocabulary as Engineering Language', link: '/articles/os-vocabulary' },
                { text: 'Conclusion-First ADRs', link: '/articles/conclusion-first' },
              ]
            }
          ]
        },

        socialLinks: [
          { icon: 'github', link: 'https://github.com/lythos-labs/lythoskill' },
        ],

        footer: {
          message: `<strong>lythoskill <a href="https://github.com/lythos-labs/lythoskill/releases/tag/v${version}" target="_blank" rel="noreferrer">v${version}</a></strong> · <a href="${commitUrl}" target="_blank" rel="noreferrer">${commit}</a> · Last updated: ${date}`,
        },
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
                { text: '第 0 級：快速開始', link: '/zh/guide/#第-0-級-快速開始' },
                { text: '第 1 級：理解你的牌組', link: '/zh/guide/#第-1-級-理解你的牌組' },
                { text: '第 2 級：探索更多技能', link: '/zh/guide/#第-2-級-探索更多技能' },
                { text: '第 3 級：先測試再信任', link: '/zh/guide/#第-3-級-先測試再信任' },
                { text: '第 4 級：組合管線', link: '/zh/guide/#第-4-級-組合管線' },
                { text: '第 5 級：規模化治理', link: '/zh/guide/#第-5-級-規模化治理' },
                { text: '第 6 級：回饋貢獻', link: '/zh/guide/#第-6-級-回饋貢獻' },
              ]
            }
          ]
        },

        socialLinks: [
          { icon: 'github', link: 'https://github.com/lythos-labs/lythoskill' },
        ],

        footer: {
          message: `<strong>lythoskill <a href="https://github.com/lythos-labs/lythoskill/releases/tag/v${version}" target="_blank" rel="noreferrer">v${version}</a></strong> · <a href="${commitUrl}" target="_blank" rel="noreferrer">${commit}</a> · 最後更新：${date}`,
        },
      },
    },
  },
}

export default config
