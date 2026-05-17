/**
 * preflight.test.ts — TDD tests for arena agent-run pre-flight pure functions
 *
 * Coverage targets:
 *   parseDeckSkills      — all TOML formats, edge cases
 *   checkSkillExistence  — cold pool hit/miss, path resolution
 *   validateLinkResult   — exit codes, error formatting
 *   buildCopyPlan        — skip set, path mapping
 *   resolveColdPoolDir   — tilde expansion, fallback
 *   formatSkillWarnings  — warning string generation
 */

import { describe, test, expect } from 'bun:test'
import {
  parseDeckSkills,
  checkSkillExistence,
  validateLinkResult,
  buildCopyPlan,
  resolveColdPoolDir,
  formatSkillWarnings,
} from './preflight'

// ═══════════════════════════════════════════════════════════════════════════
// parseDeckSkills
// ═══════════════════════════════════════════════════════════════════════════

describe('parseDeckSkills', () => {

  test('empty deck → empty array', () => {
    expect(parseDeckSkills({})).toEqual([])
  })

  test('deck with no skill sections → empty array', () => {
    expect(parseDeckSkills({ deck: { max_cards: 10 } })).toEqual([])
  })

  test('inline-table format: single tool skill with path', () => {
    const parsed = {
      tool: {
        skills: {
          pdf: { path: 'github.com/anthropics/skills/skills/pdf' }
        }
      }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'pdf', path: 'github.com/anthropics/skills/skills/pdf', section: 'tool' }
    ])
  })

  test('inline-table format: multiple skills', () => {
    const parsed = {
      tool: {
        skills: {
          pdf: { path: 'github.com/anthropics/skills/skills/pdf' },
          docx: { path: 'github.com/anthropics/skills/skills/docx' },
        }
      }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'pdf', path: 'github.com/anthropics/skills/skills/pdf', section: 'tool' },
      { name: 'docx', path: 'github.com/anthropics/skills/skills/docx', section: 'tool' },
    ])
  })

  test('array format: skills = ["a", "b"]', () => {
    const parsed = {
      tool: {
        skills: ['web-search', 'docx']
      }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'web-search', path: null, section: 'tool' },
      { name: 'docx', path: null, section: 'tool' },
    ])
  })

  test('innate section parsed separately', () => {
    const parsed = {
      innate: {
        skills: {
          deck: { path: 'github.com/lythos-labs/lythoskill/skills/lythoskill-deck' }
        }
      },
      tool: {
        skills: {
          pdf: { path: 'github.com/anthropics/skills/skills/pdf' }
        }
      }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'deck', path: 'github.com/lythos-labs/lythoskill/skills/lythoskill-deck', section: 'innate' },
      { name: 'pdf', path: 'github.com/anthropics/skills/skills/pdf', section: 'tool' },
    ])
  })

  test('transient section parsed', () => {
    const parsed = {
      transient: {
        skills: {
          experiment: { path: 'localhost/my-experiment' }
        }
      }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'experiment', path: 'localhost/my-experiment', section: 'transient' }
    ])
  })

  test('object entry without path → path=null', () => {
    const parsed = {
      tool: {
        skills: {
          bare: {}  // no path field
        }
      }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'bare', path: null, section: 'tool' }
    ])
  })

  test('object entry with non-string path → path=null', () => {
    const parsed = {
      tool: {
        skills: {
          weird: { path: 42 }  // number, not string
        }
      }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'weird', path: null, section: 'tool' }
    ])
  })

  test('array entry that is not a string → skipped', () => {
    const parsed = {
      tool: { skills: ['valid', 123, null, 'also-valid'] }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'valid', path: null, section: 'tool' },
      { name: 'also-valid', path: null, section: 'tool' },
    ])
  })

  test('all three sections populated → ordered innate, tool, transient', () => {
    const parsed = {
      innate: { skills: { a: { path: '/a' } } },
      tool: { skills: { b: { path: '/b' } } },
      transient: { skills: { c: { path: '/c' } } },
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'a', path: '/a', section: 'innate' },
      { name: 'b', path: '/b', section: 'tool' },
      { name: 'c', path: '/c', section: 'transient' },
    ])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// checkSkillExistence
