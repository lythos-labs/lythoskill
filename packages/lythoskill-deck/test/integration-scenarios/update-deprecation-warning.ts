import type { Scenario } from '../runner.ts'

export default {
  name: 'update prints deprecation warning to stderr',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'skill-a': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a' },
      },
    },
  },
  when: ['lythoskill-deck update'],
  then: {
    exitCode: 0,
    stderrContains: ['deprecated', 'refresh'],
  },
} satisfies Scenario
