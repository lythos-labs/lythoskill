import type { Scenario } from '../runner.ts'

export default {
  name: 'budget rejection when exceeding max_cards',
  given: {
    coldPool: {
      'skill-1': { frontmatter: { name: 'skill-1', type: 'standard' } },
      'skill-2': { frontmatter: { name: 'skill-2', type: 'standard' } },
      'skill-3': { frontmatter: { name: 'skill-3', type: 'standard' } },
    },
    deck: {
      max_cards: 2,
      innate: ['lythoskill-deck'],
      tool: ['skill-1', 'skill-2', 'skill-3'], // 3 skills > max 2
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetMissing: ['skill-1', 'skill-2', 'skill-3'],
    exitCode: 1,
  },
} satisfies Scenario
