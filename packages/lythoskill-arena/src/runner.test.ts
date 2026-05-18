import { describe, test, expect } from 'bun:test'
import { buildArenaPrompt, formatPlanOutput } from './runner'
import { buildExecutionPlan, parseArenaToml } from './arena-toml'

describe('buildArenaPrompt — plan-mode (pure, no IO)', () => {
  test('includes CWD, Deck, and output directory', () => {
    const prompt = buildArenaPrompt({
      brief: 'Write a hello world function',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('CWD: /tmp/arena-cell')
    expect(prompt).toContain('Deck: /tmp/test-deck.toml')
    expect(prompt).toContain('Produce output to: /tmp/arena-cell/')
  })

  test('includes decision-log.jsonl mandatory instructions', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('MANDATORY — write decision-log.jsonl')
    expect(prompt).toContain('t (seconds elapsed)')
    expect(prompt).toContain('phase (setup/content/design/output)')
    expect(prompt).toContain('decision (what you chose)')
    expect(prompt).toContain('reason (why)')
  })

  test('includes robustness and tools instructions', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('ROBUSTNESS')
    expect(prompt).toContain('TOOLS')
    expect(prompt).toContain('.claude/skills/')
  })

  test('task brief appears at the end', () => {
    const prompt = buildArenaPrompt({
      brief: 'Generate a dark-mode CSS theme',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).toContain('TASK:')
    expect(prompt).toContain('Generate a dark-mode CSS theme')
    // Brief should be at the end (after MANDATORY, ROBUSTNESS, TOOLS)
    const briefIdx = prompt.indexOf('Generate a dark-mode CSS theme')
    const mandatoryIdx = prompt.indexOf('MANDATORY')
    const toolsIdx = prompt.indexOf('TOOLS')
    expect(briefIdx).toBeGreaterThan(mandatoryIdx)
    expect(briefIdx).toBeGreaterThan(toolsIdx)
  })

  test('outputDir overrides default output path', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
      outputDir: '/custom/output',
    })
    expect(prompt).toContain('Produce output to: /custom/output/')
  })

  test('preflightReport included when provided', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
      preflightReport: '✅ 3 skills linked, 0 missing',
    })
    expect(prompt).toContain('Preflight:')
    expect(prompt).toContain('✅ 3 skills linked, 0 missing')
  })

  test('no preflight section when report not provided', () => {
    const prompt = buildArenaPrompt({
      brief: 'test',
      cwd: '/tmp/arena-cell',
      deckPath: '/tmp/test-deck.toml',
    })
    expect(prompt).not.toContain('Preflight:')
  })

  test('prompt is deterministic — same inputs = same output', () => {
    const opts = { brief: 'test', cwd: '/tmp/a', deckPath: '/tmp/d.toml' }
    expect(buildArenaPrompt(opts)).toBe(buildArenaPrompt(opts))
  })
})
