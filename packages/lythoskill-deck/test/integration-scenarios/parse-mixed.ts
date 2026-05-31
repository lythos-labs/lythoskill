import type { Scenario } from '../runner.ts'

export default {
  name: 'mixed old+new deck links with deprecation on old section',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-b': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b', type: 'standard', description: 'Skill B' },
      },
    },
    deck: {
      max_cards: 10,
      innate: ['github.com/lythos-labs/lythoskill-test-stubs/skill-a'],
      tool: {
        'skill-b': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b' },
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a', 'skill-b'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
    stderrContains: ['deprecation'],
  },
} satisfies Scenario
