/**
 * SqliteDb base class — lazy-open, schema versioning, DRY wrappers.
 *
 * Consumers subclass and call super(dbPath) + define initSchema().
 */
import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export abstract class SqliteDb {
  protected abstract initSchema(): void

  private dbPath: string
  private _db: Database | null = null

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  /** Lazy-open: first DB access triggers creation. */
  protected get db(): Database {
    if (this._db == null) {
      try {
        mkdirSync(dirname(this.dbPath), { recursive: true })
      } catch {
        // Parent dir may be read-only (e.g. test paths).
      }
      this._db = new Database(this.dbPath, { create: true })
      this.initSchema()
    }
    return this._db
  }

  protected exec(sql: string, params?: Record<string, unknown>): void {
    const stmt = this.db.query(sql)
    stmt.run(params ?? {})
    stmt.finalize()
  }

  protected queryOne<T>(sql: string, params?: Record<string, unknown>): T | null {
    return this.db.query(sql).get(params ?? {}) as T | null
  }

  protected queryAll<T>(sql: string, params?: Record<string, unknown>): T[] {
    return this.db.query(sql).all(params ?? {}) as T[]
  }

  /** Schema version tracking: call from initSchema() to auto-migrate. */
  protected migrateSchema(currentVersion: number, migrations: Array<{ version: number; sql: string }>): void {
    this.exec(`CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)`)
    let row = this.queryOne<{ version: number }>(`SELECT version FROM _schema_version`)
    let dbVersion = row?.version ?? 0

    for (const m of migrations.sort((a, b) => a.version - b.version)) {
      if (m.version > dbVersion) {
        // Bun's db.query() only executes one statement; split on ; so multi-statement migrations work.
        for (const stmt of m.sql.split(';').map(s => s.trim()).filter(Boolean)) {
          try {
            const s = this.db.query(stmt)
            s.run()
            s.finalize()
          } catch { /* column/index may already exist — prepare or run may fail */ }
        }
        dbVersion = m.version
      }
    }

    if (dbVersion !== (row?.version ?? 0)) {
      this.exec(`DELETE FROM _schema_version`)
      this.exec(`INSERT INTO _schema_version (version) VALUES ($v)`, { $v: dbVersion })
    }
  }

  close(): void {
    this._db?.close()
    this._db = null
  }

  /**
   * Symbol.dispose — enables `using` declaration (TC39 Stage 3, Bun-supported).
   *
   * Example:
   *   using db = new CatalogDb(path);
   *   db.query(...)
   *   // db.close() called automatically at end of block
   *
   * For test scopes or callback-style, see `useDb()` helper in consumer packages.
   */
  [Symbol.dispose](): void {
    this.close()
  }
}
