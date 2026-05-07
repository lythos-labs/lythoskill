import type { Scenario } from '../runner.ts'

export default {
  name: 'remove deletes deck entry and symlink but not cold pool',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/skill-a': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a', type: 'standard', description: 'Skill A' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/skill-b': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b', type: 'standard', description: 'Skill B' },
      },
    },
    workingSet: {
      'skill-a': 'github.com/lythos-labs/lythoskill-test-stubs/skill-a',
      'skill-b': 'github.com/lythos-labs/lythoskill-test-stubs/skill-b',
    },
    deck: {
      max_cards: 10,
      tool: {
        'skill-a': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-a' },
        'skill-b': { path: 'github.com/lythos-labs/lythoskill-test-stubs/skill-b' },
      },
    },
  },
  when: ['lythoskill-deck remove skill-a', 'cat skill-deck.toml'],
  then: {
    exitCode: 0,
    workingSetHas: ['skill-b'],
    workingSetMissing: ['skill-a'],
    stdoutContains: ['removed "skill-a"', '[tool.skills.skill-b]'],
    stdoutExcludes: ['[tool.skills.skill-a]'],
    allSymlinks: true,
  },
} satisfies Scenario
