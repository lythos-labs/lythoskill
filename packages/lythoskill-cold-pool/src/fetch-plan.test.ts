import { describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ColdPool } from './cold-pool'
import { parseLocator } from './parse-locator'
import { buildFetchPlan, executeFetchPlan } from './fetch-plan'
import type { FetchIO } from './types'

describe('buildFetchPlan', () => {
  it('builds targetDir + cloneUrl from locator', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('github.com/anthropics/skills/skills/pdf')!
    const plan = buildFetchPlan(pool, loc)
    expect(plan.targetDir).toBe('/cold/github.com/anthropics/skills')
    expect(plan.cloneUrl).toBe('https://github.com/anthropics/skills.git')
    expect(plan.alreadyExists).toBe(false)
  })

  it('alreadyExists reflects fs presence', () => {
    const root = mkdtempSync(join(tmpdir(), 'fetch-plan-test-'))
    mkdirSync(join(root, 'github.com/owner/repo'), { recursive: true })
    const pool = new ColdPool(root)
    const loc = parseLocator('github.com/owner/repo')!
    const plan = buildFetchPlan(pool, loc)
    expect(plan.alreadyExists).toBe(true)
  })

  it('localhost locator gets empty cloneUrl + uniform <host>/<owner>/<repo> path', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('localhost/me/my-skill')!
    const plan = buildFetchPlan(pool, loc)
    expect(plan.cloneUrl).toBe('')
    expect(plan.targetDir).toBe('/cold/localhost/me/my-skill')
  })

  it('passes ref through', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('github.com/o/r')!
    const plan = buildFetchPlan(pool, loc, { ref: 'v1.2.3' })
    expect(plan.ref).toBe('v1.2.3')
  })
})

describe('executeFetchPlan', () => {
  it('alreadyExists path → already-present, no clone called', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('github.com/o/r')!
    const plan = { ...buildFetchPlan(pool, loc), alreadyExists: true }
    let cloneCalls = 0
    const io: FetchIO = {
      gitClone: () => { cloneCalls++ },
      exists: () => true,
    }
    const result = executeFetchPlan(plan, io)
    expect(result.status).toBe('already-present')
    expect(cloneCalls).toBe(0)
  })

  it('clones when target absent', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('github.com/o/r')!
    const plan = buildFetchPlan(pool, loc)
    const cloneArgs: Array<{ url: string; dir: string; opts: unknown }> = []
    const io: FetchIO = {
      gitClone: (url, dir, opts) => { cloneArgs.push({ url, dir, opts }) },
      exists: () => false,
    }
    const result = executeFetchPlan(plan, io)
    expect(result.status).toBe('cloned')
    expect(cloneArgs.length).toBe(1)
    expect(cloneArgs[0].url).toBe('https://github.com/o/r.git')
    expect(cloneArgs[0].dir).toBe('/cold/github.com/o/r')
  })

  it('clone error → failed result with message', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('github.com/o/r')!
    const plan = buildFetchPlan(pool, loc)
    const io: FetchIO = {
      gitClone: () => { throw new Error('boom') },
      exists: () => false,
    }
    const result = executeFetchPlan(plan, io)
    expect(result.status).toBe('failed')
    expect(result.message).toContain('boom')
  })

  it('localhost locator refuses to fetch', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('localhost/me/x')!
    const plan = buildFetchPlan(pool, loc)
    let cloneCalls = 0
    const io: FetchIO = {
      gitClone: () => { cloneCalls++ },
      exists: () => false,
    }
    const result = executeFetchPlan(plan, io)
    expect(result.status).toBe('failed')
    expect(result.message).toContain('localhost')
    expect(cloneCalls).toBe(0)
  })

  it('log IO is invoked', () => {
    const pool = new ColdPool('/cold')
    const loc = parseLocator('github.com/o/r')!
    const plan = buildFetchPlan(pool, loc)
    const lines: string[] = []
    const io: FetchIO = {
      gitClone: () => {},
      exists: () => false,
      log: (m) => lines.push(m),
    }
    executeFetchPlan(plan, io)
    expect(lines.some((l) => l.includes('cloning'))).toBe(true)
  })
})
