/**
 * Cold-pool metadata layer — SQLite-backed.
 *
 * Per ADR-20260507143241493: git-native hash, local-only trust, SQLite storage.
 * Extends shared SqliteDb base for DRY SQLite wrappers + schema versioning.
 *
 * Three tables:
 *   repos        — per-repo HEAD ref tracking
 *   skills       — per-skill content hash (git blob hash of SKILL.md)
 *   deck_refs    — cross-deck reference index
 */

import { SqliteDb } from './db-helpers.js'

export interface RepoRef {
  host: string
  owner: string
  repo: string
  headRef: string
  lastPulledAt: string
}

export interface SkillHash {
  host: string
  owner: string
  repo: string
  skillSubpath: string
  contentGitHash: string
  headRefAtRecord: string
  lastSeenAt: string
}

export interface DeckReference {
  skillLocator: string
  deckPath: string
  declaredAlias: string | null
}

const CURRENT_SCHEMA = 2

export class MetadataDB extends SqliteDb {
  constructor(dbPath: string) {
    super(dbPath)
  }

  protected initSchema(): void {
    this.exec(`
      CREATE TABLE IF NOT EXISTS repos (
        host TEXT NOT NULL,
        owner TEXT NOT NULL,
        repo TEXT NOT NULL,
        head_ref TEXT,
        last_pulled_at TEXT,
        PRIMARY KEY (host, owner, repo)
      )
    `)

    this.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        host TEXT NOT NULL,
        owner TEXT NOT NULL,
        repo TEXT NOT NULL,
        skill_subpath TEXT NOT NULL DEFAULT '',
        content_sha256 TEXT,
        git_blob_hash TEXT,
        head_ref_at_record TEXT,
        last_seen_at TEXT,
        PRIMARY KEY (host, owner, repo, skill_subpath)
      )
    `)

    this.exec(`
      CREATE TABLE IF NOT EXISTS deck_refs (
        skill_locator TEXT NOT NULL,
        deck_path TEXT NOT NULL,
        declared_alias TEXT,
        PRIMARY KEY (skill_locator, deck_path)
      )
    `)

    this.exec(`CREATE INDEX IF NOT EXISTS idx_deck_refs_deck ON deck_refs(deck_path)`)
    this.exec(`CREATE INDEX IF NOT EXISTS idx_deck_refs_locator ON deck_refs(skill_locator)`)
    this.exec(`CREATE INDEX IF NOT EXISTS idx_skills_repo ON skills(host, owner, repo)`)

    // Schema migrations
    this.migrateSchema(CURRENT_SCHEMA, [
      { version: 1, sql: `CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)` },
      {
        version: 2,
        sql: `ALTER TABLE skills ADD COLUMN git_blob_hash TEXT`,
      },
    ])
  }

  private now(): string {
    return new Date().toISOString()
  }

  // ── Repo ─────────────────────────────────────────────────────

  recordRepoRef(host: string, owner: string, repo: string, headRef: string): void {
    this.exec(
      `INSERT OR REPLACE INTO repos (host, owner, repo, head_ref, last_pulled_at)
       VALUES ($host, $owner, $repo, $headRef, $now)`,
      { $host: host, $owner: owner, $repo: repo, $headRef: headRef, $now: this.now() },
    )
  }

  getRepoRef(host: string, owner: string, repo: string): string | null {
    const row = this.queryOne<{ head_ref: string }>(
      `SELECT head_ref FROM repos WHERE host = $host AND owner = $owner AND repo = $repo`,
      { $host: host, $owner: owner, $repo: repo },
    )
    return row?.head_ref ?? null
  }

  // ── Skill ────────────────────────────────────────────────────

  recordSkillHash(
    host: string,
    owner: string,
    repo: string,
    skillSubpath: string,
    contentSha256: string,
    gitBlobHash: string | null,
    headRefAtRecord: string,
  ): void {
    this.exec(
      `INSERT OR REPLACE INTO skills
         (host, owner, repo, skill_subpath, content_sha256, git_blob_hash, head_ref_at_record, last_seen_at)
       VALUES ($host, $owner, $repo, $subpath, $sha256, $blob, $headRef, $now)`,
      {
        $host: host,
        $owner: owner,
        $repo: repo,
        $subpath: skillSubpath,
        $sha256: contentSha256,
        $blob: gitBlobHash,
        $headRef: headRefAtRecord,
        $now: this.now(),
      },
    )
  }

  getSkillHash(host: string, owner: string, repo: string, skillSubpath: string): string | null {
    const row = this.queryOne<{ content_sha256: string }>(
      `SELECT content_sha256 FROM skills
       WHERE host = $host AND owner = $owner AND repo = $repo AND skill_subpath = $subpath`,
      { $host: host, $owner: owner, $repo: repo, $subpath: skillSubpath },
    )
    return row?.content_sha256 ?? null
  }

  // ── Deck References ──────────────────────────────────────────

  addReference(skillLocator: string, deckPath: string, declaredAlias: string | null): void {
    this.exec(
      `INSERT OR REPLACE INTO deck_refs (skill_locator, deck_path, declared_alias)
       VALUES ($locator, $deck, $alias)`,
      { $locator: skillLocator, $deck: deckPath, $alias: declaredAlias },
    )
  }

  removeReference(skillLocator: string, deckPath: string): void {
    this.exec(
      `DELETE FROM deck_refs WHERE skill_locator = $locator AND deck_path = $deck`,
      { $locator: skillLocator, $deck: deckPath },
    )
  }

  removeAllReferencesForDeck(deckPath: string): void {
    this.exec(`DELETE FROM deck_refs WHERE deck_path = $deck`, { $deck: deckPath })
  }

  getReferencingDecks(skillLocator: string): Array<{ deckPath: string; alias: string | null }> {
    const rows = this.queryAll<{ deck_path: string; declared_alias: string | null }>(
      `SELECT deck_path, declared_alias FROM deck_refs WHERE skill_locator = $locator`,
      { $locator: skillLocator },
    )
    return rows.map((r) => ({ deckPath: r.deck_path, alias: r.declared_alias }))
  }

  // ── Reconcile ────────────────────────────────────────────────

  reconcileDeckReferences(
    deckPath: string,
    declaredSkills: Array<{ locator: string; alias: string | null }>,
  ): void {
    this.db.transaction(() => {
      this.exec(`DELETE FROM deck_refs WHERE deck_path = $deck`, { $deck: deckPath })

      const insert = this.db.query(`
        INSERT INTO deck_refs (skill_locator, deck_path, declared_alias)
        VALUES ($locator, $deck, $alias)
      `)
      for (const skill of declaredSkills) {
        insert.run({ $locator: skill.locator, $deck: deckPath, $alias: skill.alias })
      }
      insert.finalize()
    })()
  }
}
