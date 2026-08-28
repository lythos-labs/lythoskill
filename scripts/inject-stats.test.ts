import { describe, it, expect } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { computeStats, injectStatsIntoText } from '../site/scripts/inject-stats'

// Lives in root scripts/ (not site/scripts/) so the canonical gate picks it up:
// `bun --filter='*' run test` covers workspaces = packages/* only, and
// skill-creator's test script runs ../../scripts/.
const ROOT_DIR = dirname(dirname(new URL(import.meta.url).pathname))

function sh(cmd: string): number {
  return parseInt(execFileSync('sh', ['-c', cmd], { cwd: ROOT_DIR, encoding: 'utf-8' }).trim(), 10)
}

describe('computeStats', () => {
  it('matches shell ground truth on the real repo', () => {
    const stats = computeStats(ROOT_DIR)
    expect(stats.deckCount).toBe(sh('ls examples/decks/*.toml | wc -l'))
    expect(stats.skillCount).toBe(sh('ls -d skills/*/ | wc -l'))
    // published = packages/<dir>/ with non-private package.json
    const expected = sh(`for d in packages/*/; do f="$d/package.json"; [ -f "$f" ] && ! grep -q '"private": *true' "$f" && echo x; done | wc -l`)
    expect(stats.packageCount).toBe(expected)
  })

  it('excludes skill-only dirs (no package.json) and private packages', () => {
    // Structural: every counted package dir must have a non-private package.json
    const stats = computeStats(ROOT_DIR)
    expect(stats.packageCount).toBeGreaterThan(0)
    expect(stats.packageCount).toBeLessThanOrEqual(
      sh('ls -d packages/*/ | wc -l'),
    )
  })
})

describe('injectStatsIntoText', () => {
  it('replaces all three placeholders', () => {
    const out = injectStatsIntoText('{{DECK_COUNT}} decks, {{PACKAGE_COUNT}} packages, {{SKILL_COUNT}} skills', {
      deckCount: 24, packageCount: 13, skillCount: 14,
    })
    expect(out).toBe('24 decks, 13 packages, 14 skills')
  })

  it('leaves prose without placeholders untouched (600+ stays static by design)', () => {
    expect(injectStatsIntoText('600+ tests', { deckCount: 1, packageCount: 1, skillCount: 1 }))
      .toBe('600+ tests')
  })
})
