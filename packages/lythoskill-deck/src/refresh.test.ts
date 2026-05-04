#!/usr/bin/env bun
/**
 * refresh.test.ts — unit tests for refresh.ts helpers
 *
 * Run: bun test packages/lythoskill-deck/src/refresh.test.ts
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

import { findGitRoot } from './refresh.ts'

let cleanup: string[] = []

afterEach(() => {
  for (const dir of cleanup) {
    rmSync(dir, { recursive: true, force: true })
  }
  cleanup = []
})

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-refresh-'))
  cleanup.push(dir)
  return dir
}

describe('findGitRoot', () => {
  it('returns the directory itself when .git is directly present', () => {
    const dir = makeTmp()
    execSync('git init', { cwd: dir, stdio: 'ignore' })
    const root = findGitRoot(dir, dir)
    expect(root).not.toBeNull()
    expect(realpathSync(root!)).toBe(realpathSync(dir))
  })

  it('finds git root in parent directory for monorepo layout', () => {
    const repoDir = makeTmp()
    const skillDir = join(repoDir, 'skills', 'my-skill')
    mkdirSync(skillDir, { recursive: true })
    execSync('git init', { cwd: repoDir, stdio: 'ignore' })
    const root = findGitRoot(skillDir, repoDir)
    expect(root).not.toBeNull()
    expect(realpathSync(root!)).toBe(realpathSync(repoDir))
  })

  it('returns null for a non-git directory', () => {
    const dir = makeTmp()
    expect(findGitRoot(dir, dir)).toBeNull()
  })
})
