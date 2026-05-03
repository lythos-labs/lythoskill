import type { Scenario } from '../runner.ts'

export default {
  name: 'new alias-dict deck links correctly',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'skill-a': { path: 'skill-a' },
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
