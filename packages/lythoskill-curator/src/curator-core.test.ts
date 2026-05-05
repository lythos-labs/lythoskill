import { describe, test, expect } from 'bun:test'
import {
  inferSource, extractQuotedPhrases, parseFrontmatter,
  buildSkillMeta, formatMarkdownTable, buildCuratorPlan, buildAddPlan,
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
})
