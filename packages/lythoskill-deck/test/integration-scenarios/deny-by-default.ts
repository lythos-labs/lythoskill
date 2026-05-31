import type { Scenario } from '../runner.ts'

export default {
  name: 'deny-by-default removes undeclared skills',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skills/lythoskill-deck-stub': {
        frontmatter: { name: 'lythoskill-deck', type: 'standard', description: 'Deck stub' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-b': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b', type: 'standard', description: 'Skill B' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skills/web-search': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skills/web-search', type: 'standard', description: 'Web Search' },
      },
    },
    workingSet: {
      'skill-a': 'github.com/lythos-labs/lythoskill-test-stubs/skill-a',
      'skill-b': 'github.com/lythos-labs/lythoskill-test-stubs/skill-b',
      'web-search': 'github.com/lythos-labs/lythoskill-test-stubs/skills/web-search',
    }, // 预先全部放置(alias → coldPool FQ key)
    deck: {
      max_cards: 10,
      innate: { 'lythoskill-deck': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skills/lythoskill-deck-stub' } },
      tool: ['github.com/lythos-labs/lythoskill-test-stubs/skill-a'], // 只声明 skill-a
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['lythoskill-deck', 'skill-a'],
    workingSetMissing: ['skill-b', 'web-search'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
