import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { detectGitRoot } from './git-io'

// Note: gitClone() and gitPull() wrap external `git` invocations and are
// tested indirectly via executeFetchPlan + integration scenarios. Direct
// tests would require a fixture remote and slow the CI loop. detectGitRoot
// is pure fs traversal and is fully tested here.

describe('detectGitRoot', () => {
  const root = mkdtempSync(join(tmpdir(), 'git-root-test-'))
  const repoDir = join(root, 'pool/host/owner/repo')
  const subDir = join(repoDir, 'src/deep')
  mkdirSync(subDir, { recursive: true })
  writeFileSync(join(repoDir, '.git'), '') // .git can be a file (worktree marker) or dir; existsSync covers both
  // Sibling dir without .git
  const orphanDir = join(root, 'pool/orphan')
  mkdirSync(orphanDir, { recursive: true })

  test('finds .git at the same dir', () => {
    const r = detectGitRoot(repoDir)
    expect(r.gitRoot).toBe(resolve(repoDir))
  })

  test('walks up to find .git', () => {
    const r = detectGitRoot(subDir)
    expect(r.gitRoot).toBe(resolve(repoDir))
  })

  test('returns not-found when no .git in walk', () => {
    const r = detectGitRoot(orphanDir)
    expect(r.gitRoot).toBeNull()
    expect(r.reason).toBe('not-found')
  })

  test('respects coldPool boundary — outside-cold-pool when crossing out', () => {
    // Fresh tmpdir to ensure no .git anywhere on the path back to /
    const isolated = mkdtempSync(join(tmpdir(), 'git-root-isolated-'))
    const inner = join(isolated, 'inner')
    const coldPool = join(isolated, 'pool')
    mkdirSync(inner, { recursive: true })
    mkdirSync(coldPool, { recursive: true })
    const r = detectGitRoot(inner, coldPool)
    expect(r.gitRoot).toBeNull()
    expect(r.reason).toBe('outside-cold-pool')
  })

  test('coldPool given, walking up within cold pool finds .git', () => {
    const r = detectGitRoot(subDir, join(root, 'pool'))
    expect(r.gitRoot).toBe(resolve(repoDir))
  })
})
