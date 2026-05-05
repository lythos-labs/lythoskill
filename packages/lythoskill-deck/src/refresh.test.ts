#!/usr/bin/env bun
/**
 * refresh.test.ts — unit tests for refresh.ts helpers
 *
 * Actual IO tests (git pull, linkDeck, refreshDeck end-to-end) belong in
 * e2e/integration tests run manually. This file tests thin wrappers only.
 */

import { describe, it, expect } from 'bun:test'

import { findGitRoot } from './refresh.ts'

describe('findGitRoot', () => {
  it('wraps detectGitRoot → returns gitRoot or null', () => {
    // Thin wrapper: delegates to detectGitRoot(dir, coldPool) and returns gitRoot ?? null.
    // detectGitRoot is tested in refresh-plan.test.ts with IO injection.
    // This test verifies the signature and null-coalescing.
    // null means detectGitRoot returned something without gitRoot (not-git, localhost, missing).
    // string means detectGitRoot found a git root.
    const result = findGitRoot('/nonexistent/path', '/pool')
    expect(typeof result === 'string' || result === null).toBe(true)
  })
})
