import { describe, test, expect } from 'bun:test'
import {
  JudgeVerdict, JudgeCriterion, CheckpointEntry, AgentScenario,
  ArenaManifest, ComparativeReport, Player, DeckConfig, Metrics,
} from '../src/schema'

// ── JudgeVerdict ───────────────────────────────────────────────────────────

describe('JudgeVerdict', () => {
  test('round-trip: real PASS verdict from frozen artifact', () => {
    const data = {
      verdict: 'PASS' as const,
      reason: 'Checkpoint correctly reports 2 skills.',
      criteria: [
        { name: 'Skill count matches', passed: true, note: 'count=2 is correct.' },
        { name: 'Checkpoint shape matches spec', passed: true, note: 'all fields match.' },
      ],
      raw_output: '{"verdict":"PASS",...}',
      error: null,
      timestamp: '2026-05-04T08:57:01.701Z',
    }
    const parsed = JudgeVerdict.parse(data)
    expect(parsed.verdict).toBe('PASS')
    expect(parsed.criteria).toHaveLength(2)
    expect(parsed.criteria[0].passed).toBe(true)
  })

  test('round-trip: real ERROR path (API noise in raw_output)', () => {
    const data = {
      verdict: 'ERROR' as const,
      reason: 'Judge failed after 2 attempts: parse error',
      criteria: [],
      raw_output: 'API Error: The server had an error while processing your request\n',
      error: 'JSON Parse error: Unexpected identifier "API"',
    }
    const parsed = JudgeVerdict.parse(data)
    expect(parsed.verdict).toBe('ERROR')
    expect(parsed.raw_output).toContain('API Error')
    expect(parsed.error).toBeTruthy()
  })

  test('rejects non-JSON string input', () => {
    expect(() => JudgeVerdict.parse('not an object')).toThrow()
  })

  test('rejects invalid verdict value', () => {
    expect(() => JudgeVerdict.parse({
      verdict: 'MAYBE',
      reason: 'unsure',
    })).toThrow()
  })

  test('rejects missing required field (reason)', () => {
    expect(() => JudgeVerdict.parse({
      verdict: 'PASS',
    })).toThrow()
  })

  test('accepts verdict with confidence score', () => {
    const parsed = JudgeVerdict.parse({
      verdict: 'PASS',
      reason: 'All good.',
      confidence: 95,
      criteria: [],
    })
    expect(parsed.confidence).toBe(95)
  })

  test('rejects confidence out of range (>100)', () => {
    expect(() => JudgeVerdict.parse({
      verdict: 'PASS',
      reason: 'x',
      confidence: 150,
    })).toThrow()
  })
})

// ── JudgeCriterion ─────────────────────────────────────────────────────────

describe('JudgeCriterion', () => {
  test('round-trip from frozen artifact', () => {
    const data = { name: 'Check shape', passed: false, note: 'missing field' }
    const parsed = JudgeCriterion.parse(data)
    expect(parsed.name).toBe('Check shape')
    expect(parsed.passed).toBe(false)
  })

  test('note defaults to empty string', () => {
    const parsed = JudgeCriterion.parse({ name: 'test', passed: true })
    expect(parsed.note).toBe('')
  })
})

// ── CheckpointEntry ────────────────────────────────────────────────────────

describe('CheckpointEntry', () => {
  test('round-trip: real introspection checkpoint', () => {
    const data = {
      step: 'deck.introspection',
      tool: 'read',
      args: ['skill-deck.toml'],
      final_state: { tool_skill_count: 2 },
    }
    const parsed = CheckpointEntry.parse(data)
    expect(parsed.step).toBe('deck.introspection')
    expect(parsed.final_state.tool_skill_count).toBe(2)
  })

  test('optional fields accepted', () => {
    const data = {
      step: 'deck.add',
      tool: 'bunx @lythos/skill-deck add skill-a --cold-pool ./cold-pool',
      args: [],
      final_state: {},
      exit_code: 0,
      stdout_summary: 'Skill ready: skill-a',
      fs_mutations: [{ action: 'create' as const, path: '.claude/skills/skill-a' }],
      timestamp: '2026-05-04T00:00:00Z',
    }
    const parsed = CheckpointEntry.parse(data)
    expect(parsed.exit_code).toBe(0)
    expect(parsed.fs_mutations).toHaveLength(1)
    expect(parsed.fs_mutations![0].action).toBe('create')
  })

  test('args defaults to empty array', () => {
    const parsed = CheckpointEntry.parse({ step: 'x', tool: 'y' })
    expect(parsed.args).toEqual([])
  })
})

// ── AgentScenario ──────────────────────────────────────────────────────────

