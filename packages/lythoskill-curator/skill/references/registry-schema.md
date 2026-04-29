# REGISTRY.json Schema
## Top-Level Structure
```json
{
  "generatedAt": "ISO 8601 timestamp",
  "poolPath": "/absolute/path/to/cold-pool",
  "totalSkills": 42,
  "skills": [ ... ],
  "index": { ... }
}
```

## Skill Entry
Each element in `skills[]`:
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Skill directory name (unique within pool) |
| `description` | string | From frontmatter `description` |
| `type` | string | `standard` or `flow` |
| `version` | string | From frontmatter `version` |
| `path` | string | Absolute path to skill directory |
| `managedDirs` | string[] | From `deck_managed_dirs` |
| `niches` | string[] | From `deck_niche` (split on `,`) |
| `triggerPhrases` | string[] | From `when_to_use` (split on `,`/newline) |
| `hasScripts` | boolean | `scripts/` directory exists |
| `hasExamples` | boolean | `examples/` directory exists |
| `bodyPreview` | string | First 500 characters of SKILL.md body |

## Index (Pre-Computed Lookups)
```json
{
  "index": {
    "byType":       { "standard": ["skill-a", ...], "flow": ["skill-b", ...] },
    "byNiche":      { "meta.governance.deck": ["lythoskill-deck"], ... },
    "byManagedDir": { "cortex/": ["project-cortex", "project-scribe"], ... }
  }
}
```

These indexes enable O(1) lookups without scanning the full skills array.
Agent can use `byNiche` to detect potential conflicts and `byManagedDir`
to detect directory overlaps before adding skills to a deck.
