import type { Scenario } from '../runner.ts'

export default {
  name: 'migrate-schema converts old deck and link no longer warns',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      tool: ['github.com/lythos-labs/lythoskill-test-stubs/skill-a'],
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
