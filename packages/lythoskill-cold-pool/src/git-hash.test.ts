import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { simpleGit } from 'simple-git'
import { getRepoHeadRef, getSkillBlobHash, getSkillTreeHash, hashSkillMd, parseTreeHash, computeSha256, buildSkillPath } from './git-hash.js'

let repoDir: string
let canGit = false

beforeAll(async () => {
  try {
    repoDir = mkdtempSync(join(tmpdir(), 'lythos-git-hash-test-'))
    const git = simpleGit(repoDir)
    await git.init(['--initial-branch=main'])
    await git.addConfig('user.name', 'test')
    await git.addConfig('user.email', 'test@test.com')
    writeFileSync(join(repoDir, 'SKILL.md'), '# Test Skill\n')
    mkdirSync(join(repoDir, 'skills', 'pdf'), { recursive: true })
    writeFileSync(join(repoDir, 'skills', 'pdf', 'SKILL.md'), '# PDF Skill\n> renders PDF\n')
    await git.add('.')
    await git.commit('initial')
    // Verify the environment actually works end-to-end
    const head = await git.revparse(['HEAD'])
    if (head && head.length === 40) canGit = true
  } catch {
    // Git unavailable (CI without credentials, etc.) — git tests will skip
  }
})

afterAll(() => {
  if (repoDir) rmSync(repoDir, { recursive: true, force: true })
})

describe('hashSkillMd (SHA-256)', () => {
  it('computes SHA-256 of SKILL.md', () => {
    const result = hashSkillMd(join(repoDir, 'SKILL.md'))
    expect(result).toBeString()
    expect(result.length).toBe(64)
  })

  it('produces deterministic output', () => {
    const a = hashSkillMd(join(repoDir, 'SKILL.md'))
    const b = hashSkillMd(join(repoDir, 'SKILL.md'))
    expect(a).toBe(b)
  })

  it('produces different hash for different content', () => {
    const root = hashSkillMd(join(repoDir, 'SKILL.md'))
    const nested = hashSkillMd(join(repoDir, 'skills', 'pdf', 'SKILL.md'))
    expect(root).not.toBe(nested)
  })
})

describe('getRepoHeadRef', () => {
  it('returns HEAD commit hash', async () => {
    if (!canGit) return
    const head = await getRepoHeadRef(repoDir)
    expect(head).toBeString()
    expect(head.length).toBe(40)
  })

  it('matches simple-git log output', async () => {
    if (!canGit) return
    const head = await getRepoHeadRef(repoDir)
    const log = await simpleGit(repoDir).log()
    expect(head).toBe(log.latest!.hash)
  })
})

describe('getSkillBlobHash', () => {
  it('hashes SKILL.md in repo root', async () => {
    if (!canGit) return
    const hash = await getSkillBlobHash(repoDir, '')
    expect(hash).toBeString()
    expect(hash.length).toBe(40)
  })

  it('hashes SKILL.md in nested subpath', async () => {
    if (!canGit) return
    const hash = await getSkillBlobHash(repoDir, 'skills/pdf')
    expect(hash).toBeString()
    expect(hash.length).toBe(40)
  })

  it('produces different blob hashes for different files', async () => {
    if (!canGit) return
    const root = await getSkillBlobHash(repoDir, '')
    const nested = await getSkillBlobHash(repoDir, 'skills/pdf')
    expect(root).not.toBe(nested)
  })
})

// ── Pure functions (L0 — no git, no fs) ─────────────────────────

describe('parseTreeHash', () => {
  test('extracts hash from ls-tree output', () => {
    // Real git ls-tree output format: <mode> <type> <hash>\t<path>
    const line = '100644 blob abc123def456789012345678901234567890abcd\tSKILL.md'
    expect(parseTreeHash(line)).toBe('abc123def456789012345678901234567890abcd')
  })

  test('extracts tree hash from tree entry', () => {
    const line = '040000 tree def456abc789012345678901234567890abcd123\tpdf'
    expect(parseTreeHash(line)).toBe('def456abc789012345678901234567890abcd123')
  })

  test('handles output with leading/trailing whitespace', () => {
    const line = '  100644 blob aaa111bbb222ccc333ddd444eee555fff666777888\tfile.md  '
    expect(parseTreeHash(line)).toBe('aaa111bbb222ccc333ddd444eee555fff666777888')
  })

  test('throws on empty output', () => {
    expect(() => parseTreeHash('')).toThrow('Empty ls-tree output')
    expect(() => parseTreeHash('   ')).toThrow('Empty ls-tree output')
  })

  test('throws on unparseable output', () => {
    expect(() => parseTreeHash('garbage')).toThrow('Could not parse tree hash')
  })
})

describe('computeSha256', () => {
  test('computes deterministic hash', () => {
    expect(computeSha256('hello')).toBe(computeSha256('hello'))
  })

  test('produces 64-char hex string', () => {
    const hash = computeSha256('test content')
    expect(hash.length).toBe(64)
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
  })

  test('different content → different hash', () => {
    expect(computeSha256('a')).not.toBe(computeSha256('b'))
  })
})

describe('buildSkillPath', () => {
  test('appends SKILL.md to subpath', () => {
    expect(buildSkillPath('skills/pdf')).toBe('skills/pdf/SKILL.md')
  })

  test('returns just SKILL.md for empty subpath', () => {
    expect(buildSkillPath('')).toBe('SKILL.md')
  })
})

// ── IO functions (L1 — real git in temp repo) ───────────────────

describe('getSkillTreeHash', () => {
  it('returns tree hash for subdirectory', async () => {
    if (!canGit) return
    const hash = await getSkillTreeHash(repoDir, 'skills/pdf')
    expect(hash).toBeString()
    expect(hash.length).toBe(40)
  })

  it('throws on bad path', async () => {
    if (!canGit) return
    await expect(getSkillTreeHash(repoDir, 'nonexistent')).rejects.toThrow()
  })
})
