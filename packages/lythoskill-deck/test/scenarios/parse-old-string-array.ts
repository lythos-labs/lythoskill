import type { Scenario } from '../runner.ts'

export default {
  name: 'old string-array deck still links with deprecation warning',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      tool: ['skill-a'],
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
    stderrContains: ['deprecation'],
  },
} satisfies Scenario
