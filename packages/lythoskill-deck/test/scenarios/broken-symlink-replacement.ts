import type { Scenario } from '../runner.ts'

export default {
  name: 'link replaces broken self-referencing symlinks',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      innate: ['lythoskill-deck'],
      tool: ['skill-a'],
    },
  },
  when: [
    'mkdir -p .claude/skills',
    'ln -s skill-a .claude/skills/skill-a',
    'lythoskill-deck link',
  ],
  then: {
    workingSetHas: ['lythoskill-deck', 'skill-a'],
    workingSetMissing: [],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
