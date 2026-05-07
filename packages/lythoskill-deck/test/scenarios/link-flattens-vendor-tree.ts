import type { Scenario } from '../runner.ts'

export default {
  name: 'link flattens deep vendor tree into flat symlinks',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
    },
    preExistingDirs: ['github.com/owner/repo/skills/skill-a'],
    deck: {
      max_cards: 10,
      tool: ['github.com/lythos-labs/lythoskill-test-stubs/skill-a'],
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
