/**
 * Cold-pool metadata layer — SQLite-backed.
 *
 * Per ADR-20260507143241493: git-native hash, local-only trust, SQLite storage.
 * Extends shared SqliteDb base for DRY SQLite wrappers + schema versioning.
 *
 * Three tables:
 *   repos        — per-repo HEAD ref tracking
 *   skills       — per-skill content hash (git blob hash of SKILL.md)
 *   deck_refs    — cross-deck reference index with FSM state tracking
 *
 * deck_refs FSM (v3+):
 *   state: 'added' | 'linked' | 'removed'
 *   added ──link()──→ linked ──remove()──→ removed ──add()──→ added
 *   added ──remove()──→ removed (never linked)
 *   removed ──reconcile()──→ linked (reconciled back into active state)
 *
 * Prune uses state to distinguish "truly unreferenced" (all refs = removed)
 * from "has active decks" (any ref = added/linked), preventing cross-deck
 * accidental deletion.
 */

import { SqliteDb } from '@lythos/infra'

export type DeckRefState = 'added' | 'linked' | 'removed'

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
  state: DeckRefState | null
  mode: string | null
  linkedAt: string | null
  removedAt: string | null
}

const CURRENT_SCHEMA = 6

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
        state TEXT NOT NULL DEFAULT 'linked',
        mode TEXT DEFAULT 'symlink',
        linked_at TEXT,
        removed_at TEXT,
        PRIMARY KEY (skill_locator, deck_path)
      )
    `)

    this.exec(`CREATE INDEX IF NOT EXISTS idx_deck_refs_deck ON deck_refs(deck_path)`)
    this.exec(`CREATE INDEX IF NOT EXISTS idx_deck_refs_locator ON deck_refs(skill_locator)`)
    this.exec(`CREATE INDEX IF NOT EXISTS idx_deck_refs_state ON deck_refs(state)`)
    this.exec(`CREATE INDEX IF NOT EXISTS idx_skills_repo ON skills(host, owner, repo)`)

    // Schema migrations
    this.migrateSchema(CURRENT_SCHEMA, [
      { version: 1, sql: `CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)` },
      {
        version: 2,
        sql: `ALTER TABLE skills ADD COLUMN git_blob_hash TEXT`,
      },
      {
        version: 3,
        sql: `ALTER TABLE deck_refs ADD COLUMN state TEXT NOT NULL DEFAULT 'linked'`,
      },
      {
        version: 4,
        sql: `ALTER TABLE deck_refs ADD COLUMN linked_at TEXT`,
      },
      {
        version: 5,
        sql: `ALTER TABLE deck_refs ADD COLUMN removed_at TEXT`,
      },
      {
        version: 6,
        sql: `ALTER TABLE deck_refs ADD COLUMN mode TEXT DEFAULT 'symlink'`,
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

  // ── Deck References — FSM ───────────────────────────────────

  /**
   * Add a reference. Sets state='added' (declared but may not be linked).
   * Can re-activate a previously-removed reference (state: removed → added).
   */
  addReference(skillLocator: string, deckPath: string, declaredAlias: string | null): void {
    this.exec(
      `INSERT OR REPLACE INTO deck_refs (skill_locator, deck_path, declared_alias, state, linked_at, removed_at)
       VALUES ($locator, $deck, $alias, 'added', NULL, NULL)`,
      { $locator: skillLocator, $deck: deckPath, $alias: declaredAlias },
    )
  }

  /**
   * Soft-remove: sets state='removed' instead of deleting the row.
   * The historical record is preserved for cross-deck reference counting.
   * Removes linked_at to indicate the skill is no longer active.
   */
  removeReference(skillLocator: string, deckPath: string): void {
    this.exec(
      `UPDATE deck_refs SET state = 'removed', removed_at = $now
       WHERE skill_locator = $locator AND deck_path = $deck`,
      { $locator: skillLocator, $deck: deckPath, $now: this.now() },
    )
  }

  /**
   * Soft-remove all refs for a deck (same as removeReference, bulk).
   */
  removeAllReferencesForDeck(deckPath: string): void {
    this.exec(
      `UPDATE deck_refs SET state = 'removed', removed_at = $now WHERE deck_path = $deck`,
      { $deck: deckPath, $now: this.now() },
    )
  }

  /**
   * Get active (non-removed) referencing decks for a skill locator.
   * Legacy rows with state=NULL are treated as active.
   * Returns only active references — for full history use getAllRefsForLocator.
   */
  getReferencingDecks(
    skillLocator: string,
  ): Array<{ deckPath: string; alias: string | null; state: string | null }> {
    const rows = this.queryAll<{ deck_path: string; declared_alias: string | null; state: string | null }>(
      `SELECT deck_path, declared_alias, state FROM deck_refs
       WHERE skill_locator = $locator AND (state IS NULL OR state != 'removed')`,
      { $locator: skillLocator },
    )
    return rows.map((r) => ({ deckPath: r.deck_path, alias: r.declared_alias, state: r.state }))
  }

  /**
   * Get ALL refs for a locator including removed (historical) ones.
   * Used by prune to determine if a repo has NO active refs across any deck.
   */
  getAllRefsForLocator(skillLocator: string): DeckReference[] {
    const rows = this.queryAll<{
      skill_locator: string
      deck_path: string
      declared_alias: string | null
      state: string | null
      mode: string | null
      linked_at: string | null
      removed_at: string | null
    }>(
      `SELECT skill_locator, deck_path, declared_alias, state, mode, linked_at, removed_at
       FROM deck_refs WHERE skill_locator = $locator`,
      { $locator: skillLocator },
    )
    return rows.map((r) => ({
      skillLocator: r.skill_locator,
      deckPath: r.deck_path,
      declaredAlias: r.declared_alias,
      state: r.state as DeckRefState | null,
      mode: r.mode,
      linkedAt: r.linked_at,
      removedAt: r.removed_at,
    }))
  }

  /**
   * Get all distinct skill locators that have at least one active ref
   * (state = NULL/added/linked, not 'removed'). Used by prune to determine
   * which repos must NOT be deleted.
   */
  getAllActiveLocators(): string[] {
    const rows = this.queryAll<{ skill_locator: string }>(
      `SELECT DISTINCT skill_locator FROM deck_refs
       WHERE state IS NULL OR state IN ('added', 'linked')`,
    )
    return rows.map((r) => r.skill_locator)
  }

  /**
   * Update the state of a single reference. Validates the transition:
   *   added ↔ linked, added/linked → removed, removed → added
   * Invalid transitions (e.g., linked → added, null → removed) are silently
   * accepted to avoid hard failures from caller ordering issues.
   */
  updateRefState(skillLocator: string, deckPath: string, newState: DeckRefState): void {
    const now = this.now()
    switch (newState) {
      case 'linked':
        this.exec(
          `UPDATE deck_refs SET state = 'linked', linked_at = $now
           WHERE skill_locator = $locator AND deck_path = $deck`,
          { $locator: skillLocator, $deck: deckPath, $now: now },
        )
        break
      case 'removed':
        this.removeReference(skillLocator, deckPath)
        break
      case 'added':
        this.exec(
          `UPDATE deck_refs SET state = 'added', removed_at = NULL
           WHERE skill_locator = $locator AND deck_path = $deck`,
          { $locator: skillLocator, $deck: deckPath },
        )
        break
    }
  }

  /**
   * Reconcile all deck references atomically.
   *
   * Compared to the old DELETE+INSERT approach, this uses state transitions:
   * - Skills still declared → state='linked' (active, just linked)
   * - Skills no longer declared → state='removed' (was active, now gone)
   *
   * The key semantic change: we NEVER hard-delete from deck_refs during normal
   * operations. This enables cross-deck reference counting via getAllActiveLocators().
   */
  reconcileDeckReferences(
    deckPath: string,
    declaredSkills: Array<{ locator: string; alias: string | null }>,
  ): void {
    const now = this.now()
    this.db.transaction(() => {
      // Get current refs for this deck (any state)
      const currentRefs = this.queryAll<{ skill_locator: string; state: string | null }>(
        `SELECT skill_locator, state FROM deck_refs WHERE deck_path = $deck`,
        { $deck: deckPath },
      )

      const declaredSet = new Map<string, string | null>()
      for (const s of declaredSkills) {
        declaredSet.set(s.locator, s.alias)
      }

      // Mark removed: skills in DB but no longer declared
      for (const ref of currentRefs) {
        if (!declaredSet.has(ref.skill_locator) && ref.state !== 'removed') {
          this.exec(
            `UPDATE deck_refs SET state = 'removed', removed_at = $now
             WHERE deck_path = $deck AND skill_locator = $locator`,
            { $deck: deckPath, $locator: ref.skill_locator, $now: now },
          )
        }
      }

      // Upsert current declared skills as 'linked'
      const insert = this.db.query(`
        INSERT OR REPLACE INTO deck_refs (skill_locator, deck_path, declared_alias, state, linked_at, removed_at)
        VALUES ($locator, $deck, $alias, 'linked', $now, NULL)
      `)
      for (const skill of declaredSkills) {
        insert.run({ $locator: skill.locator, $deck: deckPath, $alias: skill.alias, $now: now })
      }
      insert.finalize()
    })()
  }
}
