import type { Scenario } from '../runner.ts'

export default {
  name: 'workdir override anchors working_set to specified directory',
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
    'mkdir sub',
    'mv skill-deck.toml sub/',
    'lythoskill-deck link --deck sub/skill-deck.toml --workdir .',
  ],
  then: {
    workingSetHas: ['lythoskill-deck', 'skill-a'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
