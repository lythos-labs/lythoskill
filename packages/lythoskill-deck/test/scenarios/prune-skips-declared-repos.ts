import type { Scenario } from '../runner.ts'

export default {
  name: 'prune skips declared repos and deletes unreferenced ones',
  given: {
    coldPool: {
      'github.com/owner/repo-a/skills/skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
      'github.com/owner/repo-b/skills/skill-b': {
        frontmatter: { name: 'skill-b', type: 'standard', description: 'Skill B' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'skill-a': { path: 'github.com/owner/repo-a/skill-a' },
      },
    },
  },
  when: ['lythoskill-deck prune --yes'],
  then: {
    exitCode: 0,
    stdoutContains: ['1 repo(s)', 'github.com/owner/repo-b', 'deleted'],
    stdoutExcludes: ['github.com/owner/repo-a'],
  },
} satisfies Scenario
