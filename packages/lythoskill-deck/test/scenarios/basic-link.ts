import type { Scenario } from '../runner.ts'

export default {
  name: 'basic link creates symlinks and lock',
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
      innate: ['lythoskill-deck'],
      tool: ['skill-a', 'skill-b'],
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['lythoskill-deck', 'skill-a', 'skill-b'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
