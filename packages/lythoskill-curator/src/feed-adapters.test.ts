import { describe, test, expect, beforeAll, afterAll, spyOn } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createColdPoolFeedAdapter,
  createGitHubSearchAdapter,
  createLobeHubAdapter,
  createAgentSkillShAdapter,
} from './feed-adapters.js'

describe('createColdPoolFeedAdapter', () => {
  let tmpDir: string
  beforeAll(() => { tmpDir = mkdtempSync(join(tmpdir(), 'curator-feed-')) })
  afterAll(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  test('discovers skills from cold pool directory', async () => {
    const poolDir = join(tmpDir, 'pool')
    const skillDir = join(poolDir, 'github.com/foo/bar')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: bar\n---\n# Body\n')

    const adapter = createColdPoolFeedAdapter(poolDir)
    const items = await adapter.discover()
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('bar')
    expect(items[0].source).toBe('cold-pool')
    expect(items[0].locator).toContain('github.com/foo/bar')
  })

  test('returns empty array for empty pool', async () => {
    const emptyDir = join(tmpDir, 'empty')
    mkdirSync(emptyDir, { recursive: true })
    const items = await createColdPoolFeedAdapter(emptyDir).discover()
    expect(items).toEqual([])
  })
})

describe('createGitHubSearchAdapter', () => {
  test('returns feed metadata', () => {
    const adapter = createGitHubSearchAdapter()
    expect(adapter.feed.type).toBe('github')
    expect(adapter.feed.label).toContain('GitHub')
  })

  test('accepts custom query', () => {
    const adapter = createGitHubSearchAdapter('web scraping skill')
    expect(adapter.feed.locator).toContain('web scraping')
  })

  test('returns empty on network error', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const items = await createGitHubSearchAdapter().discover()
    expect(items).toEqual([])
  })

  test('returns empty on non-ok response', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response)
    const items = await createGitHubSearchAdapter().discover()
    expect(items).toEqual([])
  })
})

describe('createLobeHubAdapter', () => {
  test('returns feed metadata', () => {
    const adapter = createLobeHubAdapter()
    expect(adapter.feed.type).toBe('lobehub')
    expect(adapter.feed.label).toContain('LobeHub')
  })

  test('accepts custom query', () => {
    const adapter = createLobeHubAdapter('web scraping')
    expect(adapter.feed.locator).toContain('web scraping')
  })

  test('returns empty when market-cli is not installed', async () => {
    // When @lobehub/market-cli is not installed, spawnSync returns non-zero
    const items = await createLobeHubAdapter().discover()
    // In test environments without market-cli, this should return empty
    expect(items).toEqual([])
  })
})

describe('createAgentSkillShAdapter', () => {
  test('returns feed metadata', () => {
    const adapter = createAgentSkillShAdapter()
    expect(adapter.feed.type).toBe('marketplace')
  })

  test('returns empty array (placeholder adapter)', async () => {
    const items = await createAgentSkillShAdapter().discover()
    expect(items).toEqual([])
  })
})
