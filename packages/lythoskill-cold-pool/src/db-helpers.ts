/**
 * Shared SQLite helpers — lazy-open, schema versioning, DRY wrappers.
 *
 * Used by MetadataDB (cold-pool) and curator's catalog DB.
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
        try {
          this.db.query(m.sql).run()
        } catch {
          // Migration may fail if column already exists — fine for idempotent ADD COLUMN.
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
}
