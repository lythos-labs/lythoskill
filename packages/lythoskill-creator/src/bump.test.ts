import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { skillProductDirs } from './bump.js'

/**
 * These pin the filter that `bump`'s step 5 uses to decide which skills to rebuild.
 *
 * The defect they exist for has one defining property: **nothing local catches it.**
 * Filtering by `package.json` (or by the `lythoskill-` prefix) silently skipped the
 * eight skill-only packages, so their built `SKILL.md` kept the previous version and
 * CI's "generated skill artifacts are in sync with source" gate went red on every
 * release commit — after the tag had been pushed. It stayed invisible for as long as
 * it did precisely because the pre-commit hook rebuilds only on a skill *source*
 * change, and a bump is not one.
 */

interface Shape {
  pkgJson?: boolean
  skill?: boolean
}

function fixture(spec: Record<string, Shape>): string {
  const dir = mkdtempSync(join(tmpdir(), 'bump-skill-dirs-'))
  for (const [name, shape] of Object.entries(spec)) {
    mkdirSync(join(dir, name), { recursive: true })
    if (shape.pkgJson) writeFileSync(join(dir, name, 'package.json'), '{}\n')
    if (shape.skill) mkdirSync(join(dir, name, 'skill'), { recursive: true })
  }
  return dir
}

describe('skillProductDirs — the set bump rebuilds (ADR-20260502234833756)', () => {
  test('a skill product is defined by skill/ existing, NOT by package.json', () => {
    const dir = fixture({
      'with-both': { pkgJson: true, skill: true },
      'skill-only': { skill: true }, // coach, dreaming, sober, writer, …
      'pkg-only': { pkgJson: true }, // test-utils, infra, agent-adapter, …
      neither: {},
    })
    try {
      expect(skillProductDirs(dir).sort()).toEqual(['skill-only', 'with-both'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('the `lythoskill-` prefix is not the filter', () => {
    // The ADR names this filter as the thing not to do: `lythoskill-test-utils`
    // matches the prefix without being a skill product.
    const dir = fixture({
      'not-prefixed-skill': { skill: true },
      'lythoskill-not-a-skill': { pkgJson: true },
    })
    try {
      expect(skillProductDirs(dir)).toEqual(['not-prefixed-skill'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('a missing packages/ dir yields nothing rather than throwing', () => {
    expect(skillProductDirs('/nonexistent-packages-dir-for-test')).toEqual([])
  })
})
