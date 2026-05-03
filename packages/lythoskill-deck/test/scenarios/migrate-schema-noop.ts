import type { Scenario } from '../runner.ts'

export default {
  name: 'migrate-schema no-op on already-converted deck',
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
  when: ['lythoskill-deck migrate-schema', 'lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a'],
    lockValid: true,
    exitCode: 0,
    stdoutContains: ['no migration needed'],
  },
} satisfies Scenario
