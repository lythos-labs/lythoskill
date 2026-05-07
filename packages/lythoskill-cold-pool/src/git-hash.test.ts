import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { simpleGit } from 'simple-git'
import { getRepoHeadRef, getSkillBlobHash, getSkillTreeHash, hashSkillMd } from './git-hash.js'

let repoDir: string

beforeAll(async () => {
  repoDir = mkdtempSync(join(tmpdir(), 'lythos-git-hash-test-'))
  const git = simpleGit(repoDir)
  await git.init(['--initial-branch=main'])
  writeFileSync(join(repoDir, 'SKILL.md'), '# Test Skill\n')
  mkdirSync(join(repoDir, 'skills', 'pdf'), { recursive: true })
  writeFileSync(join(repoDir, 'skills', 'pdf', 'SKILL.md'), '# PDF Skill\n> renders PDF\n')
  await git.add('.')
  await git.commit('initial')
})

afterAll(() => {
  rmSync(repoDir, { recursive: true, force: true })
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
    const head = await getRepoHeadRef(repoDir)
    expect(head).toBeString()
    expect(head.length).toBe(40)
  })

  it('matches simple-git log output', async () => {
    const head = await getRepoHeadRef(repoDir)
    const log = await simpleGit(repoDir).log()
    expect(head).toBe(log.latest!.hash)
  })
})

describe('getSkillBlobHash', () => {
  it('hashes SKILL.md in repo root', async () => {
    const hash = await getSkillBlobHash(repoDir, '')
    expect(hash).toBeString()
    expect(hash.length).toBe(40)
  })

  it('hashes SKILL.md in nested subpath', async () => {
    const hash = await getSkillBlobHash(repoDir, 'skills/pdf')
    expect(hash).toBeString()
    expect(hash.length).toBe(40)
  })

  it('produces different blob hashes for different files', async () => {
    const root = await getSkillBlobHash(repoDir, '')
    const nested = await getSkillBlobHash(repoDir, 'skills/pdf')
    expect(root).not.toBe(nested)
  })
})

describe('getSkillTreeHash', () => {
  it('returns tree hash for subdirectory', async () => {
    const hash = await getSkillTreeHash(repoDir, 'skills/pdf')
    expect(hash).toBeString()
    expect(hash.length).toBe(40)
  })

  it('throws on bad path', async () => {
    await expect(getSkillTreeHash(repoDir, 'nonexistent')).rejects.toThrow()
  })
})
