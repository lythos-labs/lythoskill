#!/usr/bin/env bun
/**
 * refresh.test.ts — unit tests for refresh.ts helpers
 *
 * Actual IO tests (git pull, linkDeck, refreshDeck end-to-end) belong in
 * e2e/integration tests run manually. This file tests thin wrappers only.
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { findGitRoot } from './refresh.ts'

let cleanup: string[] = []

function makeTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'deck-refresh-test-'))
  cleanup.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of cleanup) {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
  cleanup = []
})

describe('findGitRoot', () => {
  it('wraps detectGitRoot → returns gitRoot or null', () => {
    // Thin wrapper: delegates to detectGitRoot(dir, coldPool) and returns gitRoot ?? null.
    // detectGitRoot is tested in refresh-plan.test.ts with IO injection.
    // This test verifies the signature and null-coalescing.
    // null means detectGitRoot returned something without gitRoot (not-git, localhost, missing).
    // string means detectGitRoot found a git root.
    const nonexistent = join(makeTmp(), 'nonexistent', 'path')
    const result = findGitRoot(nonexistent, '/pool')
    expect(typeof result === 'string' || result === null).toBe(true)
  })
})
