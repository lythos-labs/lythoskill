import { describe, it, expect } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { checkColdPoolHealth, formatHealthWarnings, productionHealthIO, type RepoHealth } from './cold-pool-health'

function makeHealth(overrides: Partial<RepoHealth> = {}): RepoHealth {
  return {
    gitRoot: '/pool/github.com/owner/repo',
    behind: 0,
    dirtyCount: 0,
    branch: 'main',
    defaultBranch: 'main',
    ...overrides,
  }
}

describe('checkColdPoolHealth (mock IO)', () => {
  it('collects health per git root via injected IO', async () => {
    const fetched: string[] = []
    const health = await checkColdPoolHealth(['/pool/a', '/pool/b'], {
      io: {
        fetch: async (root) => { fetched.push(root) },
        behindCount: async () => 3,
        dirtyCount: async () => 2,
        currentBranch: async () => 'main',
        defaultBranch: async () => 'main',
      },
    })
    expect(health).toHaveLength(2)
    expect(fetched.sort()).toEqual(['/pool/a', '/pool/b'])
    expect(health[0]).toMatchObject({ behind: 3, dirtyCount: 2, branch: 'main' })
  })

  it('skipFetch: no fetch calls (nested refresh→link path)', async () => {
    const fetched: string[] = []
    await checkColdPoolHealth(['/pool/a'], {
      io: {
        fetch: async (root) => { fetched.push(root) },
        behindCount: async () => 0,
        dirtyCount: async () => 0,
      },
      skipFetch: true,
    })
    expect(fetched).toHaveLength(0)
  })
})

describe('formatHealthWarnings', () => {
  it('warns when behind origin, with lower-bound wording and the recovery command', () => {
    const warnings = formatHealthWarnings([makeHealth({ behind: 12 })])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('≥12 commit(s) behind')
    expect(warnings[0]).toContain('deck refresh --exec')
  })

  it('does NOT warn when behind probe failed (undefined) — offline is not drift', () => {
    const warnings = formatHealthWarnings([makeHealth({ behind: undefined })])
    expect(warnings).toHaveLength(0)
  })

  it('warns on dirty working tree with the documented recovery', () => {
    const warnings = formatHealthWarnings([makeHealth({ dirtyCount: 1 })])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('dirty')
    expect(warnings[0]).toContain('reset --hard HEAD')
    // Both fix commands must carry -C — a bare `git clean -fd` pasted from the
    // project root would delete the user's own untracked files (ZK review P1)
    expect(warnings[0]).toContain(`git -C "/pool/github.com/owner/repo" reset --hard HEAD`)
    expect(warnings[0]).toContain(`git -C "/pool/github.com/owner/repo" clean -fd`)
  })

  it('warns when the clone is on a non-default branch', () => {
    const warnings = formatHealthWarnings([makeHealth({ branch: 'fix/curator-scan-output-consistency' })])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("on 'fix/curator-scan-output-consistency'")
    expect(warnings[0]).toContain("expected 'main'")
  })

  it('does not warn on branch mismatch when default branch is unknown', () => {
    const warnings = formatHealthWarnings([makeHealth({ defaultBranch: undefined })])
    expect(warnings).toHaveLength(0)
  })

  it('clean repo → no warnings', () => {
    expect(formatHealthWarnings([makeHealth()])).toHaveLength(0)
  })

  it('multiple issues on one repo → multiple warnings', () => {
    const warnings = formatHealthWarnings([makeHealth({ behind: 2, dirtyCount: 1, branch: 'fix/x' })])
    expect(warnings).toHaveLength(3)
  })
})

// ── productionHealthIO over real git (TASK-20260719015727610 R5) ─────────
// The mock tests above prove formatting; these prove the actual git
// invocation strings (fetch / rev-list @{upstream} / porcelain / branch).
//
// Environment guard: on some invocations `bun test` breaks spawned child
// processes' piped stdout for test files inside the repo — `git --version`
// returns "" with exit 0 while side effects still happen (observed 2026-07-27,
// Bun 1.3.11/macOS, `bun test <path>` from repo root; the same file passes
// from /tmp, and the canonical per-package gate `bun --filter='*' run test`
// runs the fixture GREEN). Skipping silently would hide that, so the guard
// prints a loud warning; on sane invocations the fixture runs for real.

const canSpawnGit = (() => {
  try {
    return execFileSync('git', ['--version'], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().startsWith('git version')
  } catch {
    return false
  }
})()
if (!canSpawnGit) {
  console.warn('⚠️  R5 fixture test SKIPPED: child-process spawn is broken in this environment (git --version returned empty). Mock-level coverage only — re-run in CI or a sane shell for real-git coverage.')
}
const describeGit = canSpawnGit ? describe : describe.skip

describeGit('productionHealthIO (fixture git repos)', () => {
  function git(cwd: string, args: string[]) {
    execFileSync('git', args, { cwd, stdio: 'pipe' })
  }
  function commitFile(repo: string, name: string, content: string, msg: string) {
    writeFileSync(join(repo, name), content)
    git(repo, ['add', name])
    git(repo, ['commit', '-m', msg])
  }

  it('detects behind / dirty / branch with real git invocations', async () => {
    const base = mkdtempSync(join(tmpdir(), 'health-fix-'))
    const remote = join(base, 'remote.git')
    const other = join(base, 'other')
    const clone = join(base, 'clone')
    try {
      git(base, ['init', '--bare', remote])
      git(base, ['clone', `file://${remote}`, other])
      git(other, ['config', 'user.email', 't@example.com'])
      git(other, ['config', 'user.name', 't'])
      commitFile(other, 'a.txt', 'one', 'one')
      git(other, ['push', 'origin', 'HEAD:main'])

      git(base, ['clone', `file://${remote}`, clone])
      expect(productionHealthIO().dirtyCount && await productionHealthIO().dirtyCount(clone)).toBe(0)
      expect(await productionHealthIO().currentBranch(clone)).toBe('main')

      // Advance origin after the clone → clone falls behind
      commitFile(other, 'b.txt', 'two', 'two')
      git(other, ['push', 'origin', 'HEAD:main'])

      const io = productionHealthIO()
      await io.fetch(clone)
      const behind = await io.behindCount(clone)
      expect(behind).toBeDefined()
      expect(behind!).toBeGreaterThanOrEqual(1)

      // Dirty the working tree
      writeFileSync(join(clone, 'a.txt'), 'dirtied')
      expect(await io.dirtyCount(clone)).toBe(1)

      const warnings = formatHealthWarnings([{
        gitRoot: clone,
        behind,
        dirtyCount: 1,
        branch: await io.currentBranch(clone),
        defaultBranch: await io.defaultBranch(clone),
      }])
      expect(warnings.some(w => w.includes('behind origin'))).toBe(true)
      expect(warnings.some(w => w.includes('dirty'))).toBe(true)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  }, 20000)
})
