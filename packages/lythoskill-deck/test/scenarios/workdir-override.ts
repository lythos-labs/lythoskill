import type { Scenario } from '../runner.ts'

export default {
  name: 'workdir override anchors working_set to specified directory',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      innate: ['lythoskill-deck'],
      tool: ['skill-a'],
    },
  },
  when: [
    'mkdir sub',
    'mv skill-deck.toml sub/',
    'lythoskill-deck link --deck sub/skill-deck.toml --workdir .',
  ],
  then: {
    workingSetHas: ['lythoskill-deck', 'skill-a'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
