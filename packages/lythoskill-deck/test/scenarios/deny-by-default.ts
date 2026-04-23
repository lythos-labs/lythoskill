import type { Scenario } from '../runner.ts'

export default {
  name: 'deny-by-default removes undeclared skills',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
      'skill-b': {
        frontmatter: { name: 'skill-b', type: 'standard', description: 'Skill B' },
      },
      'skill-c': {
        frontmatter: { name: 'skill-c', type: 'standard', description: 'Skill C' },
      },
    },
    workingSet: ['skill-a', 'skill-b', 'skill-c'], // 预先全部放置
    deck: {
      max_cards: 10,
      innate: ['lythoskill-deck'],
      tool: ['skill-a'], // 只声明 skill-a
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['lythoskill-deck', 'skill-a'],
    workingSetMissing: ['skill-b', 'skill-c'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
