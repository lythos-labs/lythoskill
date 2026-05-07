import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MetadataDB } from './metadata-db.js'

function tempDbPath(): string {
  return join(tmpdir(), `cold-pool-meta-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
}

describe('MetadataDB', () => {
  let db: MetadataDB
  let dbPath: string

  beforeEach(() => {
    dbPath = tempDbPath()
    db = new MetadataDB(dbPath)
  })

  afterEach(() => {
    db.close()
    try { Bun.file(dbPath).delete() } catch {}
  })

  describe('repos', () => {
    it('records and retrieves a repo HEAD ref', () => {
      db.recordRepoRef('github.com', 'lythos-labs', 'lythoskill', '9645fdb')
      expect(db.getRepoRef('github.com', 'lythos-labs', 'lythoskill')).toBe('9645fdb')
    })

    it('returns null for unknown repo', () => {
      expect(db.getRepoRef('github.com', 'unknown', 'repo')).toBeNull()
    })

    it('overwrites on duplicate key', () => {
      db.recordRepoRef('github.com', 'lythos-labs', 'lythoskill', '9645fdb')
      db.recordRepoRef('github.com', 'lythos-labs', 'lythoskill', 'a1b2c3d')
      expect(db.getRepoRef('github.com', 'lythos-labs', 'lythoskill')).toBe('a1b2c3d')
    })

    it('handles localhost host', () => {
      db.recordRepoRef('localhost', 'me', 'my-skill', 'abc1234')
      expect(db.getRepoRef('localhost', 'me', 'my-skill')).toBe('abc1234')
    })
  })

  describe('skills', () => {
    it('records and retrieves a skill hash', () => {
      db.recordSkillHash('github.com', 'lythos-labs', 'lythoskill', 'skills/lythoskill-deck', 'e3b0c44', '9645fdb')
      expect(db.getSkillHash('github.com', 'lythos-labs', 'lythoskill', 'skills/lythoskill-deck')).toBe('e3b0c44')
    })

    it('handles standalone skill (empty subpath)', () => {
      db.recordSkillHash('github.com', 'garrytan', 'gstack', '', 'abc1234', 'deadbeef')
      expect(db.getSkillHash('github.com', 'garrytan', 'gstack', '')).toBe('abc1234')
    })

    it('returns null for unknown skill', () => {
      expect(db.getSkillHash('github.com', 'unknown', 'repo', 'skill')).toBeNull()
    })

    it('overwrites on duplicate key', () => {
      db.recordSkillHash('github.com', 'lythos-labs', 'lythoskill', 'skills/lythoskill-deck', 'oldhash', '9645fdb')
      db.recordSkillHash('github.com', 'lythos-labs', 'lythoskill', 'skills/lythoskill-deck', 'newhash', 'a1b2c3d')
      expect(db.getSkillHash('github.com', 'lythos-labs', 'lythoskill', 'skills/lythoskill-deck')).toBe('newhash')
    })
  })

  describe('deck_refs', () => {
    it('adds and retrieves a reference', () => {
      db.addReference('github.com/lythos-labs/lythoskill/skills/lythoskill-deck', '/project-a/skill-deck.toml', 'lythoskill-deck')
      const refs = db.getReferencingDecks('github.com/lythos-labs/lythoskill/skills/lythoskill-deck')
      expect(refs).toHaveLength(1)
      expect(refs[0].deckPath).toBe('/project-a/skill-deck.toml')
      expect(refs[0].alias).toBe('lythoskill-deck')
    })

    it('returns empty array for unreferenced skill', () => {
      expect(db.getReferencingDecks('github.com/unknown/repo/skill')).toEqual([])
    })

    it('supports multiple decks referencing same skill', () => {
      db.addReference('github.com/owner/repo/skill', '/project-a/skill-deck.toml', 'skill-a')
      db.addReference('github.com/owner/repo/skill', '/project-b/skill-deck.toml', 'skill-b')
      const refs = db.getReferencingDecks('github.com/owner/repo/skill')
      expect(refs).toHaveLength(2)
      const paths = refs.map((r) => r.deckPath).sort()
      expect(paths).toEqual(['/project-a/skill-deck.toml', '/project-b/skill-deck.toml'])
    })

    it('removes a specific reference', () => {
      db.addReference('github.com/owner/repo/skill', '/project-a/skill-deck.toml', 'skill-a')
      db.addReference('github.com/owner/repo/skill', '/project-b/skill-deck.toml', 'skill-b')
      db.removeReference('github.com/owner/repo/skill', '/project-a/skill-deck.toml')
      const refs = db.getReferencingDecks('github.com/owner/repo/skill')
      expect(refs).toHaveLength(1)
      expect(refs[0].deckPath).toBe('/project-b/skill-deck.toml')
    })

    it('removes all references for a deck', () => {
      db.addReference('github.com/owner/repo/skill-a', '/project-a/skill-deck.toml', 'skill-a')
      db.addReference('github.com/owner/repo/skill-b', '/project-a/skill-deck.toml', 'skill-b')
      db.removeAllReferencesForDeck('/project-a/skill-deck.toml')
      expect(db.getReferencingDecks('github.com/owner/repo/skill-a')).toEqual([])
      expect(db.getReferencingDecks('github.com/owner/repo/skill-b')).toEqual([])
    })

    it('allows null alias', () => {
      db.addReference('github.com/owner/repo/skill', '/project-a/skill-deck.toml', null)
      const refs = db.getReferencingDecks('github.com/owner/repo/skill')
      expect(refs[0].alias).toBeNull()
    })
  })

  describe('reconcileDeckReferences', () => {
    it('replaces all references for a deck atomically', () => {
      // Pre-existing refs
      db.addReference('github.com/old/repo/skill', '/project-a/skill-deck.toml', 'old-skill')
      db.addReference('github.com/owner/repo/skill-a', '/project-a/skill-deck.toml', 'skill-a')

      // Reconcile with new declared set
      db.reconcileDeckReferences('/project-a/skill-deck.toml', [
        { locator: 'github.com/owner/repo/skill-a', alias: 'skill-a' },
        { locator: 'github.com/owner/repo/skill-b', alias: 'skill-b' },
      ])

      // old-skill removed, skill-a kept, skill-b added
      expect(db.getReferencingDecks('github.com/old/repo/skill')).toEqual([])
      expect(db.getReferencingDecks('github.com/owner/repo/skill-a')).toHaveLength(1)
      expect(db.getReferencingDecks('github.com/owner/repo/skill-b')).toHaveLength(1)
    })

    it('handles empty declared set (deck unlinked)', () => {
      db.addReference('github.com/owner/repo/skill', '/project-a/skill-deck.toml', 'skill')
      db.reconcileDeckReferences('/project-a/skill-deck.toml', [])
      expect(db.getReferencingDecks('github.com/owner/repo/skill')).toEqual([])
    })

    it('does not affect other decks during reconcile', () => {
      db.addReference('github.com/owner/repo/skill', '/project-a/skill-deck.toml', 'skill-a')
      db.addReference('github.com/owner/repo/skill', '/project-b/skill-deck.toml', 'skill-b')

      db.reconcileDeckReferences('/project-a/skill-deck.toml', [])

      expect(db.getReferencingDecks('github.com/owner/repo/skill')).toHaveLength(1)
      expect(db.getReferencingDecks('github.com/owner/repo/skill')[0].deckPath).toBe('/project-b/skill-deck.toml')
    })
  })

  describe('schema idempotency', () => {
    it('can be re-instantiated on same file without error', () => {
      db.close()
      const db2 = new MetadataDB(dbPath)
      db2.recordRepoRef('github.com', 'test', 'repo', 'abc123')
      expect(db2.getRepoRef('github.com', 'test', 'repo')).toBe('abc123')
      db2.close()
    })
  })
})
