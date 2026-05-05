import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  inferSource, extractQuotedPhrases, parseFrontmatter,
  buildSkillMeta, formatMarkdownTable, buildCuratorPlan, buildAddPlan,
  buildAdditionRecord, scanColdPool,
} from './curator-core'

describe('inferSource', () => {
  test('extracts github.com/owner/repo from path', () => {
    expect(inferSource('/pool/github.com/lythos-labs/lythoskill/skills/deck'))
      .toBe('github.com/lythos-labs/lythoskill')
  })

  test('detects localhost source', () => {
    expect(inferSource('/pool/localhost/my-skill')).toBe('localhost')
  })

  test('falls back to path prefix for unknown patterns', () => {
    const result = inferSource('/pool/gitlab.com/foo')
    expect(result).toContain('gitlab.com')
  })
})

describe('extractQuotedPhrases', () => {
  test('extracts double-quoted phrases', () => {
    expect(extractQuotedPhrases('Use for "BDD testing" and "agent governance"'))
      .toEqual(['BDD testing', 'agent governance'])
  })

  test('deduplicates identical phrases', () => {
    expect(extractQuotedPhrases('"test" repeated "test" again'))
      .toEqual(['test'])
  })

  test('returns empty array for no quoted phrases', () => {
    expect(extractQuotedPhrases('plain text without quotes')).toEqual([])
  })
})

describe('parseFrontmatter', () => {
  test('extracts frontmatter and body', () => {
    const md = '---\nname: Test\n---\n\n# Body content'
    const { frontmatter, body } = parseFrontmatter(md)
    expect(frontmatter._raw).toBe('name: Test')
    expect(body).toBe('# Body content')
  })

  test('returns empty frontmatter when none present', () => {
    const { frontmatter, body } = parseFrontmatter('# Just markdown')
    expect(frontmatter._raw).toBeUndefined()
    expect(body).toBe('# Just markdown')
  })
})

describe('buildSkillMeta', () => {
  test('builds structured metadata from frontmatter', () => {
    const meta = buildSkillMeta(
      { name: 'my-skill', description: 'A "test" skill', type: 'flow' },
      '/pool/github.com/foo/bar/my-skill',
      'This is the body content for the skill.'
    )
    expect(meta.name).toBe('my-skill')
    expect(meta.type).toBe('flow')
    expect(meta.source).toBe('github.com/foo/bar')
    expect(meta.triggerPhrases).toContain('test')
    expect(meta.bodyPreview).toContain('This is the body')
  })

  test('handles missing fields with defaults', () => {
    const meta = buildSkillMeta({}, '/tmp/test', 'body')
    expect(meta.version).toBe('unknown')
    expect(meta.type).toBe('standard')
    expect(meta.description).toBe('')
    expect(meta.allowedTools).toEqual([])
  })

  test('parses inline array allowed-tools', () => {
    const meta = buildSkillMeta(
      { name: 'x', 'allowed-tools': '[Read, Write, Bash]' },
      '/tmp/x', ''
    )
    expect(meta.allowedTools).toContain('Read')
    expect(meta.allowedTools).toContain('Write')
  })

  test('handles userInvocable explicitly', () => {
    const t = buildSkillMeta({ name: 'x', 'user-invocable': true }, '/tmp/x', '')
    expect(t.userInvocable).toBe(true)
    const f = buildSkillMeta({ name: 'x' }, '/tmp/x', '')
    expect(f.userInvocable).toBeNull()
  })
})

describe('formatMarkdownTable', () => {
  test('formats rows as markdown table', () => {
    const result = formatMarkdownTable([
      { name: 'skill-a', type: 'standard' },
      { name: 'skill-b', type: 'flow' },
    ])
    expect(result).toContain('name')
    expect(result).toContain('type')
    expect(result).toContain('skill-a')
    expect(result).toContain('skill-b')
    expect(result).toContain('---')
  })

  test('returns placeholder for empty array', () => {
    expect(formatMarkdownTable([])).toBe('*No results.*')
  })
})

describe('buildCuratorPlan', () => {
  test('creates plan with cold pool and empty feeds', () => {
    const plan = buildCuratorPlan('/tmp/cold-pool')
    expect(plan.coldPool.path).toBe('/tmp/cold-pool')
    expect(plan.feeds).toEqual([])
    expect(plan.skillDirs).toEqual([])
  })
})

