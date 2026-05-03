import type { Scenario } from '../runner.ts'

export default {
  name: 'refresh single skill only processes that target',
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
      tool: {
        'skill-a': { path: 'skill-a' },
        'skill-b': { path: 'skill-b' },
      },
    },
  },
  when: ['git init cold-pool/skill-a', 'lythoskill-deck refresh skill-a'],
  then: {
    exitCode: 1,
    stdoutContains: ['single skill', 'skill-a'],
    stdoutExcludes: ['skill-b'],
  },
} satisfies Scenario
