import type { Scenario } from '../runner.ts'

export default {
  name: 'fq path creates correct symlink to cold pool',
  given: {
    coldPool: {
      'github.com/owner/repo/skills/skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'skill-a': { path: 'github.com/owner/repo/skill-a' },
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['skill-a'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
