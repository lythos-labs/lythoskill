import type { Scenario } from '../runner.ts'

export default {
  name: 'migrate-schema dry-run does not modify file',
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
  when: ['lythoskill-deck migrate-schema --dry-run', 'lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a'],
    lockValid: true,
    exitCode: 0,
    stderrContains: ['deprecation'],
    stdoutContains: ['dry run'],
  },
} satisfies Scenario
