import type { Scenario } from '../runner.ts'

export default {
  name: 'cross-type alias collision is rejected',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      innate: {
        'skill-a': { path: 'skill-a' },
      },
      tool: {
        'skill-a': { path: 'skill-a' },
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    exitCode: 1,
    stderrContains: ['collision'],
  },
} satisfies Scenario