describe('AgentScenario', () => {
  test('round-trip: minimal valid scenario', () => {
    const data = {
      name: 'Test scenario',
      when: 'Do something.',
    }
    const parsed = AgentScenario.parse(data)
    expect(parsed.name).toBe('Test scenario')
    expect(parsed.timeout).toBe(30000) // default
    expect(parsed.given.deck).toEqual({})
  })

  test('rejects missing when field', () => {
    expect(() => AgentScenario.parse({ name: 'x' })).toThrow()
  })

  test('round-trip: scenario with deck config', () => {
    const data = {
      name: 'Deck test',
      when: 'Run deck add.',
      given: {
        deck: {
          tool: {
            'skill-a': { path: 'localhost/skill-a' },
            'skill-b': { path: 'github.com/foo/bar/skill-b' },
          },
        },
      },
      judge: 'Verify skills were added.',
    }
    const parsed = AgentScenario.parse(data)
    expect(parsed.given.deck.tool).toBeDefined()
    expect(Object.keys(parsed.given.deck.tool!)).toHaveLength(2)
  })
})

// ── Arena Manifest ─────────────────────────────────────────────────────────

describe('ArenaManifest', () => {
  test('round-trip: real arena.json from playground', () => {
    const data = {
      id: 'arena-bdd-research-20260504',
      created_at: '2026-05-04T13:10:00+08:00',
      task: 'Find the best BDD-related skills',
      mode: 'decks' as const,
      participants: [
        { id: 'run-01', name: 'deep-research', deck: './decks/arena-run-01.toml', description: 'Multi-round search' },
        { id: 'run-02', name: 'bare-web-search', deck: './decks/arena-run-02.toml', description: 'Single-round search' },
      ],
      criteria: ['coverage', 'relevance', 'actionability', 'depth'],
      status: 'completed' as const,
    }
    const parsed = ArenaManifest.parse(data)
    expect(parsed.participants).toHaveLength(2)
    expect(parsed.mode).toBe('decks')
  })

  test('rejects fewer than 2 participants', () => {
    expect(() => ArenaManifest.parse({
      id: 'x',
      created_at: '2026-01-01T00:00:00Z',
      task: 'x',
      mode: 'decks',
      participants: [{ id: 'x', name: 'x', deck: 'x' }],
      criteria: ['x'],
      status: 'pending',
    })).toThrow()
  })
})

// ── Comparative Report ─────────────────────────────────────────────────────

describe('ComparativeReport', () => {
  test('round-trip: minimal valid report', () => {
    const data = {
      arena_id: 'arena-test-001',
      generated_at: '2026-05-04T00:00:00Z',
    }
    const parsed = ComparativeReport.parse(data)
    expect(parsed.arena_id).toBe('arena-test-001')
    expect(parsed.score_matrix).toEqual([])
  })

  test('round-trip: full report with scores and pareto', () => {
    const data = {
      arena_id: 'arena-test-001',
      generated_at: '2026-05-04T00:00:00Z',
      score_matrix: [
        { participant_id: 'run-01', criterion: 'coverage', weight: 0.25, score: 5, rationale: 'Best' },
        { participant_id: 'run-02', criterion: 'coverage', weight: 0.25, score: 3, rationale: 'Good' },
      ],
      weighted_totals: { 'run-01': 5.0, 'run-02': 3.0 },
      pareto: [
        { participant_id: 'run-01', scores: { coverage: 5 }, dominated: false, dominated_by: [] },
        { participant_id: 'run-02', scores: { coverage: 3 }, dominated: true, dominated_by: ['run-01'] },
      ],
      key_findings: ['run-01 dominates across all criteria'],
    }
    const parsed = ComparativeReport.parse(data)
    expect(parsed.score_matrix).toHaveLength(2)
    expect(parsed.pareto[0].dominated).toBe(false)
    expect(parsed.pareto[1].dominated).toBe(true)
  })
})

// ── Player ─────────────────────────────────────────────────────────────────

describe('Player', () => {
  test('round-trip: minimal player', () => {
    const parsed = Player.parse({ platform: 'claude-code' })
    expect(parsed.platform).toBe('claude-code')
    expect(parsed.concurrent).toBe(1) // default
  })
})

// ── Deck Config ────────────────────────────────────────────────────────────

describe('DeckConfig', () => {
  test('round-trip: empty deck', () => {
    const parsed = DeckConfig.parse({})
    expect(parsed).toEqual({})
  })

  test('round-trip: deck with tool skills', () => {
    const data = {
      tool: {
        'skill-a': { path: 'github.com/foo/bar/skill-a', role: 'BDD toolkit' },
      },
      max_cards: 10,
    }
    const parsed = DeckConfig.parse(data)
    expect(parsed.tool!['skill-a'].path).toBe('github.com/foo/bar/skill-a')
    expect(parsed.max_cards).toBe(10)
  })
})

// ── Metrics ────────────────────────────────────────────────────────────────

describe('Metrics', () => {
  test('round-trip: budget DAG metrics', () => {
    const data = {
      scenario: 'add-skill',
      budget: { idle_timeout_ms: 30000, total_timeout_ms: 300000, max_retries: 1 },
      dag: [{ node: 'parse', duration_ms: 100, status: 'ok' as const }],
      total_duration_ms: 5000,
    }
    const parsed = Metrics.parse(data)
    expect(parsed.budget.idle_timeout_ms).toBe(30000)
    expect(parsed.dag[0].status).toBe('ok')
  })
})
