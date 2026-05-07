import type { Scenario } from '../runner.ts'

export default {
  name: 'different aliases resolve same-basename collision',
  given: {
    coldPool: {
      'github.com/owner/repo-a/skills/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
      'github.com/owner/repo-b/skills/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A dup' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'skill-a-from-a': { path: 'github.com/owner/repo-a/skills/skill-a' },
        'skill-a-from-b': { path: 'github.com/owner/repo-b/skills/skill-a' },
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a-from-a', 'skill-a-from-b'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
