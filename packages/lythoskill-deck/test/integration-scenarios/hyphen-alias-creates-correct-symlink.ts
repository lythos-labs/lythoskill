import type { Scenario } from '../runner.ts'

export default {
  name: 'hyphen alias creates correct symlink',
  given: {
    coldPool: {
      'github.com/lythos-labs/lythoskill-test-stubs/web-search': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/web-search', type: 'standard', description: 'Web search skill' },
      },
      'github.com/lythos-labs/lythoskill-test-stubs/design-doc-mermaid': {
        frontmatter: { name: 'github.com/lythos-labs/lythoskill-test-stubs/design-doc-mermaid', type: 'standard', description: 'Diagram skill' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'web-search': { path: 'github.com/lythos-labs/lythoskill-test-stubs/web-search' },
        'design-doc-mermaid': { path: 'github.com/lythos-labs/lythoskill-test-stubs/design-doc-mermaid' },
      },
    },
  },
  when: ['lythoskill-deck link'],
  then: {
    workingSetHas: ['web-search', 'design-doc-mermaid'],
    allSymlinks: true,
    lockValid: true,
    exitCode: 0,
  },
} satisfies Scenario
