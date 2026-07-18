import { describe, it, expect } from 'bun:test'
import { checkColdPoolHealth, formatHealthWarnings, type RepoHealth } from './cold-pool-health'

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

describe('checkColdPoolHealth', () => {
  it('collects health per git root via injected IO', () => {
    const fetched: string[] = []
    const health = checkColdPoolHealth(['/pool/a', '/pool/b'], {
      fetch: (root) => { fetched.push(root) },
      behindCount: () => 3,
      dirtyCount: () => 2,
      currentBranch: () => 'main',
      defaultBranch: () => 'main',
    })
    expect(health).toHaveLength(2)
    expect(fetched).toEqual(['/pool/a', '/pool/b'])
    expect(health[0]).toMatchObject({ behind: 3, dirtyCount: 2, branch: 'main' })
  })
})

describe('formatHealthWarnings', () => {
  it('warns when behind origin, with the recovery command', () => {
    const warnings = formatHealthWarnings([makeHealth({ behind: 12 })])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('12 commit(s) behind')
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
    expect(warnings[0]).toContain('checkout -- .')
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
