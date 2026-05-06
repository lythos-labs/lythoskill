import { describe, expect, test } from 'bun:test'
import { buildValidationPlan, executeValidationPlan, type ValidationCheck, type ValidationIO } from './validate-plan'
import type { FetchFn, TreeEntry } from './github-tree'

function mockFetch(impl: (url: string) => { status: number; body?: unknown; headers?: Record<string, string> }): FetchFn {
  return async (url) => {
    const out = impl(url)
    return new Response(out.body !== undefined ? JSON.stringify(out.body) : null, {
      status: out.status,
      headers: out.headers,
    })
  }
}

const treeFor = (paths: string[]): TreeEntry[] =>
  paths.map((p) => ({ path: p, type: 'blob' as const, sha: 'x' }))

const ioWith = (fetch: FetchFn): ValidationIO => ({ fetch })

describe('buildValidationPlan', () => {
  test('parses input and stores defaults', () => {
    const plan = buildValidationPlan('github.com/owner/repo')
    expect(plan.locator?.repo).toBe('repo')
    expect(plan.checks).toEqual(['syntax', 'remote', 'path'])
  })

  test('parse failure → locator null', () => {
    const plan = buildValidationPlan('bad-name')
    expect(plan.locator).toBeNull()
  })

  test('honors custom checks', () => {
    const plan = buildValidationPlan('localhost/x', { checks: ['syntax'] })
    expect(plan.checks).toEqual(['syntax'])
  })
})

describe('executeValidationPlan — syntax phase', () => {
  test('parse failure → invalid + suggested fix', async () => {
    const plan = buildValidationPlan('bad-name')
    const report = await executeValidationPlan(plan)
    expect(report.status).toBe('invalid')
    expect(report.phase).toBe('syntax')
    expect(report.findings.parseError).toBeDefined()
    expect(report.suggestedFixes.length).toBe(1)
  })

  test('localhost short-circuits — no remote fetch', async () => {
    const plan = buildValidationPlan('localhost/my-skill')
    let fetched = false
    const io = ioWith(async () => {
      fetched = true
      return new Response(null, { status: 200 })
    })
    const report = await executeValidationPlan(plan, io)
    expect(fetched).toBe(false)
    expect(report.status).toBe('valid')
  })
})

describe('executeValidationPlan — remote phase', () => {
  test('404 → invalid (repo-existence)', async () => {
    const plan = buildValidationPlan('github.com/nope/nope')
    const report = await executeValidationPlan(plan, ioWith(mockFetch(() => ({ status: 404 }))))
    expect(report.status).toBe('invalid')
    expect(report.phase).toBe('repo-existence')
    expect(report.findings.repoExists).toBe(false)
  })

  test('rate-limit → ambiguous', async () => {
    const plan = buildValidationPlan('github.com/owner/repo')
    const report = await executeValidationPlan(
      plan,
      ioWith(mockFetch(() => ({ status: 403, headers: { 'X-RateLimit-Remaining': '0' } }))),
    )
    expect(report.status).toBe('ambiguous')
    expect(report.phase).toBe('repo-existence')
  })

  test('private repo → ambiguous with hint', async () => {
    const plan = buildValidationPlan('github.com/owner/repo')
    const report = await executeValidationPlan(plan, ioWith(mockFetch(() => ({ status: 403 }))))
    expect(report.status).toBe('ambiguous')
    expect(report.findings.repoIsPrivate).toBe(true)
  })
})

describe('executeValidationPlan — path phase', () => {
  test('standalone (skill=null) with SKILL.md at root → valid', async () => {
    const plan = buildValidationPlan('github.com/owner/standalone')
    const fetch = mockFetch(() => ({
      status: 200,
      body: { tree: treeFor(['SKILL.md', 'README.md']) },
    }))
    const report = await executeValidationPlan(plan, ioWith(fetch))
    expect(report.status).toBe('valid')
    expect(report.phase).toBe('skill-md-existence')
    expect(report.findings.skillMdFound).toBe(true)
  })

  test('standalone but skills exist in subdirs → invalid + qualified-locator suggestions', async () => {
    const plan = buildValidationPlan('github.com/owner/repo')
    const fetch = mockFetch(() => ({
      status: 200,
      body: { tree: treeFor(['skills/pdf/SKILL.md', 'skills/excel/SKILL.md']) },
    }))
    const report = await executeValidationPlan(plan, ioWith(fetch))
    expect(report.status).toBe('ambiguous')  // multiple candidates
    expect(report.suggestedFixes.length).toBe(2)
    expect(report.suggestedFixes.map((f) => f.newLocator).sort()).toEqual([
      'github.com/owner/repo/skills/excel',
      'github.com/owner/repo/skills/pdf',
    ])
  })

  test('skill subpath matches → valid', async () => {
    const plan = buildValidationPlan('github.com/anthropics/skills/skills/pdf')
    const fetch = mockFetch(() => ({
      status: 200,
      body: { tree: treeFor(['skills/pdf/SKILL.md', 'skills/excel/SKILL.md']) },
    }))
    const report = await executeValidationPlan(plan, ioWith(fetch))
    expect(report.status).toBe('valid')
  })

  test('skill subpath wrong → invalid + corrected suggestion', async () => {
    const plan = buildValidationPlan('github.com/anthropics/skills/pdf')  // missing skills/ prefix
    const fetch = mockFetch(() => ({
      status: 200,
      body: { tree: treeFor(['skills/pdf/SKILL.md']) },
    }))
    const report = await executeValidationPlan(plan, ioWith(fetch))
    expect(report.status).toBe('invalid')
    expect(report.phase).toBe('path-existence')
    expect(report.suggestedFixes.some((f) => f.newLocator === 'github.com/anthropics/skills/skills/pdf')).toBe(true)
  })

  test('repo with no SKILL.md anywhere → invalid + web-search hint', async () => {
    const plan = buildValidationPlan('github.com/owner/random-repo')
    const fetch = mockFetch(() => ({
      status: 200,
      body: { tree: treeFor(['README.md', 'src/index.ts']) },
    }))
    const report = await executeValidationPlan(plan, ioWith(fetch))
    expect(report.status).toBe('invalid')
    expect(report.suggestedFixes.some((f) => f.action === 'web-search')).toBe(true)
  })
})

describe('executeValidationPlan — scoped checks', () => {
  test('checks: ["syntax"] — no remote fetch even for non-localhost', async () => {
    const plan = buildValidationPlan('github.com/o/r', { checks: ['syntax'] })
    let fetched = false
    const io = ioWith(async () => {
      fetched = true
      return new Response(null, { status: 200 })
    })
    const report = await executeValidationPlan(plan, io)
    expect(fetched).toBe(false)
    expect(report.status).toBe('valid')
  })
})
