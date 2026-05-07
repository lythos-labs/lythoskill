import type { Scenario } from '../runner.ts'

export default {
  name: 'same-type alias collision is rejected',
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
        skills: ['github.com/owner/repo-a/skills/skill-a', 'github.com/owner/repo-b/skills/skill-a'],
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    exitCode: 1,
    stderrContains: ['collision'],
  },
} satisfies Scenario
