import type { Scenario } from '../runner.ts'

export default {
  name: 'mixed old+new deck links with deprecation on old section',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
      'skill-b': {
        frontmatter: { name: 'skill-b', type: 'standard', description: 'Skill B' },
      },
    },
    deck: {
      max_cards: 10,
      innate: ['skill-a'],
      tool: {
        'skill-b': { path: 'skill-b' },
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
