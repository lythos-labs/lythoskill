import type { Scenario } from '../runner.ts'

export default {
  name: 'refresh single skill only processes that target',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-b': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b', type: 'standard', description: 'Skill B' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'skill-a': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a' },
        'skill-b': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b' },
      },
    },
  },
  when: ['git init cold-pool/github.com/lythos-labs/lythoskill-test-stubs/skill-a', 'lythoskill-deck refresh skill-a'],
  then: {
    exitCode: 1,
    stdoutContains: ['single skill', 'skill-a'],
    stdoutExcludes: ['skill-b'],
  },
} satisfies Scenario
