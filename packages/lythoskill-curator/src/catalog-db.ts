/**
 * Curator catalog database — extends SqliteDb from @lythos/infra.
 *
 * Replaces direct bun:sqlite usage with the shared base class,
 * gaining lazy-open, schema versioning, and DRY query helpers.
 */

import { SqliteDb } from '@lythos/infra'

export class CatalogDb extends SqliteDb {
  protected initSchema(): void {
    // catalog_meta — key/value store for scan metadata
    this.exec(`
      CREATE TABLE IF NOT EXISTS catalog_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)

    // skills — indexed skill metadata with FSM tracking
    this.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        path TEXT PRIMARY KEY,
        description TEXT,
        type TEXT,
        version TEXT,
        name TEXT NOT NULL,
        niches TEXT,
        managed_dirs TEXT,
        trigger_phrases TEXT,
        has_scripts INTEGER,
        has_examples INTEGER,
        body_preview TEXT,
        source TEXT,
        when_to_use TEXT,
        allowed_tools TEXT,
        author TEXT,
        user_invocable INTEGER,
        tags TEXT,
        deck_dependencies TEXT,
        deck_skill_type TEXT,
        content_hash TEXT,
        status TEXT NOT NULL DEFAULT 'parsed',
        indexed_at TEXT,
        last_parsed_at TEXT,
        parse_error TEXT
      )
    `)

    // Schema migrations
    this.migrateSchema(2, [
      {
        version: 1,
        sql: `
          CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL);
          ALTER TABLE skills ADD COLUMN deck_skill_type TEXT;
          CREATE INDEX IF NOT EXISTS idx_skills_deck_skill_type ON skills(deck_skill_type);
          CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
          CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
        `,
      },
      {
        version: 2,
        sql: `
          ALTER TABLE skills ADD COLUMN content_hash TEXT;
          ALTER TABLE skills ADD COLUMN status TEXT NOT NULL DEFAULT 'parsed';
          ALTER TABLE skills ADD COLUMN indexed_at TEXT;
          ALTER TABLE skills ADD COLUMN last_parsed_at TEXT;
          ALTER TABLE skills ADD COLUMN parse_error TEXT;
        `,
      },
    ])
  }

  /** Run a statement (DDL or DML). */
  run(sql: string, params?: Record<string, unknown>): void {
    this.exec(sql, params)
  }

  /** Query all rows. */
  all<T>(sql: string, params?: Record<string, unknown>): T[] {
    return this.queryAll<T>(sql, params)
  }

  /** Query a single row. */
  get<T>(sql: string, params?: Record<string, unknown>): T | null {
    return this.queryOne<T>(sql, params)
  }

  /** Insert or replace a skill record. */
  insertSkill(params: Record<string, unknown>): void {
    this.exec(
      `INSERT OR REPLACE INTO skills
        (name, description, type, version, path, niches, managed_dirs, trigger_phrases,
         has_scripts, has_examples, body_preview, source, when_to_use, allowed_tools,
         author, user_invocable, tags, deck_dependencies, deck_skill_type,
         content_hash, status, indexed_at, last_parsed_at, parse_error)
       VALUES
        ($name, $description, $type, $version, $path, $niches, $managed_dirs, $trigger_phrases,
         $has_scripts, $has_examples, $body_preview, $source, $when_to_use, $allowed_tools,
         $author, $user_invocable, $tags, $deck_dependencies, $deck_skill_type,
         $content_hash, $status, $indexed_at, $last_parsed_at, $parse_error)`,
      params,
    )
  }

  /** Get existing content_hash for a skill path. Returns null if not indexed. */
  getContentHash(path: string): string | null {
    return this.get<{ content_hash: string }>(
      `SELECT content_hash FROM skills WHERE path = $path`,
      { $path: path },
    )?.content_hash ?? null
  }

  /** Write catalog metadata. */
  setMeta(key: string, value: string): void {
    this.exec(
      `INSERT OR REPLACE INTO catalog_meta (key, value) VALUES ($key, $value)`,
      { $key: key, $value: value },
    )
  }

  /** Read catalog metadata. */
  getMeta(key: string): string | null {
    const row = this.get<{ value: string }>(
      `SELECT value FROM catalog_meta WHERE key = $key`,
      { $key: key },
    )
    return row?.value ?? null
  }

  /**
   * Compatibility query — returns a Statement-like interface for
   * `.all()`, `.get()`, `.run()` chaining. Simplifies migration from
   * direct bun:sqlite usage.
   */
  query(sql: string): { all: (params?: any) => any[]; get: (params?: any) => any | null; run: (params?: any) => void } {
    const stmt = this.db.query(sql)
    return {
      all: (params?: any) => stmt.all(params ?? {}) as any[],
      get: (params?: any) => stmt.get(params ?? {}) as any | null,
      run: (params?: any) => { stmt.run(params ?? {}) },
    }
  }

  /** Transaction wrapper for batch inserts. */
  transaction(fn: () => void): void {
    this.db.transaction(fn)()
  }
}
