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

import { describe, it, expect } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseDeckSkills,
  checkSkillExistence,
  validateLinkResult,
  buildCopyPlan,
  resolveColdPoolDir,
  formatSkillWarnings,
  decisionLogName,
  isDecisionLogName,
  mergeDecisionLogs,
  LEGACY_DECISION_LOG,
  type DecisionLogSource,
} from './preflight'

// ═══════════════════════════════════════════════════════════════════════════
// parseDeckSkills
// ═══════════════════════════════════════════════════════════════════════════

describe('parseDeckSkills', () => {

  it('empty deck → empty array', () => {
    expect(parseDeckSkills({})).toEqual([])
  })

  it('deck with no skill sections → empty array', () => {
    expect(parseDeckSkills({ deck: { max_cards: 10 } })).toEqual([])
  })

  it('inline-table format: single tool skill with path', () => {
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

  it('inline-table format: multiple skills', () => {
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

  it('array format: skills = ["a", "b"]', () => {
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

  it('innate section parsed separately', () => {
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

  it('transient section parsed', () => {
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

  it('object entry without path → path=null', () => {
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

  it('object entry with non-string path → path=null', () => {
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

  it('array entry that is not a string → skipped', () => {
    const parsed = {
      tool: { skills: ['valid', 123, null, 'also-valid'] }
    }
    expect(parseDeckSkills(parsed)).toEqual([
      { name: 'valid', path: null, section: 'tool' },
      { name: 'also-valid', path: null, section: 'tool' },
    ])
  })

  it('all three sections populated → ordered innate, tool, transient', () => {
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

  it('empty skills → empty array', () => {
    const exists = (_: string) => true
    expect(checkSkillExistence([], '/cold', exists)).toEqual([])
  })

  it('skill with explicit path → resolves <coldPool>/<path>/SKILL.md', () => {
    const exists = (p: string) => p === '/cold/github.com/owner/repo/skills/my-skill/SKILL.md'
    const skills = [{ name: 'my-skill', path: 'github.com/owner/repo/skills/my-skill', section: 'tool' }]
    const result = checkSkillExistence(skills, '/cold', exists)
    expect(result).toEqual([
      { name: 'my-skill', expectedPath: '/cold/github.com/owner/repo/skills/my-skill/SKILL.md', found: true, section: 'tool' }
    ])
  })

  it('skill without path (array format) → resolves <coldPool>/<name>/SKILL.md', () => {
    const exists = (p: string) => p === '/cold/web-search/SKILL.md'
    const skills = [{ name: 'web-search', path: null, section: 'tool' }]
    const result = checkSkillExistence(skills, '/cold', exists)
    expect(result).toEqual([
      { name: 'web-search', expectedPath: '/cold/web-search/SKILL.md', found: true, section: 'tool' }
    ])
  })

  it('HTTP path → uses name as fallback for path resolution', () => {
    const exists = (p: string) => p === '/cold/my-skill/SKILL.md'
    const skills = [{ name: 'my-skill', path: 'https://example.com/deck.toml', section: 'tool' }]
    const result = checkSkillExistence(skills, '/cold', exists)
    expect(result).toEqual([
      { name: 'my-skill', expectedPath: '/cold/my-skill/SKILL.md', found: true, section: 'tool' }
    ])
  })

  it('all found → all found=true', () => {
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

  it('some missing → mixed found/not-found', () => {
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

  it('different coldPoolDir → different expectedPath prefix', () => {
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

  it('exitCode 0 → ok', () => {
    expect(validateLinkResult(0, '')).toEqual({ ok: true })
  })

  it('exitCode 0 with stderr → still ok (stderr is not always errors)', () => {
    expect(validateLinkResult(0, 'some warning output')).toEqual({ ok: true })
  })

  it('exitCode 1 → not ok, error contains snippet', () => {
    const result = validateLinkResult(1, 'something went wrong')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('exit 1')
    expect(result.error).toContain('something went wrong')
  })

  it('exitCode null → not ok (null !== 0)', () => {
    const result = validateLinkResult(null, 'process killed')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('exit null')
  })

  it('stderr truncated to 300 chars in error message', () => {
    const longStderr = 'x'.repeat(500)
    const result = validateLinkResult(1, longStderr)
    expect(result.ok).toBe(false)
    expect(result.error!.length).toBeLessThan(350) // "Deck link failed (exit 1): " + 300 chars
  })

  it('exitCode 0, empty stderr → ok with no error field', () => {
    const result = validateLinkResult(0, '')
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// buildCopyPlan
// ═══════════════════════════════════════════════════════════════════════════

describe('buildCopyPlan', () => {

  it('empty entries → empty plan', () => {
    expect(buildCopyPlan('/work', '/out', [], new Set())).toEqual([])
  })

  it('all skipped → empty plan', () => {
    const skip = new Set(['.claude', 'skill-deck.toml'])
    expect(buildCopyPlan('/work', '/out', ['.claude', 'skill-deck.toml'], skip)).toEqual([])
  })

  it('normal entries → mapped to outDir', () => {
    const skip = new Set<string>()
    expect(buildCopyPlan('/work', '/out', ['output.md', 'report.docx'], skip)).toEqual([
      { src: '/work/output.md', dest: '/out/output.md', name: 'output.md' },
      { src: '/work/report.docx', dest: '/out/report.docx', name: 'report.docx' },
    ])
  })

  it('mixed skip and non-skip → only non-skipped', () => {
    const skip = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock'])
    const entries = ['.claude', 'output.md', 'skill-deck.toml', 'report.docx', 'skill-deck.lock']
    expect(buildCopyPlan('/work', '/out', entries, skip)).toEqual([
      { src: '/work/output.md', dest: '/out/output.md', name: 'output.md' },
      { src: '/work/report.docx', dest: '/out/report.docx', name: 'report.docx' },
    ])
  })

  it('preserves entry order', () => {
    const skip = new Set<string>()
    const entries = ['c', 'a', 'b']
    expect(buildCopyPlan('/w', '/o', entries, skip).map(e => e.name)).toEqual(['c', 'a', 'b'])
  })

  it('nested paths work (agent-produced subdirectories)', () => {
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

  it('explicit absolute path → returned as-is', () => {
    expect(resolveColdPoolDir('/opt/cold', '/home/user', '/fallback')).toBe('/opt/cold')
  })

  it('explicit relative path → returned as-is', () => {
    expect(resolveColdPoolDir('my-cold-pool', '/home/user', '/fallback')).toBe('my-cold-pool')
  })

  it('tilde path → expanded with homeDir', () => {
    expect(resolveColdPoolDir('~/.agents/skill-repos', '/home/user', '/fallback'))
      .toBe('/home/user/.agents/skill-repos')
  })

  it('tilde at start only → expanded; tilde elsewhere not expanded', () => {
    expect(resolveColdPoolDir('path/with~/tilde', '/home/user', '/fallback'))
      .toBe('path/with~/tilde')
  })

  it('undefined → uses fallback', () => {
    expect(resolveColdPoolDir(undefined, '/home/user', '/default/cold'))
      .toBe('/default/cold')
  })

  it('empty string → uses fallback (|| operator)', () => {
    expect(resolveColdPoolDir('', '/home/user', '/default/cold'))
      .toBe('/default/cold')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// formatSkillWarnings
// ═══════════════════════════════════════════════════════════════════════════

describe('formatSkillWarnings', () => {

  it('all found → empty array', () => {
    const checks = [
      { name: 'a', expectedPath: '/p/a/SKILL.md', found: true, section: 'tool' },
      { name: 'b', expectedPath: '/p/b/SKILL.md', found: true, section: 'tool' },
    ]
    expect(formatSkillWarnings(checks)).toEqual([])
  })

  it('some missing → one warning per missing skill', () => {
    const checks = [
      { name: 'pdf', expectedPath: '/cold/pdf/SKILL.md', found: false, section: 'tool' },
      { name: 'docx', expectedPath: '/cold/docx/SKILL.md', found: true, section: 'tool' },
    ]
    expect(formatSkillWarnings(checks)).toEqual([
      'Skill "pdf" declared in deck [tool] but SKILL.md not found at: /cold/pdf/SKILL.md',
    ])
  })

  it('all missing → warning for each', () => {
    const checks = [
      { name: 'a', expectedPath: '/p/a/SKILL.md', found: false, section: 'innate' },
      { name: 'b', expectedPath: '/p/b/SKILL.md', found: false, section: 'tool' },
    ]
    expect(formatSkillWarnings(checks)).toHaveLength(2)
  })

  it('empty array → empty array', () => {
    expect(formatSkillWarnings([])).toEqual([])
  })

  it('section name appears in warning string', () => {
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

  it('default: sides=["."] maps to fromDir', () => {
    const plan = buildArchiveSidePlan(TMP, ['.'], _p => true)
    expect(plan).toEqual([
      { side: '.', sourceDir: TMP, found: true },
    ])
  })

  it('single side, subdirectory exists → source = fromDir/side', () => {
    const exists = (p: string) => p === pathJoin(TMP, 'side-a')
    const plan = buildArchiveSidePlan(TMP, ['side-a'], exists)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: pathJoin(TMP, 'side-a'), found: true },
    ])
  })

  it('single side, subdirectory MISSING → fallback to fromDir root', () => {
    const plan = buildArchiveSidePlan(TMP, ['side-a'], _p => false)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: TMP, found: true },
    ])
  })

  it('multi side, all subdirectories exist', () => {
    const exists = (p: string) =>
      p === pathJoin(TMP, 'side-a') || p === pathJoin(TMP, 'side-b')
    const plan = buildArchiveSidePlan(TMP, ['side-a', 'side-b'], exists)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: pathJoin(TMP, 'side-a'), found: true },
      { side: 'side-b', sourceDir: pathJoin(TMP, 'side-b'), found: true },
    ])
  })

  it('multi side, one missing → found=false (caller handles warn+skip)', () => {
    const exists = (p: string) => p === pathJoin(TMP, 'side-a')
    const plan = buildArchiveSidePlan(TMP, ['side-a', 'side-b'], exists)
    expect(plan).toEqual([
      { side: 'side-a', sourceDir: pathJoin(TMP, 'side-a'), found: true },
      { side: 'side-b', sourceDir: pathJoin(TMP, 'side-b'), found: false },
    ])
  })

  it('"." side does NOT trigger fallback when missing (found=false)', () => {
    const plan = buildArchiveSidePlan(TMP, ['.'], _p => false)
    expect(plan).toEqual([
      { side: '.', sourceDir: TMP, found: false },
    ])
  })

  it('empty sides array → empty plan', () => {
    const plan = buildArchiveSidePlan(TMP, [], _p => true)
    expect(plan).toEqual([])
  })

  it('three sides, middle missing', () => {
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

  it('single skill deck → plan with 1 skill, hasSkills=true', () => {
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

  it('empty deck → skills=[], hasSkills=false', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/empty.toml',
      deckContent: DECK_EMPTY,
      workDir: '/tmp/arena-empty',
      skillCount: 0,
    })
    expect(plan.skills).toEqual([])
    expect(plan.hasSkills).toBe(false)
  })

  it('two skills (innate + tool) → both parsed with correct sections', () => {
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

  it('AGENTS.md contains mandatory sections', () => {
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

  it('invalid TOML → skills=[], hasSkills=false (no crash)', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/bad.toml',
      deckContent: 'this is not toml {{{',
      workDir: '/tmp/arena-bad',
      skillCount: 0,
    })
    expect(plan.skills).toEqual([])
    expect(plan.hasSkills).toBe(false)
  })

  it('deckContent is preserved in plan', () => {
    const plan = buildPreparePlan({
      deckPath: '/tmp/d.toml',
      deckContent: DECK_ONE_SKILL,
      workDir: '/tmp/arena-preserve',
      skillCount: 0,
    })
    expect(plan.deckContent).toBe(DECK_ONE_SKILL)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// parseDeckCombos + combo surfacing in AGENTS.md (F1/F2, TASK-20260909152255103)
// ═══════════════════════════════════════════════════════════════════════════

import { parseDeckCombos, buildAgentsMd } from './preflight'

const DECK_WITH_COMBOS = `
[deck]
max_cards = 10

[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"

[combo.promo]
prompt = "Pipeline: Position → Draft → Review."

[combo.research]
prompt = "Pipeline: Discover → Verify → Analyze."
`

describe('parseDeckCombos', () => {

  it('extracts combo names in declaration order', () => {
    const parsed = Bun.TOML.parse(DECK_WITH_COMBOS) as Record<string, any>
    expect(parseDeckCombos(parsed)).toEqual(['promo', 'research'])
  })

  it('no combo section → empty array', () => {
    const parsed = Bun.TOML.parse(DECK_ONE_SKILL) as Record<string, any>
    expect(parseDeckCombos(parsed)).toEqual([])
  })

  it('legacy bare [combo] prompt field → empty array (default combo, no named section)', () => {
    const parsed = Bun.TOML.parse('[combo]\nprompt = "do stuff"') as Record<string, any>
    expect(parseDeckCombos(parsed)).toEqual([])
  })
})

describe('buildAgentsMd combo surfacing (F1)', () => {

  it('deck with combos → AGENTS.md lists them under "Read These First"', () => {
    const parsed = Bun.TOML.parse(DECK_WITH_COMBOS) as Record<string, any>
    const md = buildAgentsMd({ mode: 'single', combos: parseDeckCombos(parsed) })
    expect(md).toContain('## Combos — Read These First')
    expect(md).toContain('- `promo`')
    expect(md).toContain('- `research`')
    expect(md.indexOf('Combos — Read These First')).toBeLessThan(md.indexOf('## Setup Order'))
  })

  it('combo consumer declared: agent reads/executes, CLI only parses (F2)', () => {
    const md = buildAgentsMd({ mode: 'single', combos: ['promo'] })
    expect(md).toContain('executed by YOU (the agent)')
    expect(md).toContain('the CLI only parses them; nothing runs them')
  })

  it('deck without combos → no combos section', () => {
    const md = buildAgentsMd({ mode: 'single' })
    expect(md).not.toContain('Combos')
  })
})

describe('buildAgentsMd vocabulary gloss (F3)', () => {

  it('glosses cold pool / working set / innate / tool / max_cards', () => {
    const md = buildAgentsMd({ mode: 'single' })
    expect(md).toContain('**cold pool**')
    expect(md).toContain('**working set**')
    expect(md).toContain('**innate**')
    expect(md).toContain('**tool**')
    expect(md).toContain('**max_cards**')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// decision logs — per-cell naming (TASK-20260909010121918)
//
// Defect: five cells per side shared one workdir and one mandated filename
// (`decision-log.jsonl`). Filename is a constant → shared path → last writer
// wins; the 2026-09-09 side-a log lost S3a/S4a/S5a entirely.
// ═══════════════════════════════════════════════════════════════════════════

describe('decisionLogName', () => {

  it('per-cell id → per-cell filename', () => {
    expect(decisionLogName('s1a')).toBe('decision-log-s1a.jsonl')
    expect(decisionLogName('claude-run-2')).toBe('decision-log-claude-run-2.jsonl')
  })

  it('two distinct cell ids never share a path', () => {
    expect(decisionLogName('s1a')).not.toBe(decisionLogName('s3a'))
  })

  it('no id → legacy single-cell name', () => {
    expect(decisionLogName()).toBe(LEGACY_DECISION_LOG)
    expect(decisionLogName('')).toBe(LEGACY_DECISION_LOG)
  })

  it('id cannot escape the workdir (no separators, no traversal, no dotfile)', () => {
    expect(decisionLogName('../evil')).toBe('decision-log-evil.jsonl')
    expect(decisionLogName('a/b')).toBe('decision-log-a-b.jsonl')
    expect(decisionLogName('claude run 1')).toBe('decision-log-claude-run-1.jsonl')
    for (const hostile of ['../evil', 'a/b', '..', './x', 'a\\b', '..\0']) {
      const name = decisionLogName(hostile)
      expect(name).not.toContain('/')
      expect(name).not.toContain('\\')
      expect(name.startsWith('.')).toBe(false)
      expect(isDecisionLogName(name)).toBe(true)
    }
  })

  it('separator-only id degrades to the legacy name, never to a bare prefix', () => {
    expect(decisionLogName('///')).toBe(LEGACY_DECISION_LOG)
  })
})

describe('isDecisionLogName', () => {

  it('accepts the legacy name and per-cell names', () => {
    expect(isDecisionLogName('decision-log.jsonl')).toBe(true)
    expect(isDecisionLogName('decision-log-s1a.jsonl')).toBe(true)
  })

  it('rejects unrelated files', () => {
    expect(isDecisionLogName('decision-log.jsonl.bak')).toBe(false)
    expect(isDecisionLogName('decision-log.txt')).toBe(false)
    expect(isDecisionLogName('my-decision-log.jsonl')).toBe(false)
    expect(isDecisionLogName('judge-verdict.json')).toBe(false)
  })
})

describe('mergeDecisionLogs', () => {

  const s1a: DecisionLogSource = {
    cell: 's1a',
    content: '{"t":0,"phase":"setup","decision":"picked palette","reason":"theme"}\n',
  }
  const s3a: DecisionLogSource = {
    cell: 's3a',
    content: '{"t":0,"phase":"setup","decision":"resolved id","reason":"card"}\n',
  }

  it('keeps every line from every cell — nothing is dropped', () => {
    const merged = mergeDecisionLogs([s1a, s3a])
    expect(merged).toContain('picked palette')
    expect(merged).toContain('resolved id')
    expect(merged.trim().split('\n')).toHaveLength(2)
  })

  it('order is by cell id, not input order — same inputs, same bytes', () => {
    const a = mergeDecisionLogs([s1a, s3a])
    const b = mergeDecisionLogs([s3a, s1a])
    expect(a).toBe(b)
    expect(a.indexOf('picked palette')).toBeLessThan(a.indexOf('resolved id'))
  })

  it('lines are kept verbatim — no re-encoding, no injected field', () => {
    const odd: DecisionLogSource = { cell: 'x', content: 'not json at all\n{"t":1,"phase":"p","decision":"d","reason":"r"}' }
    const merged = mergeDecisionLogs([odd])
    expect(merged).toContain('not json at all')
    expect(JSON.parse(merged.trim().split('\n')[1])).toEqual({ t: 1, phase: 'p', decision: 'd', reason: 'r' })
  })

  it('blank lines are not entries; each line keeps exactly one newline', () => {
    const gappy: DecisionLogSource = { cell: 'g', content: '\n{"t":1,"phase":"p","decision":"d","reason":"r"}\n\n' }
    expect(mergeDecisionLogs([gappy])).toBe('{"t":1,"phase":"p","decision":"d","reason":"r"}\n')
  })

  it('a lone legacy file merges to itself (idempotent)', () => {
    const content = '{"t":0,"phase":"setup","decision":"d","reason":"r"}\n'
    expect(mergeDecisionLogs([{ cell: LEGACY_DECISION_LOG, content }])).toBe(content)
  })

  it('no sources → empty string (callers can skip writing)', () => {
    expect(mergeDecisionLogs([])).toBe('')
  })
})

describe('decision-log — 2-writer concurrency (real fs)', () => {

  it('two cells writing concurrently in ONE workdir both survive the merge', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arena-decision-log-'))
    try {
      // Two cells, one shared workdir, one writer each, interleaved by an await.
      // Before the fix both paths were the same constant, so this write pair
      // clobbered and the merge below would lose one cell's only entry.
      const write = async (cellId: string, line: string) => {
        await Bun.sleep(0)
        writeFileSync(join(dir, decisionLogName(cellId)), line + '\n', 'utf-8')
      }
      await Promise.all([
        write('s1a', '{"t":0,"phase":"setup","decision":"cel a","reason":"ra"}'),
        write('s3a', '{"t":0,"phase":"setup","decision":"cell b","reason":"rb"}'),
      ])

      const merged = mergeDecisionLogs([
        { cell: 's1a', content: await Bun.file(join(dir, decisionLogName('s1a'))).text() },
        { cell: 's3a', content: await Bun.file(join(dir, decisionLogName('s3a'))).text() },
      ])

      expect(merged).toContain('cel a')
      expect(merged).toContain('cell b')
      expect(merged.trim().split('\n')).toHaveLength(2)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