// ═══════════════════════════════════════════════════════════════════════════

describe('checkSkillExistence', () => {

  test('empty skills → empty array', () => {
    const exists = (_: string) => true
    expect(checkSkillExistence([], '/cold', exists)).toEqual([])
  })

  test('skill with explicit path → resolves <coldPool>/<path>/SKILL.md', () => {
    const exists = (p: string) => p === '/cold/github.com/owner/repo/skills/my-skill/SKILL.md'
    const skills = [{ name: 'my-skill', path: 'github.com/owner/repo/skills/my-skill', section: 'tool' }]
    const result = checkSkillExistence(skills, '/cold', exists)
    expect(result).toEqual([
      { name: 'my-skill', expectedPath: '/cold/github.com/owner/repo/skills/my-skill/SKILL.md', found: true, section: 'tool' }
    ])
  })

  test('skill without path (array format) → resolves <coldPool>/<name>/SKILL.md', () => {
    const exists = (p: string) => p === '/cold/web-search/SKILL.md'
    const skills = [{ name: 'web-search', path: null, section: 'tool' }]
    const result = checkSkillExistence(skills, '/cold', exists)
    expect(result).toEqual([
      { name: 'web-search', expectedPath: '/cold/web-search/SKILL.md', found: true, section: 'tool' }
    ])
  })

  test('HTTP path → uses name as fallback for path resolution', () => {
    const exists = (p: string) => p === '/cold/my-skill/SKILL.md'
    const skills = [{ name: 'my-skill', path: 'https://example.com/deck.toml', section: 'tool' }]
    const result = checkSkillExistence(skills, '/cold', exists)
    expect(result).toEqual([
      { name: 'my-skill', expectedPath: '/cold/my-skill/SKILL.md', found: true, section: 'tool' }
    ])
  })

  test('all found → all found=true', () => {
    const exists = (_: string) => true
    const skills = [
      { name: 'a', path: '/a', section: 'tool' },
      { name: 'b', path: '/b', section: 'tool' },
    ]
    expect(checkSkillExistence(skills, '/cold', exists)).toEqual([
      { name: 'a', expectedPath: '/cold//a/SKILL.md', found: true, section: 'tool' },
      { name: 'b', expectedPath: '/cold//b/SKILL.md', found: true, section: 'tool' },
    ])
  })

  test('some missing → mixed found/not-found', () => {
    const exists = (p: string) => p.includes('a')
    const skills = [
      { name: 'a', path: '/a', section: 'tool' },
      { name: 'b', path: '/b', section: 'tool' },
    ]
    expect(checkSkillExistence(skills, '/cold', exists)).toEqual([
      { name: 'a', expectedPath: '/cold//a/SKILL.md', found: true, section: 'tool' },
      { name: 'b', expectedPath: '/cold//b/SKILL.md', found: false, section: 'tool' },
    ])
  })

  test('different coldPoolDir → different expectedPath prefix', () => {
    const exists = (_: string) => true
    const skills = [{ name: 'x', path: 'github.com/x', section: 'tool' }]
    const a = checkSkillExistence(skills, '/home/user/.agents/skill-repos', exists)
    const b = checkSkillExistence(skills, '/opt/cold', exists)
    expect(a[0].expectedPath).toStartWith('/home/user/.agents/skill-repos/')
    expect(b[0].expectedPath).toStartWith('/opt/cold/')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// validateLinkResult
// ═══════════════════════════════════════════════════════════════════════════

describe('validateLinkResult', () => {

  test('exitCode 0 → ok', () => {
    expect(validateLinkResult(0, '')).toEqual({ ok: true })
  })

  test('exitCode 0 with stderr → still ok (stderr is not always errors)', () => {
    expect(validateLinkResult(0, 'some warning output')).toEqual({ ok: true })
  })

  test('exitCode 1 → not ok, error contains snippet', () => {
    const result = validateLinkResult(1, 'something went wrong')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('exit 1')
    expect(result.error).toContain('something went wrong')
  })

  test('exitCode null → not ok (null !== 0)', () => {
    const result = validateLinkResult(null, 'process killed')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('exit null')
  })

  test('stderr truncated to 300 chars in error message', () => {
    const longStderr = 'x'.repeat(500)
    const result = validateLinkResult(1, longStderr)
    expect(result.ok).toBe(false)
    expect(result.error!.length).toBeLessThan(350) // "Deck link failed (exit 1): " + 300 chars
  })

  test('exitCode 0, empty stderr → ok with no error field', () => {
    const result = validateLinkResult(0, '')
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// buildCopyPlan
// ═══════════════════════════════════════════════════════════════════════════

describe('buildCopyPlan', () => {

  test('empty entries → empty plan', () => {
    expect(buildCopyPlan('/work', '/out', [], new Set())).toEqual([])
  })

  test('all skipped → empty plan', () => {
    const skip = new Set(['.claude', 'skill-deck.toml'])
    expect(buildCopyPlan('/work', '/out', ['.claude', 'skill-deck.toml'], skip)).toEqual([])
  })

  test('normal entries → mapped to outDir', () => {
    const skip = new Set<string>()
    expect(buildCopyPlan('/work', '/out', ['output.md', 'report.docx'], skip)).toEqual([
      { src: '/work/output.md', dest: '/out/output.md', name: 'output.md' },
      { src: '/work/report.docx', dest: '/out/report.docx', name: 'report.docx' },
    ])
  })

  test('mixed skip and non-skip → only non-skipped', () => {
    const skip = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock'])
    const entries = ['.claude', 'output.md', 'skill-deck.toml', 'report.docx', 'skill-deck.lock']
    expect(buildCopyPlan('/work', '/out', entries, skip)).toEqual([
      { src: '/work/output.md', dest: '/out/output.md', name: 'output.md' },
      { src: '/work/report.docx', dest: '/out/report.docx', name: 'report.docx' },
    ])
  })

  test('preserves entry order', () => {
    const skip = new Set<string>()
    const entries = ['c', 'a', 'b']
    expect(buildCopyPlan('/w', '/o', entries, skip).map(e => e.name)).toEqual(['c', 'a', 'b'])
  })

  test('nested paths work (agent-produced subdirectories)', () => {
    const skip = new Set<string>()
    expect(buildCopyPlan('/work', '/out', ['subdir/output.pdf'], skip)).toEqual([
      { src: '/work/subdir/output.pdf', dest: '/out/subdir/output.pdf', name: 'subdir/output.pdf' },
    ])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// resolveColdPoolDir
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveColdPoolDir', () => {

  test('explicit absolute path → returned as-is', () => {
    expect(resolveColdPoolDir('/opt/cold', '/home/user', '/fallback')).toBe('/opt/cold')
  })

  test('explicit relative path → returned as-is', () => {
    expect(resolveColdPoolDir('my-cold-pool', '/home/user', '/fallback')).toBe('my-cold-pool')
  })

  test('tilde path → expanded with homeDir', () => {
    expect(resolveColdPoolDir('~/.agents/skill-repos', '/home/user', '/fallback'))
      .toBe('/home/user/.agents/skill-repos')
  })

  test('tilde at start only → expanded; tilde elsewhere not expanded', () => {
    expect(resolveColdPoolDir('path/with~/tilde', '/home/user', '/fallback'))
      .toBe('path/with~/tilde')
  })

  test('undefined → uses fallback', () => {
    expect(resolveColdPoolDir(undefined, '/home/user', '/default/cold'))
      .toBe('/default/cold')
  })

  test('empty string → uses fallback (|| operator)', () => {
    expect(resolveColdPoolDir('', '/home/user', '/default/cold'))
      .toBe('/default/cold')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// formatSkillWarnings
// ═══════════════════════════════════════════════════════════════════════════

describe('formatSkillWarnings', () => {

  test('all found → empty array', () => {
    const checks = [
      { name: 'a', expectedPath: '/p/a/SKILL.md', found: true, section: 'tool' },
      { name: 'b', expectedPath: '/p/b/SKILL.md', found: true, section: 'tool' },
    ]
    expect(formatSkillWarnings(checks)).toEqual([])
  })

  test('some missing → one warning per missing skill', () => {
    const checks = [
      { name: 'pdf', expectedPath: '/cold/pdf/SKILL.md', found: false, section: 'tool' },
      { name: 'docx', expectedPath: '/cold/docx/SKILL.md', found: true, section: 'tool' },
    ]
    expect(formatSkillWarnings(checks)).toEqual([
      'Skill "pdf" declared in deck [tool] but SKILL.md not found at: /cold/pdf/SKILL.md',
    ])
  })

  test('all missing → warning for each', () => {
    const checks = [
      { name: 'a', expectedPath: '/p/a/SKILL.md', found: false, section: 'innate' },
      { name: 'b', expectedPath: '/p/b/SKILL.md', found: false, section: 'tool' },
    ]
    expect(formatSkillWarnings(checks)).toHaveLength(2)
  })

  test('empty array → empty array', () => {
    expect(formatSkillWarnings([])).toEqual([])
  })

  test('section name appears in warning string', () => {
    const checks = [
      { name: 'x', expectedPath: '/p/x', found: false, section: 'transient' },
    ]
    expect(formatSkillWarnings(checks)[0]).toContain('[transient]')
  })
})


// ═══════════════════════════════════════════════════════════════════════════
// buildArchiveSidePlan
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// buildArchiveSidePlan
// ═══════════════════════════════════════════════════════════════════════════

import { buildArchiveSidePlan } from './preflight'
import { join as pathJoin } from 'node:path'

const TMP = '/tmp/arena-test'

describe('buildArchiveSidePlan', () => {

  test('default: sides=["."] maps to fromDir', () => {
    const plan = buildArchiveSidePlan(TMP, ['.'], _p => true)
    expect(plan).toEqual([
      { side: '.', sourceDir: TMP, found: true },
    ])
  })

  test('single side, subdirectory exists → source = fromDir/side', () => {
    const exists = (p: string) => p === pathJoin(TMP, 'side-a')
    const plan = buildArchiveSidePlan(TMP, ['side-a'], exists)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: pathJoin(TMP, 'side-a'), found: true },
    ])
  })

  test('single side, subdirectory MISSING → fallback to fromDir root', () => {
    const plan = buildArchiveSidePlan(TMP, ['side-a'], _p => false)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: TMP, found: true },
    ])
  })

  test('multi side, all subdirectories exist', () => {
    const exists = (p: string) =>
      p === pathJoin(TMP, 'side-a') || p === pathJoin(TMP, 'side-b')
    const plan = buildArchiveSidePlan(TMP, ['side-a', 'side-b'], exists)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: pathJoin(TMP, 'side-a'), found: true },
      { side: 'side-b', sourceDir: pathJoin(TMP, 'side-b'), found: true },
    ])
  })

  test('multi side, one missing → found=false (caller handles warn+skip)', () => {
    const exists = (p: string) => p === pathJoin(TMP, 'side-a')
    const plan = buildArchiveSidePlan(TMP, ['side-a', 'side-b'], exists)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: pathJoin(TMP, 'side-a'), found: true },
      { side: 'side-b', sourceDir: pathJoin(TMP, 'side-b'), found: false },
    ])
  })

  test('"." side does NOT trigger fallback when missing (found=false)', () => {
    const plan = buildArchiveSidePlan(TMP, ['.'], _p => false)
    expect(plan).toEqual([
      { side: '.', sourceDir: TMP, found: false },
    ])
  })

  test('empty sides array → empty plan', () => {
    const plan = buildArchiveSidePlan(TMP, [], _p => true)
    expect(plan).toEqual([])
  })

  test('three sides, middle missing', () => {
    const exists = (p: string) =>
      p === pathJoin(TMP, 'side-a') || p === pathJoin(TMP, 'side-c')
    const plan = buildArchiveSidePlan(TMP, ['side-a', 'side-b', 'side-c'], exists)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: pathJoin(TMP, 'side-a'), found: true },
      { side: 'side-b', sourceDir: pathJoin(TMP, 'side-b'), found: false },
      { side: 'side-c', sourceDir: pathJoin(TMP, 'side-c'), found: true },
    ])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// buildPreparePlan
// ═══════════════════════════════════════════════════════════════════════════

import { buildPreparePlan } from './preflight'

const DECK_ONE_SKILL = `
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"

[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"
`

const DECK_EMPTY = `
[deck]
max_cards = 5
`

const DECK_TWO_SKILLS = `
[deck]
max_cards = 10

[innate.skills.deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"
`

describe('buildPreparePlan', () => {

  test('single skill deck → plan with 1 skill, hasSkills=true', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/test-deck.toml',
      deckContent: DECK_ONE_SKILL,
      workDir: '/tmp/arena-test',
      skillCount: 0,
    })
    expect(plan.skills).toHaveLength(1)
    expect(plan.skills[0].name).toBe('pdf')
    expect(plan.skills[0].section).toBe('tool')
    expect(plan.hasSkills).toBe(true)
    expect(plan.workDir).toBe('/tmp/arena-test')
    expect(plan.deckPath).toBe('/tmp/test-deck.toml')
  })

  test('empty deck → skills=[], hasSkills=false', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/empty.toml',
      deckContent: DECK_EMPTY,
      workDir: '/tmp/arena-empty',
      skillCount: 0,
    })
    expect(plan.skills).toEqual([])
    expect(plan.hasSkills).toBe(false)
  })

  test('two skills (innate + tool) → both parsed with correct sections', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/two.toml',
      deckContent: DECK_TWO_SKILLS,
      workDir: '/tmp/arena-two',
      skillCount: 0,
    })
    expect(plan.skills).toHaveLength(2)
    expect(plan.skills[0]).toEqual({ name: 'deck', path: 'github.com/lythos-labs/lythoskill/skills/lythoskill-deck', section: 'innate' })
    expect(plan.skills[1]).toEqual({ name: 'pdf', path: 'github.com/anthropics/skills/skills/pdf', section: 'tool' })
    expect(plan.hasSkills).toBe(true)
  })

  test('AGENTS.md contains mandatory sections', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/d.toml',
      deckContent: DECK_ONE_SKILL,
      workDir: '/tmp/arena-md',
      skillCount: 0,
    })
    expect(plan.agentsMd).toContain('Arena Test Environment')
    expect(plan.agentsMd).toContain('Setup Order')
    expect(plan.agentsMd).toContain('decision-log.jsonl')
    expect(plan.agentsMd).toContain('skill-deck.toml')
  })

  test('invalid TOML → skills=[], hasSkills=false (no crash)', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/bad.toml',
      deckContent: 'this is not toml {{{',
      workDir: '/tmp/arena-bad',
      skillCount: 0,
    })
    expect(plan.skills).toEqual([])
    expect(plan.hasSkills).toBe(false)
  })

  test('deckContent is preserved in plan', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/d.toml',
      deckContent: DECK_ONE_SKILL,
      workDir: '/tmp/arena-preserve',
      skillCount: 0,
    })
    expect(plan.deckContent).toBe(DECK_ONE_SKILL)
  })
})
