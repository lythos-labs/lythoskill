import type { Scenario } from '../runner.ts'

export default {
  name: 'remove deletes deck entry and symlink but not cold pool',
  given: {
    coldPool: {
      'skill-a': {
        frontmatter: { name: 'skill-a', type: 'standard', description: 'Skill A' },
      },
      'skill-b': {
        frontmatter: { name: 'skill-b', type: 'standard', description: 'Skill B' },
      },
    },
    workingSet: ['skill-a', 'skill-b'],
    deck: {
      max_cards: 10,
      tool: {
        'skill-a': { path: 'skill-a' },
        'skill-b': { path: 'skill-b' },
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
