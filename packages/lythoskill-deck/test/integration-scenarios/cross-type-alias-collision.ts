import type { Scenario } from '../runner.ts'

export default {
  name: 'cross-type alias collision is rejected',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      innate: {
        'skill-a': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a' },
      },
      tool: {
        'skill-a': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a' },
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    exitCode: 1,
    stderrContains: ['collision'],
  },
} satisfies Scenario
