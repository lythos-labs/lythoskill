import type { Scenario } from '../runner.ts'

export default {
  name: 'migrate-schema converts old deck and link no longer warns',
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
  when: ['lythoskill-deck migrate-schema', 'lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a'],
    lockValid: true,
    exitCode: 0,
    stderrExcludes: ['deprecation'],
    stdoutContains: ['migrated'],
  },
} satisfies Scenario
