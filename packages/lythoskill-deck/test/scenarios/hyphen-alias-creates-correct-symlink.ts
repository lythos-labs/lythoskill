import type { Scenario } from '../runner.ts'

export default {
  name: 'hyphen alias creates correct symlink',
  given: {
    coldPool: {
      'web-search': {
        frontmatter: { name: 'web-search', type: 'standard', description: 'Web search skill' },
      },
      'design-doc-mermaid': {
        frontmatter: { name: 'design-doc-mermaid', type: 'standard', description: 'Diagram skill' },
      },
    },
    deck: {
      max_cards: 10,
      tool: {
        'web-search': { path: 'web-search' },
        'design-doc-mermaid': { path: 'design-doc-mermaid' },
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
