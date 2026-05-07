import type { Scenario } from '../runner.ts'

export default {
  name: 'link replaces broken self-referencing symlinks',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skills/lythoskill-deck-stub': {
        frontmatter: { name: 'lythoskill-deck', type: 'standard', description: 'Deck stub' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    deck: {
      max_cards: 10,
      innate: { 'lythoskill-deck': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skills/lythoskill-deck-stub' } },
      tool: ['github.com/lythos-labs/lythoskill-test-stubs/skill-a'],
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
