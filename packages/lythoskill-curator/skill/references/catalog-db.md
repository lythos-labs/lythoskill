# catalog.db Reference (SQLite)
## Tables
### skills (main table)
| Column | Type | Notes |
|--------|------|-------|
| `name` | TEXT PRIMARY KEY | Skill directory name |
| `description` | TEXT | Frontmatter description |
| `type` | TEXT | `standard` or `flow` |
| `version` | TEXT | Frontmatter version |
| `path` | TEXT | Absolute path |
| `managed_dirs` | TEXT | JSON array string |
| `niches` | TEXT | JSON array string |
| `trigger_phrases` | TEXT | JSON array string |
| `has_scripts` | INTEGER | 0 or 1 |
| `has_examples` | INTEGER | 0 or 1 |
| `body_preview` | TEXT | First 500 chars of body |

### catalog_meta (key-value metadata)
| Key | Value |
|-----|-------|
| `generated_at` | ISO 8601 timestamp |
| `last_scan_at` | Unix timestamp |
| `total_skills` | Integer |
| `pool_path` | Absolute path |

### Indexes
- `idx_skills_type` on `skills(type)`
## Useful Queries
```sql
-- Group by type
SELECT type, COUNT(*) FROM skills GROUP BY type;
-- Keyword search across description and body
SELECT name FROM skills
WHERE description LIKE '%diagram%' OR body_preview LIKE '%diagram%';
-- Access JSON array elements
SELECT name, json_extract(niches, '$[0]') AS primary_niche FROM skills;
-- Find skills that manage the same directory
SELECT managed_dirs, GROUP_CONCAT(name) AS skills
FROM skills WHERE managed_dirs != '[]'
GROUP BY managed_dirs HAVING COUNT(*) > 1;

-- Freshness check
SELECT value FROM catalog_meta WHERE key = 'generated_at';
```

## When to Use catalog.db vs REGISTRY.json
| Need | Use |
|------|-----|
| Condition filtering, aggregation, JOIN | catalog.db (SQL) |
| Full scan, LLM prompt injection, iteration | REGISTRY.json |
| Programmatic access from scripts | catalog.db |
| Quick human inspection | REGISTRY.json |
