#!/usr/bin/env bun
/**
 * lythoskill-curator tests
 *
 * Design: tests are co-located with source (no __tests__ dir to keep skill build clean).
 * Run: bun test packages/lythoskill-curator/src/cli.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, spyOn } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { extractQuotedPhrases, scanSkill, runAdd, writeAddition, runFind } from './cli.ts'
import { inferSource } from './curator-core'

// ── Helpers ──────────────────────────────────────────────────

function createSkillDir(base: string, name: string, frontmatter: string, body = '# Skill Body\n') {
  const dir = join(base, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), `---\n${frontmatter}---\n\n${body}`)
  return dir
}

// ── inferSource ──────────────────────────────────────────────

describe('inferSource', () => {
  it('extracts github.com org/repo from cold-pool path', () => {
    const path = '/home/user/.agents/skill-repos/github.com/anthropics/skills/skills/pdf'
    expect(inferSource(path)).toBe('github.com/anthropics/skills')
  })

  it('extracts localhost for local skills', () => {
    const path = '/home/user/.agents/skill-repos/localhost/typecheck-guardian'
    expect(inferSource(path)).toBe('localhost')
  })

  it('returns unknown for unrecognized layout', () => {
    const path = '/random/path/to/skill'
    expect(inferSource(path)).toBe('unknown')
  })

  it('extracts github.com org/repo when SKILL.md is at repo root', () => {
    const path = '/home/user/.agents/skill-repos/github.com/gstack'
    expect(inferSource(path)).toBe('github.com/gstack')
  })
})

// ── extractQuotedPhrases ─────────────────────────────────────

describe('extractQuotedPhrases', () => {
  const fn = extractQuotedPhrases

  it('extracts half-width quoted phrases', () => {
    const text = 'Use "run tests" or "check types" when working with code.'
    expect(fn(text)).toEqual(['run tests', 'check types'])
  })

  it('extracts Chinese full-width quoted phrases', () => {
    const text = '触发词："跑类型检查"、"tsc 门禁"'
    expect(fn(text)).toEqual(['跑类型检查', 'tsc 门禁'])
  })

  it('ignores overly short or overly long quoted text', () => {
    const text = '"ab" "this is a perfectly normal trigger phrase" "' + 'x'.repeat(100) + '"'
    const result = fn(text)
    expect(result).toContain('this is a perfectly normal trigger phrase')
    expect(result).not.toContain('ab')
    expect(result).not.toContain('x'.repeat(100))
  })

  it('returns empty array for empty input', () => {
    expect(fn('')).toEqual([])
    expect(fn(null)).toEqual([])
    expect(fn(undefined)).toEqual([])
  })

  it('does not greedily cross unmatched quotes', () => {
    // This was the root cause of the bug: a half-width quote at start
    // matched a half-width quote far away, swallowing everything in between.
    const text = 'Ensure "zero errors" before claiming done.\n\n触发词："跑类型检查"'
    const result = fn(text)
    // "zero errors" and "跑类型检查" are both valid; no giant cross-paragraph match.
    expect(result).toContain('zero errors')
    expect(result).toContain('跑类型检查')
    expect(result.some((r: string) => r.includes('\n\n'))).toBe(false)
  })
})

// ── scanSkill ────────────────────────────────────────────────

describe('scanSkill', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'curator-test-'))
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('extracts standard frontmatter fields', () => {
    const dir = createSkillDir(tmpDir, 'test-skill', [
      'name: test-skill',
      'description: A test skill for unit tests.',
      'version: 1.0.0',
      'type: standard',
      'when_to_use: |',
      '  Use "in testing" or "for CI".',
      'allowed-tools:',
      '  - Bash',
      '  - Read',
      'user-invocable: false',
      'tags:',
      '  - testing',
      '  - ci',
      '',
    ].join('\n'))

    const meta = scanSkill(dir)
    expect(meta).not.toBeNull()
    expect(meta!.name).toBe('test-skill')
    expect(meta!.description).toBe('A test skill for unit tests.')
    expect(meta!.version).toBe('1.0.0')
    expect(meta!.type).toBe('standard')
    expect(meta!.whenToUse).toContain('in testing')
    expect(meta!.allowedTools).toEqual(['Bash', 'Read'])
    expect(meta!.userInvocable).toBe(false)
    expect(meta!.tags).toEqual(['testing', 'ci'])
    expect(meta!.triggerPhrases).toContain('in testing')
    expect(meta!.triggerPhrases).toContain('for CI')
  })

  it('falls back author to source org when frontmatter lacks it', () => {
    const dir = createSkillDir(
      join(tmpDir, 'github.com/some-org/some-repo'),
      'authored-skill',
      'name: authored-skill\ndescription: No author field.\n',
    )
    const meta = scanSkill(dir)
    expect(meta!.author).toBe('some-org')
    expect(meta!.source).toBe('github.com/some-org/some-repo')
  })

  it('prefers frontmatter author over inferred source org', () => {
    const dir = createSkillDir(
      join(tmpDir, 'github.com/org/repo'),
      'explicit-author',
      'name: explicit-author\ndescription: X\nauthor: Alice\n',
    )
    const meta = scanSkill(dir)
    expect(meta!.author).toBe('Alice')
  })

  it('handles Chinese description without polluting triggerPhrases', () => {
    const dir = createSkillDir(tmpDir, 'chinese-skill', [
      'name: chinese-skill',
      'description: |',
      '  解决「测试绿但编译红」的问题。',
      '  触发词："跑类型检查"、"tsc 门禁"',
      '',
    ].join('\n'))

    const meta = scanSkill(dir)
    // description contains Chinese angle brackets「」and half-width quotes.
    // triggerPhrases should NOT contain the giant cross-paragraph blob.
    expect(meta!.triggerPhrases.some((p: string) => p.includes('测试绿但编译红'))).toBe(false)
    // If when_to_use is absent, triggerPhrases may be empty (acceptable — skill quality issue).
    // The important thing is: no pollution.
  })

  it('returns null when SKILL.md is missing', () => {
    const emptyDir = join(tmpDir, 'no-skill')
    mkdirSync(emptyDir, { recursive: true })
    expect(scanSkill(emptyDir)).toBeNull()
  })

  it('sets status=parse_error and captures error when YAML is invalid', () => {
    const dir = createSkillDir(tmpDir, 'bad-yaml', [
      'name: bad-yaml',
      'description:',
      '  - unclosed: {{',
      '',
    ].join('\n'))
    const meta = scanSkill(dir)
    expect(meta).not.toBeNull()
    expect(meta!.status).toBe('parse_error')
    expect(meta!.parseError).not.toBeNull()
    // Still derivable from path
    expect(meta!.name).toBe('bad-yaml')
  })

  it('sets status=incomplete when description is empty', () => {
    const dir = createSkillDir(tmpDir, 'bare-min', 'name: bare-min\nversion: "1.0.0"\n')
    const meta = scanSkill(dir)
    expect(meta).not.toBeNull()
    expect(meta!.status).toBe('incomplete')
    expect(meta!.description).toBe('')
  })

  it('sets status=parsed when version is missing but description exists', () => {
    // Missing version is common (e.g. Anthropic skills), not a degradation
    const dir = createSkillDir(tmpDir, 'no-version', 'name: no-ver\ndescription: Works fine.\n')
    const meta = scanSkill(dir)
    expect(meta).not.toBeNull()
    expect(meta!.status).toBe('parsed')
    expect(meta!.version).toBe('unknown')
  })

  it('sets status=parsed when frontmatter is clean', () => {
    const dir = createSkillDir(tmpDir, 'clean', [
      'name: clean-skill',
      'description: Fully specified.',
      'version: 2.0.0',
      'type: flow',
      '',
    ].join('\n'))
    const meta = scanSkill(dir)
    expect(meta).not.toBeNull()
    expect(meta!.status).toBe('parsed')
    expect(meta!.parseError).toBeNull()
  })
})

// ── curator add CLI BDD ────────────────────────────────────

describe('runAdd', () => {
  let exitCode: number | undefined
  let exitErrors: string[]
  let origExit: typeof process.exit

  beforeAll(() => {
    origExit = process.exit
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`EXIT:${code}`)
    }) as typeof process.exit
  })

  afterAll(() => {
    process.exit = origExit
  })

  beforeEach(() => {
    exitCode = undefined
    exitErrors = []
    spyOn(console, 'error').mockImplementation((msg: string) => {
      exitErrors.push(String(msg))
    })
  })

  function catchExit(fn: () => void): number | undefined {
    try { fn() } catch (e: any) { if (!String(e).includes('EXIT:')) throw e }
    return exitCode
  }

  it('C1: rejects missing --pool', () => {
    const code = catchExit(() => runAdd(['github.com/foo/bar']))
    expect(code).toBe(1)
    expect(exitErrors.some(e => e.includes('--pool'))).toBe(true)
  })

  it('C2: rejects missing locator', () => {
    const code = catchExit(() => runAdd([]))
    expect(code).toBe(1)
    expect(exitErrors.some(e => e.includes('Usage'))).toBe(true)
  })

  it('C3: detects already-existing skill in cold pool', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-add-'))
    const poolDir = join(tmpDir, 'pool')
    const targetDir = join(poolDir, 'github.com/foo/bar')
    mkdirSync(targetDir, { recursive: true })
    mkdirSync(join(targetDir, '.git'), { recursive: true }) // must have .git to be detected

    const logs: string[] = []
    spyOn(console, 'log').mockImplementation((msg: string) => logs.push(String(msg)))

    catchExit(() => runAdd(['github.com/foo/bar', '--pool', poolDir]))
    expect(logs.some(l => l.includes('already in cold pool'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('C4: clone failure exits with error', () => {
    const poolDir = mkdtempSync(join(tmpdir(), 'curator-add-'))
    const errors: string[] = []
    spyOn(console, 'error').mockImplementation((msg: string) => errors.push(String(msg)))

    try {
      runAdd(['github.com/nonexistent/repo', '--pool', poolDir])
    } catch (_) {
      // runAdd calls process.exit(1) after git clone failure → our mock throws EXIT
    }

    expect(errors.some(e => e.includes('Failed to clone'))).toBe(true)
    rmSync(poolDir, { recursive: true, force: true })
  })

  it('C5: --output is parsed and shown in dry-run', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-add-'))
    const poolDir = join(tmpDir, 'pool')
    const customOutput = join(tmpDir, 'my-index')
    const logs: string[] = []
    spyOn(console, 'log').mockImplementation((msg: string) => logs.push(String(msg)))

    runAdd(['github.com/foo/bar', '--pool', poolDir, '--output', customOutput, '--dry-run'])
    expect(logs.some(l => l.includes(`Output: ${customOutput}`))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('C6: --output does not crash when skill already in cold pool', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-add-'))
    const poolDir = join(tmpDir, 'pool')
    const customOutput = join(tmpDir, 'my-index')
    const targetDir = join(poolDir, 'github.com/foo/bar')
    mkdirSync(targetDir, { recursive: true })
    mkdirSync(join(targetDir, '.git'), { recursive: true })

    const logs: string[] = []
    spyOn(console, 'log').mockImplementation((msg: string) => logs.push(String(msg)))

    catchExit(() => runAdd(['github.com/foo/bar', '--pool', poolDir, '--output', customOutput]))
    expect(logs.some(l => l.includes('already in cold pool'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── writeAddition ────────────────────────────────────────────

describe('writeAddition', () => {
  it('writes record to specified outputDir', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-write-'))
    const outputDir = join(tmpDir, 'custom-index')
    const record = { locator: 'github.com/foo/bar', addedAt: '2026-01-01T00:00:00Z', reason: 'test' }
    writeAddition(outputDir, record as any)

    const file = join(outputDir, 'additions.jsonl')
    expect(existsSync(file)).toBe(true)
    const lines = readFileSync(file, 'utf-8').trim().split('\n')
    expect(lines.length).toBe(1)
    const parsed = JSON.parse(lines[0])
    expect(parsed.locator).toBe('github.com/foo/bar')
    expect(parsed.reason).toBe('test')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('appends to existing additions.jsonl', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-write-'))
    const outputDir = join(tmpDir, 'custom-index')
    mkdirSync(outputDir, { recursive: true })
    writeFileSync(join(outputDir, 'additions.jsonl'), JSON.stringify({ old: true }) + '\n')

    writeAddition(outputDir, { locator: 'github.com/baz/qux', addedAt: '2026-01-02T00:00:00Z', reason: 'second' } as any)

    const lines = readFileSync(join(outputDir, 'additions.jsonl'), 'utf-8').trim().split('\n')
    expect(lines.length).toBe(2)
    expect(JSON.parse(lines[1]).locator).toBe('github.com/baz/qux')

    rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── runFind ────────────────────────────────────────────────────

import { CatalogDb } from './catalog-db.ts'

describe('runFind', () => {
  function seedDb(dbPath: string, skills: { name: string; path: string; type: string; description: string }[]) {
    const db = new CatalogDb(dbPath)
    try {
      for (const s of skills) {
        db.insertSkill({
          $name: s.name,
          $description: s.description,
          $type: s.type,
          $version: '1.0.0',
          $path: s.path,
          $niches: '[]',
          $managed_dirs: '[]',
          $trigger_phrases: '[]',
          $has_scripts: 0,
          $has_examples: 0,
          $body_preview: '',
          $source: 'github.com/test/skills',
          $when_to_use: '',
          $allowed_tools: '[]',
          $author: '',
          $user_invocable: 1,
          $tags: '[]',
          $deck_dependencies: '[]',
          $deck_skill_type: 'tool',
          $content_hash: '',
          $status: 'parsed',
          $indexed_at: new Date().toISOString(),
          $last_parsed_at: new Date().toISOString(),
          $parse_error: '',
        })
      }
    } finally {
      db.close()
    }
  }

  it('F1: finds a skill by bare name and outputs path + deck add command', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-find-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'fullstack-dev', path: 'github.com/anthropics/skills/skills/fullstack-dev', type: 'standard', description: 'Full-stack dev skill' },
    ])

    // Capture stdout
    const lines: string[] = []
    const orig = console.log
    console.log = (msg: string) => { lines.push(msg) }

    try {
      runFind(['--db', dbPath, 'fullstack-dev'])
    } finally {
      console.log = orig
    }

    const output = lines.join('\n')
    expect(output).toContain('name: fullstack-dev')
    expect(output).toContain('path: github.com/anthropics/skills/skills/fullstack-dev')
    expect(output).toContain('bunx @lythos/skill-deck add fullstack-dev')
    expect(output).toContain('[tool.skills.fullstack-dev]')
    expect(output).toContain('path = "github.com/anthropics/skills/skills/fullstack-dev"')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('F2: not found gives clear guidance + WebSearch hint', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-find-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, []) // empty db

    const lines: string[] = []
    const orig = console.log
    console.log = (msg: string) => { lines.push(msg) }

    try {
      runFind(['--db', dbPath, 'nonexistent-skill'])
    } finally {
      console.log = orig
    }

    const output = lines.join('\n')
    expect(output).toContain('not found')
    expect(output).toContain('gh search code')
    expect(output).toContain('curator add')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('F3: multiple matches shows all options with disambiguation', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-find-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'fullstack-dev', path: 'github.com/MiniMax-AI/skills/skills/fullstack-dev', type: 'standard', description: 'MiniMax fullstack' },
      { name: 'fullstack-dev', path: 'github.com/ChatGLM/skills/skills/fullstack-dev', type: 'standard', description: 'ChatGLM fullstack' },
    ])

    const lines: string[] = []
    const orig = console.log
    console.log = (msg: string) => { lines.push(msg) }

    try {
      runFind(['--db', dbPath, 'fullstack-dev'])
    } finally {
      console.log = orig
    }

    const output = lines.join('\n')
    expect(output).toContain('Multiple skills found')
    expect(output).toContain('MiniMax-AI')
    expect(output).toContain('ChatGLM')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('F4: rejects missing bare name', () => {
    const errors: string[] = []
    const orig = console.error
    console.error = (msg: string) => { errors.push(msg) }

    const origExit = process.exit
    let exitCode: number | undefined
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`EXIT:${code}`)
    }) as typeof process.exit

    try {
      runFind(['--db', '/tmp/fake.db'])
    } catch (e: any) {
      // expected
    }

    expect(exitCode).toBe(1)
    expect(errors.some(e => e.includes('Usage'))).toBe(true)

    process.exit = origExit
    console.error = orig
  })
})
