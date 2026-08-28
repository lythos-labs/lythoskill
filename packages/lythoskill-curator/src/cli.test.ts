#!/usr/bin/env bun
/**
 * lythoskill-curator tests
 *
 * Design: tests are co-located with source (no __tests__ dir to keep skill build clean).
 * Run: bun test packages/lythoskill-curator/src/cli.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { extractQuotedPhrases, scanSkill, runCurator, runAdd, writeAddition, runFind, runQuery, runAudit, runTag, backupIndex, restoreIndex, printHelp, runRefreshPlan, runRefreshExecute } from './cli.ts'
import { inferSource } from './curator-core'

// ── Helpers ──────────────────────────────────────────────────

function createSkillDir(base: string, name: string, frontmatter: string, body = '# Skill Body\n') {
  const dir = join(base, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), `---\n${frontmatter}---\n\n${body}`)
  return dir
}

/** Use a CatalogDb within a scope — opened before fn, closed after */
function useDb<T>(dbPath: string, fn: (db: CatalogDb) => T): T {
  const db = new CatalogDb(dbPath)
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

/** Catch EXIT:<code> thrown by mock io.exit — returns code or undefined */
function catchExit(fn: () => void): number | undefined {
  let exitCode: number | undefined
  try { fn() } catch (e: any) {
    if (!String(e).includes('EXIT:')) throw e
    const m = String(e).match(/EXIT:(\d+)/)
    if (m) exitCode = parseInt(m[1], 10)
  }
  return exitCode
}

interface SeedSkill {
  name: string
  path: string
  type: string
  description: string
  when_to_use?: string
  version?: string
}

/** Seed skills into a catalog DB for testing. Closes db after. */
function seedDb(dbPath: string, skills: SeedSkill[]) {
  const db = new CatalogDb(dbPath)
  try {
    for (const s of skills) {
      db.insertSkill({
        $name: s.name,
        $description: s.description,
        $type: s.type,
        $version: s.version || '1.0.0',
        $path: s.path,
        $niches: '[]',
        $managed_dirs: '[]',
        $trigger_phrases: '[]',
        $has_scripts: 0,
        $has_examples: 0,
        $body_preview: '',
        $source: 'github.com/test/skills',
        $when_to_use: s.when_to_use || 'Use it.',
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
    // Force lazy-open even with 0 skills so the file exists on disk
    db.query('SELECT 1').get()
  } finally {
    db.close()
  }
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
  it('C1: rejects missing --pool', () => {
    const errors: string[] = []
    const code = catchExit(() => runAdd(['github.com/foo/bar'], {
      error: (msg) => errors.push(String(msg)),
      log: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))
    expect(code).toBe(1)
    expect(errors.some(e => e.includes('--pool'))).toBe(true)
  })

  it('C2: rejects missing locator', () => {
    const errors: string[] = []
    const code = catchExit(() => runAdd([], {
      error: (msg) => errors.push(String(msg)),
      log: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))
    expect(code).toBe(1)
    expect(errors.some(e => e.includes('Usage'))).toBe(true)
  })

  it('C3: detects already-existing skill in cold pool', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-add-'))
    const poolDir = join(tmpDir, 'pool')
    const targetDir = join(poolDir, 'github.com/foo/bar')
    mkdirSync(targetDir, { recursive: true })
    mkdirSync(join(targetDir, '.git'), { recursive: true }) // must have .git to be detected

    const logs: string[] = []

    catchExit(() => runAdd(['github.com/foo/bar', '--pool', poolDir], {
      error: () => {},
      log: (msg) => logs.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))
    expect(logs.some(l => l.includes('already in cold pool'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('C4: clone failure exits with error', () => {
    const poolDir = mkdtempSync(join(tmpdir(), 'curator-add-'))
    const errors: string[] = []

    try {
      runAdd(['github.com/nonexistent/repo', '--pool', poolDir], {
        error: (msg) => errors.push(String(msg)),
        log: () => {},
        exit: (code) => { throw new Error(`EXIT:${code}`) },
        fetchIO: { gitClone: () => { throw new Error('mock clone failure') } },
      })
    } catch (_) {
      // runAdd calls io.exit(1) after git clone failure → our mock throws EXIT
    }

    expect(errors.some(e => e.includes('Failed to clone'))).toBe(true)
    rmSync(poolDir, { recursive: true, force: true })
  })

  it('C5: --output is parsed and shown in dry-run', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-add-'))
    const poolDir = join(tmpDir, 'pool')
    const customOutput = join(tmpDir, 'my-index')
    const logs: string[] = []

    runAdd(['github.com/foo/bar', '--pool', poolDir, '--output', customOutput, '--dry-run'], {
      error: () => {},
      log: (msg) => logs.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })
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

    catchExit(() => runAdd(['github.com/foo/bar', '--pool', poolDir, '--output', customOutput], {
      error: () => {},
      log: (msg) => logs.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))
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
  it('F1: finds a skill by bare name and outputs path + deck add command', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-find-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'fullstack-dev', path: 'github.com/anthropics/skills/skills/fullstack-dev', type: 'standard', description: 'Full-stack dev skill' },
    ])

    // Capture stdout via injected IO
    const lines: string[] = []

    try {
      runFind(['fullstack-dev', '--db', dbPath], {
        error: () => {},
        log: (msg: string) => { lines.push(msg) },
        exit: (code) => { throw new Error(`EXIT:${code}`) },
      })
    } catch {
      // expected: io.exit(0) throws EXIT:0
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
    // Seed a skill so catalog is non-empty, but search for a different name
    seedDb(dbPath, [
      { name: 'some-other-skill', path: 'github.com/test/skills/some-other-skill', type: 'standard', description: 'Some other skill' },
    ])

    const lines: string[] = []

    try {
      runFind(['nonexistent-skill', '--db', dbPath], {
        error: () => {},
        log: (msg: string) => { lines.push(msg) },
        exit: (code) => { throw new Error(`EXIT:${code}`) },
      })
    } catch {
      // expected: io.exit(0) throws EXIT:0
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

    try {
      runFind(['fullstack-dev', '--db', dbPath], {
        error: () => {},
        log: (msg: string) => { lines.push(msg) },
        exit: (code) => { throw new Error(`EXIT:${code}`) },
      })
    } catch {
      // expected: io.exit(0) throws EXIT:0
    }

    const output = lines.join('\n')
    expect(output).toContain('skills share the name')
    expect(output).toContain('MiniMax-AI')
    expect(output).toContain('ChatGLM')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('F4: rejects missing bare name', () => {
    const errors: string[] = []
    let exitCode: number | undefined

    try {
      runFind([], {
        error: (msg: string) => { errors.push(msg) },
        log: () => {},
        exit: (code) => { exitCode = code; throw new Error(`EXIT:${code}`) },
      })
    } catch {
      // expected
    }

    expect(exitCode).toBe(1)
    expect(errors.some(e => e.includes('Usage'))).toBe(true)
  })
})

// ── runQuery ───────────────────────────────────────────────────

describe('runQuery', () => {
  it('Q1: No SQL + DB exists → schema output in io.log', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-query-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'test-skill', path: 'github.com/test/skills/test-skill', type: 'standard', description: 'Test skill' },
    ])

    const logs: string[] = []
    runQuery(['--db', dbPath], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    const output = logs.join('\n')
    expect(output).toContain('catalog.db schema')
    expect(output).toContain('Table: `skills`')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('Q2: SELECT query → markdown table in io.log', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-query-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'alpha-skill', path: 'github.com/test/skills/alpha-skill', type: 'standard', description: 'Alpha skill' },
    ])

    const logs: string[] = []
    runQuery(['SELECT name, type FROM skills', '--db', dbPath], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    const output = logs.join('\n')
    expect(output).toContain('alpha-skill')
    expect(output).toContain('standard')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('Q3: DB not found → io.error contains "not found", io.exit(1)', () => {
    const errors: string[] = []
    const code = catchExit(() => runQuery(['SELECT * FROM skills', '--db', '/nonexistent/catalog.db'], {
      log: () => {},
      error: (msg) => errors.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))

    expect(code).toBe(1)
    expect(errors.some(e => e.includes('not found'))).toBe(true)
  })

  it('Q4: Non-SELECT query (e.g. DELETE) → io.error contains "only SELECT", io.exit(1)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-query-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'test-skill', path: 'github.com/test/skills/test-skill', type: 'standard', description: 'Test skill' },
    ])

    const errors: string[] = []
    const code = catchExit(() => runQuery(['DELETE FROM skills', '--db', dbPath], {
      log: () => {},
      error: (msg) => errors.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))

    expect(code).toBe(1)
    expect(errors.some(e => e.includes('only SELECT'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── runAudit ─────────────────────────────────────────────────

describe('runAudit', () => {
  it('A1: normal audit → log contains Summary and score', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-audit-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'skill-a', path: 'github.com/test/skills/skill-a', type: 'standard', description: 'A skill' },
    ])

    const logs: string[] = []
    runAudit(['--db', dbPath], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    const output = logs.join('\n')
    expect(output).toContain('Summary:')
    expect(output).toContain('Audit score:')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('A2: empty DB → 0 issues, score 100', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-audit-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [])

    const logs: string[] = []
    runAudit(['--db', dbPath], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    const output = logs.join('\n')
    expect(output).toContain('0 issue')
    expect(output).toContain('100/100')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('A3: DB not found → error + exit(1)', () => {
    const errors: string[] = []
    const code = catchExit(() => runAudit(['--db', '/nonexistent/db'], {
      log: () => {},
      error: (msg) => errors.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))

    expect(code).toBe(1)
    expect(errors.some(e => e.includes('not found'))).toBe(true)
  })
})

// ── runTag ───────────────────────────────────────────────────

describe('runTag', () => {
  it('T1: tag niche → skill niches updated', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-tag-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'skill-a', path: 'github.com/test/skills/skill-a', type: 'standard', description: 'A skill' },
    ])

    const logs: string[] = []
    runTag(['skill-a', '--niche', 'test-niche', '--db', dbPath], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    expect(logs.some(l => l.includes('Tagged skill-a'))).toBe(true)

    useDb(dbPath, (db) => {
      const row = db.get<{ niches: string }>(`SELECT niches FROM skills WHERE name = $name`, { $name: 'skill-a' })
      expect(row).not.toBeNull()
      const niches = JSON.parse(row!.niches)
      expect(niches).toContain('test-niche')
    })

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('T2: tag qa signal → niches contains qa: prefix', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-tag-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'skill-a', path: 'github.com/test/skills/skill-a', type: 'standard', description: 'A skill' },
    ])

    const logs: string[] = []
    runTag(['skill-a', '--qa', '{"source_type":"self","signal_value":8}', '--db', dbPath], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    expect(logs.some(l => l.includes('1 signal(s)'))).toBe(true)

    useDb(dbPath, (db) => {
      const row = db.get<{ niches: string }>(`SELECT niches FROM skills WHERE name = $name`, { $name: 'skill-a' })
      expect(row).not.toBeNull()
      const niches = JSON.parse(row!.niches)
      expect(niches.some((n: string) => n.startsWith('qa:'))).toBe(true)
    })

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('T3: skill not found → error + exit(1)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-tag-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'skill-a', path: 'github.com/test/skills/skill-a', type: 'standard', description: 'A skill' },
    ])

    const errors: string[] = []
    const code = catchExit(() => runTag(['nonexistent', '--niche', 'test', '--db', dbPath], {
      log: () => {},
      error: (msg) => errors.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))

    expect(code).toBe(1)
    expect(errors.some(e => e.includes('not found'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('T4: missing --niche and --qa → error + exit(1)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-tag-'))
    const dbPath = join(tmpDir, 'catalog.db')
    seedDb(dbPath, [
      { name: 'skill-a', path: 'github.com/test/skills/skill-a', type: 'standard', description: 'A skill' },
    ])

    const errors: string[] = []
    const code = catchExit(() => runTag(['skill-a', '--db', dbPath], {
      log: () => {},
      error: (msg) => errors.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))

    expect(code).toBe(1)
    expect(errors.some(e => e.includes('At least one'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── backupIndex / restoreIndex ───────────────────────────────

describe('backupIndex', () => {
  it('B1: backup created → log contains Backup created', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-backup-'))
    writeFileSync(join(tmpDir, 'REGISTRY.json'), '{}')
    writeFileSync(join(tmpDir, 'catalog.db'), 'sqlite')

    const logs: string[] = []
    const result = backupIndex(tmpDir, {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    expect(result).not.toBeNull()
    expect(logs.some(l => l.includes('Backup created'))).toBe(true)
    expect(existsSync(result!.registryBak)).toBe(true)
    expect(existsSync(result!.dbBak)).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })
})

describe('restoreIndex', () => {
  it('B2: restore from backup → log contains Restored', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-restore-'))
    const registryPath = join(tmpDir, 'REGISTRY.json')
    const dbPath = join(tmpDir, 'catalog.db')
    writeFileSync(registryPath, '{"original":true}')
    writeFileSync(dbPath, 'original-db')

    // Create backup files
    const registryBak = `${registryPath}.bak.2026-01-01-00-00-00`
    const dbBak = `${dbPath}.bak.2026-01-01-00-00-00`
    writeFileSync(registryBak, '{"backup":true}')
    writeFileSync(dbBak, 'backup-db')

    const logs: string[] = []
    restoreIndex(tmpDir, {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    expect(logs.some(l => l.includes('Restored REGISTRY.json'))).toBe(true)
    expect(readFileSync(registryPath, 'utf-8')).toContain('backup')
    expect(readFileSync(dbPath, 'utf-8')).toContain('backup-db')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('B3: no backup → error + exit(1)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-restore-'))

    const errors: string[] = []
    let exitCode: number | undefined
    try {
      restoreIndex(tmpDir, {
        log: () => {},
        error: (msg) => errors.push(String(msg)),
        exit: (code) => { exitCode = code; throw new Error(`EXIT:${code}`) },
      })
    } catch {
      // expected
    }

    expect(exitCode).toBe(1)
    expect(errors.some(e => e.includes('No backup'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── runRefreshPlan / runRefreshExecute ─────────────────────

describe('runRefreshPlan', () => {
  it('R1: empty pool → plan with 0 items', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-refresh-'))
    const poolDir = join(tmpDir, 'pool')
    mkdirSync(poolDir, { recursive: true })

    const logs: string[] = []
    await runRefreshPlan(['--pool', poolDir], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    const output = logs.join('\n')
    expect(output).toContain('Found 0 repo(s)')
    expect(output).toContain('Refresh plan written')

    // Verify plan file was written
    const planPath = join(poolDir, '.lythoskill-curator', 'refresh-plan.md')
    expect(existsSync(planPath)).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('R2: pool with git repo → plan includes repo', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-refresh-'))
    const poolDir = join(tmpDir, 'pool')
    const repoDir = join(poolDir, 'github.com', 'test', 'repo')
    mkdirSync(repoDir, { recursive: true })

    // Init git repo
    const { execSync } = await import('node:child_process')
    execSync('git init', { cwd: repoDir })
    execSync('git config user.email "test@test.com"', { cwd: repoDir })
    execSync('git config user.name "Test"', { cwd: repoDir })
    writeFileSync(join(repoDir, 'SKILL.md'), '---\nname: test-skill\n---\n')
    execSync('git add .', { cwd: repoDir })
    execSync('git commit -m "init"', { cwd: repoDir })

    const logs: string[] = []
    await runRefreshPlan(['--pool', poolDir], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    const output = logs.join('\n')
    expect(output).toContain('Found 1 repo(s)')
    expect(output).toContain('github.com/test/repo')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('R3: uses HEAD..@{upstream} (two-dot) not HEAD...@{upstream} (three-dot)', async () => {
    // This test verifies the git range syntax is correct.
    // The two-dot range counts commits in upstream not in HEAD.
    // The three-dot range would also count commits in HEAD not in upstream,
    // giving an inflated "behind" count when local commits exist.
    // We verify by checking safeGit calls use the correct syntax.
    const cliSource = readFileSync(join(__dirname, 'cli.ts'), 'utf-8')
    // Find all safeGit calls and verify they use two-dot range
    const safeGitCalls = [...cliSource.matchAll(/safeGit\(\[([^\]]+)\]/g)]
    const revListCalls = safeGitCalls.filter(m => m[1].includes('rev-list'))
    expect(revListCalls.length).toBeGreaterThan(0)
    for (const call of revListCalls) {
      expect(call[1]).toContain('"HEAD..@{upstream}"')
      expect(call[1]).not.toContain('"HEAD...@{upstream}"')
    }
  })
})

describe('runRefreshExecute', () => {
  it('R4: no plan file → error + exit(1)', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-refresh-'))
    const poolDir = join(tmpDir, 'pool')
    mkdirSync(poolDir, { recursive: true })

    const errors: string[] = []
    let exitCode: number | undefined
    try {
      await runRefreshExecute(['--pool', poolDir], {
        log: () => {},
        error: (msg) => errors.push(String(msg)),
        exit: (code) => { exitCode = code; throw new Error(`EXIT:${code}`) },
      })
    } catch {
      // expected
    }

    expect(exitCode).toBe(1)
    expect(errors.some(e => e.includes('No refresh plan'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('R5: all up to date → success message', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-refresh-'))
    const poolDir = join(tmpDir, 'pool')
    const repoDir = join(poolDir, 'github.com', 'test', 'repo')
    mkdirSync(repoDir, { recursive: true })

    // Init git repo
    const { execSync } = await import('node:child_process')
    execSync('git init', { cwd: repoDir })
    execSync('git config user.email "test@test.com"', { cwd: repoDir })
    execSync('git config user.name "Test"', { cwd: repoDir })
    writeFileSync(join(repoDir, 'SKILL.md'), '---\nname: test-skill\n---\n')
    execSync('git add .', { cwd: repoDir })
    execSync('git commit -m "init"', { cwd: repoDir })

    // Write a plan file (simulate refresh-plan output)
    const metaDir = join(poolDir, '.lythoskill-curator')
    mkdirSync(metaDir, { recursive: true })
    writeFileSync(join(metaDir, 'refresh-plan.md'), '# Curator Refresh Plan\n\n- [ ] github.com/test/repo (unchecked)\n')

    const logs: string[] = []
    await runRefreshExecute(['--pool', poolDir], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    const output = logs.join('\n')
    expect(output).toContain('All repos up to date')

    rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── printHelp ────────────────────────────────────────────────

describe('printHelp', () => {
  it('H1: help output contains key commands', () => {
    const logs: string[] = []
    let exitCode: number | undefined
    try {
      printHelp({
        log: (msg) => logs.push(String(msg)),
        error: () => {},
        exit: (code) => { exitCode = code; throw new Error(`EXIT:${code}`) },
      })
    } catch {
      // expected: io.exit(0) throws EXIT:0
    }

    const output = logs.join('\n')
    expect(output).toContain('add')
    expect(output).toContain('tag')
    expect(output).toContain('query')
    expect(output).toContain('audit')
    expect(output).toContain('find')
    expect(exitCode).toBe(0)
  })
})

// ── runCurator arg validation (TASK-20260827131734103) ───────
// Fail-closed: unknown first arg must not be consumed as a pool path
// (previously: "Indexed 0 skills", exit 0, garbage <arg>/.lythoskill-curator/).

describe('runCurator arg validation', () => {
  const cliPath = join(__dirname, 'cli.ts')

  it('V1: unknown arg in temp cwd → non-zero exit, loud error, no garbage dir', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-validate-'))
    const res = spawnSync(process.execPath, [cliPath, 'frobnicate'], { cwd: tmpDir, encoding: 'utf-8' })

    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain('Unknown command or nonexistent pool path')
    expect(res.stderr).toContain('frobnicate')
    expect(res.stderr).toContain('What to do')
    expect(existsSync(join(tmpDir, 'frobnicate'))).toBe(false)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('V2: nonexistent absolute path → exit(1) + error, nothing created', () => {
    const errors: string[] = []
    const code = catchExit(() => runCurator(['/nonexistent/path/to/pool'], {
      log: () => {},
      error: (msg) => errors.push(String(msg)),
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    }))

    expect(code).toBe(1)
    expect(errors.some(e => e.includes('nonexistent pool path'))).toBe(true)
    expect(errors.some(e => e.includes('/nonexistent/path/to/pool'))).toBe(true)
    expect(existsSync('/nonexistent/path/to/pool')).toBe(false)
  })

  it('V3: "scan" literal → rejected with pointer, no scan/ dir created in cwd', () => {
    // R2 decision: `scan` is NOT an alias — scanning is the default action,
    // the positional form is the documented one. Reject with a pointer.
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-validate-'))
    const res = spawnSync(process.execPath, [cliPath, 'scan'], { cwd: tmpDir, encoding: 'utf-8' })

    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain('Unknown command: "scan"')
    expect(res.stderr).toContain('no `scan` subcommand')
    expect(existsSync(join(tmpDir, 'scan'))).toBe(false)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('V4: existing pool dir still scans (regression)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-validate-'))
    const poolDir = join(tmpDir, 'pool')
    createSkillDir(poolDir, 'ok-skill', 'name: ok-skill\ndescription: Works.\n')

    const logs: string[] = []
    runCurator([poolDir], {
      log: (msg) => logs.push(String(msg)),
      error: () => {},
      exit: (code) => { throw new Error(`EXIT:${code}`) },
    })

    expect(logs.some(l => l.includes('Indexed 1 skills'))).toBe(true)
    expect(existsSync(join(poolDir, '.lythoskill-curator', 'REGISTRY.json'))).toBe(true)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('V5: template placeholder frontmatter parses quietly (R3, no stderr stack trace)', () => {
    // {{ PACKAGE_VERSION }} in our own skills' frontmatter parses as a YAML
    // collection key; yaml@2 emits a process.emitWarning with full stack trace.
    const tmpDir = mkdtempSync(join(tmpdir(), 'curator-validate-'))
    const dir = createSkillDir(tmpDir, 'tpl-version', [
      'name: tpl-version',
      'description: Has a template placeholder.',
      'version: {{ PACKAGE_VERSION }}',
      '',
    ].join('\n'))

    const warnings: string[] = []
    const origEmitWarning = process.emitWarning
    process.emitWarning = ((warning: any) => { warnings.push(String(warning)) }) as typeof process.emitWarning
    let meta: ReturnType<typeof scanSkill>
    try {
      meta = scanSkill(dir)
    } finally {
      process.emitWarning = origEmitWarning
    }

    expect(meta).not.toBeNull()
    expect(meta!.status).toBe('parsed')
    expect(warnings.some(w => w.includes('stringified'))).toBe(false)

    rmSync(tmpDir, { recursive: true, force: true })
  })
})