describe('buildAddPlan', () => {
  test('computes target path from github locator', () => {
    const plan = buildAddPlan('github.com/foo/bar', '/tmp/pool')
    expect(plan.feed.type).toBe('github')
    expect(plan.targetPath).toBe('/tmp/pool/github.com/foo/bar')
    expect(plan.relPath).toBe('github.com/foo/bar')
  })

  test('accepts explicit feedType override', () => {
    const plan = buildAddPlan('https://example.com/skill.git', '/tmp/pool', 'url')
    expect(plan.feed.type).toBe('url')
    expect(plan.relPath).toBe('example.com/skill')
  })

  test('strips https:// prefix from locator', () => {
    const plan = buildAddPlan('https://github.com/foo/bar', '/tmp/pool')
    expect(plan.relPath).toBe('github.com/foo/bar')
    expect(plan.targetPath).toBe('/tmp/pool/github.com/foo/bar')
  })

  test('strips .git suffix from locator', () => {
    const plan = buildAddPlan('github.com/foo/bar.git', '/tmp/pool')
    expect(plan.relPath).toBe('github.com/foo/bar')
    expect(plan.targetPath).toBe('/tmp/pool/github.com/foo/bar')
  })

  test('auto-detects url type for non-github locators', () => {
    const plan = buildAddPlan('gitlab.com/foo/bar', '/tmp/pool')
    expect(plan.feed.type).toBe('url')
    expect(plan.relPath).toBe('gitlab.com/foo/bar')
  })

  test('accepts npm feedType', () => {
    const plan = buildAddPlan('my-skill', '/tmp/pool', 'npm')
    expect(plan.feed.type).toBe('npm')
    expect(plan.relPath).toBe('my-skill')
  })
})

describe('buildAdditionRecord', () => {
  test('creates addition record with feed and reason', () => {
    const feed = { type: 'github' as const, locator: 'github.com/foo/bar', label: 'GitHub' }
    const record = buildAdditionRecord('github.com/foo/bar', feed, 'Looks promising for web scraping')
    expect(record.locator).toBe('github.com/foo/bar')
    expect(record.feed.type).toBe('github')
    expect(record.reason).toBe('Looks promising for web scraping')
    expect(record.status).toBe('added')
    expect(record.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(record.arenaResult).toBeNull()
    expect(record.forkedFrom).toBeNull()
  })

  test('sets status to forked when forkedFrom is provided', () => {
    const feed = { type: 'github' as const, locator: 'github.com/foo/bar', label: 'GH' }
    const record = buildAdditionRecord('localhost/my-fix', feed, 'Fixed PDF bug', 'github.com/foo/bar')
    expect(record.status).toBe('forked')
    expect(record.forkedFrom).toBe('github.com/foo/bar')
  })

  test('defaults to added status without forkedFrom', () => {
    const feed = { type: 'lobehub' as const, locator: 'https://lobehub.com/skill/123', label: 'LobeHub trending' }
    const record = buildAdditionRecord('github.com/foo/bar', feed, 'Trending #3')
    expect(record.status).toBe('added')
    expect(record.forkedFrom).toBeNull()
  })
})

describe('scanColdPool', () => {
  let tmpDir: string

  beforeAll(() => { tmpDir = mkdtempSync(join(tmpdir(), 'curator-scan-')) })
  afterAll(() => { rmSync(tmpDir, { recursive: true, force: true }) })

  test('returns empty array for empty pool', () => {
    const emptyDir = join(tmpDir, 'empty')
    mkdirSync(emptyDir, { recursive: true })
    expect(scanColdPool(emptyDir)).toEqual([])
  })

  test('finds skill dirs in flat pool', () => {
    const poolDir = join(tmpDir, 'flat-pool')
    const skillDir = join(poolDir, 'my-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: my-skill\n---\n# Body\n')
    const items = scanColdPool(poolDir)
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('my-skill')
    expect(items[0].relPath).toBe('my-skill')
  })

  test('infers source from Go-mod style paths', () => {
    const poolDir = join(tmpDir, 'go-mod-pool')
    const skillDir = join(poolDir, 'github.com/owner/repo')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: test\n---\n# Body\n')
    const items = scanColdPool(poolDir)
    expect(items).toHaveLength(1)
    expect(items[0].source).toBe('github.com/owner/repo')
  })

  test('skips directories without SKILL.md', () => {
    const poolDir = join(tmpDir, 'skip-no-skill')
    mkdirSync(join(poolDir, 'not-a-skill'), { recursive: true })
    mkdirSync(join(poolDir, 'also-not'), { recursive: true })
    expect(scanColdPool(poolDir)).toEqual([])
  })
})
