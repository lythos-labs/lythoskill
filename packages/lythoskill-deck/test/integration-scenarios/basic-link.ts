import type { Scenario } from '../runner.ts'

export default {
  name: 'basic link creates symlinks and lock',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skills/lythoskill-deck-stub': {
        frontmatter: { name: 'lythoskill-deck', type: 'standard', description: 'Deck stub' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-b': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b', type: 'standard', description: 'Skill B' },
      },
    },
    deck: {
      max_cards: 10,
      innate: { 'lythoskill-deck': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skills/lythoskill-deck-stub' } },
      tool: ['github.com/lythos-labs/lythoskill-test-stubs/skill-a', 'github.com/lythos-labs/lythoskill-test-stubs/skill-b'],
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['lythoskill-deck', 'skill-a', 'skill-b'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
