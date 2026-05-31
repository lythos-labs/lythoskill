import type { Scenario } from '../runner.ts'

export default {
  name: 'budget rejection when exceeding max_cards',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': { frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' } },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-b': { frontmatter: { name: 'skill-b', type: 'standard', description: 'Skill B' } },
      'github.com/lythos-labs/lythoskill-test-stubs/skills/web-search': { frontmatter: { name: 'web-search', type: 'standard', description: 'Web Search' } },
    },
    deck: {
      max_cards: 2,
      innate: { 'lythoskill-deck': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skills/lythoskill-deck-stub' } },
      tool: ['github.com/lythos-labs/lythoskill-test-stubs/skill-a', 'github.com/lythos-labs/lythoskill-test-stubs/skill-b', 'github.com/lythos-labs/lythoskill-test-stubs/skills/web-search'], // 3 skills > max 2
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetMissing: ['skill-1', 'skill-2', 'skill-3'],
    exitCode: 1,
  },
} satisfies Scenario
