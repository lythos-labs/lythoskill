import { describe, it, expect } from 'bun:test'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getRepoHeadRef, getSkillBlobHash, getSkillTreeHash, type GitHashIO } from './git-hash.js'

describe('git-hash helpers', () => {
  // Build a real git repo on disk so git commands work end-to-end.
  const repoDir = mkdtempSync(join(tmpdir(), 'git-hash-test-'))

  // Init repo, commit a SKILL.md, commit a subdir skill
  execFileSync('git', ['init'], { cwd: repoDir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir })

  writeFileSync(join(repoDir, 'SKILL.md'), '# Root skill')
  mkdirSync(join(repoDir, 'skills', 'pdf'), { recursive: true })
  writeFileSync(join(repoDir, 'skills', 'pdf', 'SKILL.md'), '# PDF skill')
  execFileSync('git', ['add', '.'], { cwd: repoDir })
  execFileSync('git', ['commit', '-m', 'init'], { cwd: repoDir })

  const headRef = execFileSync('git', ['-C', repoDir, 'rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim()

  describe('getRepoHeadRef', () => {
    it('returns the HEAD commit hash', () => {
      const result = getRepoHeadRef(repoDir)
      expect(result).toBe(headRef)
      expect(result).toHaveLength(40)
    })

    it('uses injectable IO', () => {
      const mockIO: GitHashIO = {
        execGit: () => 'mock-ref-123',
      }
      expect(getRepoHeadRef(repoDir, mockIO)).toBe('mock-ref-123')
    })
  })

  describe('getSkillBlobHash', () => {
    it('returns git blob hash for root SKILL.md (empty subpath)', () => {
      const hash = getSkillBlobHash(repoDir, '')
      expect(hash).toHaveLength(40)
      // Git blob hash of "# Root skill\n"
      expect(hash).toMatch(/^[0-9a-f]{40}$/)
    })

    it('returns git blob hash for nested skill', () => {
      const hash = getSkillBlobHash(repoDir, 'skills/pdf')
      expect(hash).toHaveLength(40)
      expect(hash).toMatch(/^[0-9a-f]{40}$/)
    })

    it('uses injectable IO', () => {
      const mockIO: GitHashIO = {
        execGit: () => 'mock-blob-hash',
      }
      expect(getSkillBlobHash(repoDir, 'skills/pdf', mockIO)).toBe('mock-blob-hash')
    })
  })

  describe('getSkillTreeHash', () => {
    it('returns tree hash for a subdirectory', () => {
      const hash = getSkillTreeHash(repoDir, 'skills/pdf')
      expect(hash).toHaveLength(40)
      expect(hash).toMatch(/^[0-9a-f]{40}$/)
    })

    it('uses injectable IO', () => {
      const mockIO: GitHashIO = {
        execGit: () => '040000 tree abc1234\tskills/pdf',
      }
      expect(getSkillTreeHash(repoDir, 'skills/pdf', mockIO)).toBe('abc1234')
    })

    it('throws on unparsable output', () => {
      const badIO: GitHashIO = {
        execGit: () => 'garbage',
      }
      expect(() => getSkillTreeHash(repoDir, 'skills/pdf', badIO)).toThrow('Could not parse tree hash')
    })
  })
})
