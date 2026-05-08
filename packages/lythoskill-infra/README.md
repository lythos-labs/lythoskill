# @lythos/infra

Runtime infrastructure base package for lythoskill. Zero runtime dependencies (except `bun:sqlite`).

## What's Inside

| Export | Purpose |
|--------|---------|
| `SqliteDb` | Abstract base class: lazy-open SQLite, schema versioning, `exec`/`queryOne`/`queryAll` |
| `fetchConfigFromUrl` | Fetch config files (deck.toml, arena.toml, player.toml) from URL with caching |
| `resolveConfigPath` | Unified entry: local path → return; URL → fetch → return cache path |

## SqliteDb

```typescript
import { SqliteDb } from '@lythos/infra'

class MyDb extends SqliteDb {
  protected initSchema(): void {
    this.exec(`CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, name TEXT)`)
  }

  addItem(id: string, name: string): void {
    this.exec(`INSERT INTO items (id, name) VALUES ($id, $name)`, { $id: id, $name: name })
  }

  getItem(id: string): { name: string } | null {
    return this.queryOne<{ name: string }>(`SELECT name FROM items WHERE id = $id`, { $id: id })
  }
}
```

## Config Fetch

```typescript
import { fetchConfigFromUrl, resolveConfigPath } from '@lythos/infra'

// Fetch deck.toml from URL
const localPath = await fetchConfigFromUrl('https://example.com/deck.toml')

// Unified resolve
const path = await resolveConfigPath('https://example.com/deck.toml')
```

## Design

- **Lazy-open**: DB file is created on first access, not constructor
- **Schema versioning**: `migrateSchema()` auto-runs migrations in order
- **Cache TTL**: 24h default for fetched configs
- **GitHub raw conversion**: `github.com/.../blob/...` → `raw.githubusercontent.com` automatic
