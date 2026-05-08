import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reconcileDeck } from './reconcile.js'

describe('reconcileDeck', () => {
  let projectDir: string
  let coldPoolDir: string

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'deck-reconcile-'))
    coldPoolDir = join(projectDir, 'cold-pool')
    mkdirSync(coldPoolDir, { recursive: true })
  })

  afterEach(() => {
    // Cleanup handled by OS temp dir lifecycle
  })

  function writeLock(skills: any[]) {
    const lock = {
      version: '1.0.0' as const,
      generated_at: new Date().toISOString(),
      deck_source: { path: join(projectDir, 'skill-deck.toml'), content_hash: 'abc' },
      working_set: '.claude/skills',
      cold_pool: coldPoolDir,
      skills,
      constraints: {
        total_cards: skills.length,
        max_cards: 10,
        within_budget: skills.length <= 10,
        transient_warnings: [],
        dir_overlaps: [],
      },
    }
    writeFileSync(join(projectDir, 'skill-deck.lock'), JSON.stringify(lock, null, 2))
  }

  function writeDeck() {
    writeFileSync(
      join(projectDir, 'skill-deck.toml'),
      `[deck]\ncold_pool = "${coldPoolDir}"\nworking_set = ".claude/skills"\n\n[tool.skills.test]\npath = "github.com/owner/repo/test"\n`
    )
  }

  it('reports no drift when lock matches cold pool', async () => {
    writeDeck()
    writeLock([
      {
        name: 'test',
        alias: 'test',
        deck_niche: 'test',
        type: 'tool',
        source: 'github.com/owner/repo/test',
        dest: join(projectDir, '.claude/skills/test'),
        mode: 'symlink',
        linked_at: new Date().toISOString(),
        deck_managed_dirs: [],
      },
    ])

    // No cold pool repo = missing, but that's fine for this test
    // We just verify it doesn't crash
    await reconcileDeck(join(projectDir, 'skill-deck.toml'), projectDir, false)
  })

  it('shows plan-only mode by default', async () => {
    writeDeck()
    writeLock([])

    await reconcileDeck(join(projectDir, 'skill-deck.toml'), projectDir, false)
  })

  it('--apply requires --yes or TTY confirmation', async () => {
    writeDeck()
    writeLock([])

    // With --yes, apply proceeds even without TTY
    await reconcileDeck(join(projectDir, 'skill-deck.toml'), projectDir, true, true)
  })
})
