#!/bin/bash
# PR: 20260514-054600-arena-schema-step1
#
# Step 1 of 3 — additive new zod schemas per ADR-20260514050300.
#
#   Adds (new):
#     Task, RubricLevel, Criterion, JudgeSpec, Evidence, CriterionScore,
#     ParticipantVerdict, Participant, ArenaMode, ArenaModeOptions,
#     ArenaConfig, PerCellRecord, ArenaReport
#
#   Preserves (old, still referenced by consumers — cleaned up in pr-3):
#     JudgeVerdict, JudgeCriterion, AgentScenario, ArenaManifest,
#     ArenaParticipant, ArenaRunContext, ComparativeReport, ScoreCell,
#     ParetoEntry, CriterionDef, CriterionRubricLevel, CriteriaField,
#     normalizeCriteriaWeights
#
#   schema.test.ts:
#     Deletes tests for old schemas (their objects are deleted in pr-3).
#     Keeps cross-version tests: CheckpointEntry, Player, DeckConfig, Metrics.
#     Adds mirror-style behavioral tests (round-trip / reject / defaults) for new schemas.
#
# Apply: bash pr-20260514-054600-arena-schema-step1.sh
# Verify: bun test packages/lythoskill-test-utils
# Rollback: cp archived-patches/schema.ts.<timestamp>.bak packages/lythoskill-test-utils/src/schema.ts
#           cp archived-patches/schema.test.ts.<timestamp>.bak packages/lythoskill-test-utils/src/schema.test.ts

set -e

PATCH_NAME="$(basename "$0")"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p archived-patches

# ── Backup ────────────────────────────────────────────────────────────────
cp packages/lythoskill-test-utils/src/schema.ts \
   "archived-patches/schema.ts.${STAMP}.bak"
cp packages/lythoskill-test-utils/src/schema.test.ts \
   "archived-patches/schema.test.ts.${STAMP}.bak"

# ── schema.ts ─────────────────────────────────────────────────────────────
cat > packages/lythoskill-test-utils/src/schema.ts << 'PATCH_EOF'
import { z } from 'zod'

// ── P0: Judge Verdict (legacy — used by old per-cell judge until pr-3 cleanup) ─
// Anchored on: runs/agent-bdd/.../judge-verdict.json (PASS, FAIL, and ERROR paths)

export const JudgeCriterion = z.object({
  name: z.string(),
  passed: z.boolean(),
  note: z.string().optional().default(''),
})
export type JudgeCriterion = z.infer<typeof JudgeCriterion>

export const JudgeVerdict = z.object({
  verdict: z.enum(['PASS', 'FAIL', 'ERROR']),
  reason: z.string(),
  confidence: z.number().int().min(0).max(100).optional().describe('Judge self-assessment confidence 0-100'),
  criteria: z.array(JudgeCriterion).default([]).describe('Binary pass/fail per criterion. Numeric 1-5 scores belong to ComparativeReport.score_matrix (ScoreCell).'),
  raw_output: z.string().default(''),
  error: z.string().nullable().default(null),
  timestamp: z.string().datetime().optional(),
})
export type JudgeVerdict = z.infer<typeof JudgeVerdict>

// ── P0: Checkpoint Entry ──────────────────────────────────────────────────
// Anchored on: runs/agent-bdd/.../_checkpoints/*.jsonl

export const FsMutation = z.object({
  action: z.enum(['create', 'modify', 'delete', 'create-symlink']),
  path: z.string(),
  target: z.string().optional(),
})

export const CheckpointEntry = z.object({
  step: z.string(),
  tool: z.string(),
  args: z.array(z.string()).default([]),
  final_state: z.record(z.unknown()).default({}),
  exit_code: z.number().optional(),
  stdout_summary: z.string().optional(),
  fs_mutations: z.array(FsMutation).optional(),
  timestamp: z.string().optional(),
})
export type CheckpointEntry = z.infer<typeof CheckpointEntry>

// ── P0: Deck Config ───────────────────────────────────────────────────────
// Anchored on: skill-deck.toml [tool.skills.*] sections

export const SkillEntry = z.object({
  path: z.string(),
  role: z.string().optional(),
  why_in_deck: z.string().optional(),
})

export const DeckConfig = z.object({
  max_cards: z.number().int().positive().optional(),
  cold_pool: z.string().optional(),
  working_set: z.string().optional(),
  innate: z.record(SkillEntry).optional(),
  tool: z.record(SkillEntry).optional(),
  combo: z.record(z.object({
    skills: z.array(z.string()).describe('Skill names in this combo'),
    prompt: z.string().optional().describe('How these skills coordinate — agent reads this as instructions'),
  })).optional(),
  transient: z.record(z.object({
    path: z.string().optional(),
    skills: z.array(z.string()).optional(),
    expires: z.string().optional(),
  })).optional(),
})
export type DeckConfig = z.infer<typeof DeckConfig>

// ── P0: Agent Scenario (legacy — replaced by Task + JudgeSpec in pr-2/3) ──
// Anchored on: parseAgentMd output (deck/test/*.agent.md)

export const AgentScenario = z.object({
  name: z.string().default('unnamed agent scenario'),
  description: z.string().default(''),
  timeout: z.number().int().positive().default(30000),
  given: z.object({
    deck: DeckConfig.default({}),
  }).default({ deck: {} }),
  when: z.string(),
  then: z.array(z.string()).default([]),
  judge: z.string().default(''),
})
export type AgentScenario = z.infer<typeof AgentScenario>

// ── P1: Player ────────────────────────────────────────────────────────────
// Anchored on: ADR-20260424120936541

export const Player = z.object({
  platform: z.string(),
  model: z.string().optional(),
  concurrent: z.number().int().positive().default(1),
  tool_set: z.array(z.string()).default([]),
})
export type Player = z.infer<typeof Player>

// ── P1: Criterion Definition (legacy — replaced by Criterion in pr-2/3) ───
// Anchored on: ADR-20260505225159725 (from bare strings to structured rubrics)

export const CriterionRubricLevel = z.object({
  score: z.number().int().min(1).max(5).describe('1=poor, 3=acceptable, 5=excellent'),
  label: z.string().describe('e.g. "优秀 — 全部通过"'),
  description: z.string().describe('Concrete expectation at this level'),
})

export const CriterionDef = z.object({
  id: z.string().describe('Machine key, e.g. "correctness"'),
  label: z.string().describe('Display name, e.g. "功能正确性"'),
  description: z.string().default('').describe('What this dimension measures'),
  persona: z.string().optional().describe('MBTI evaluator personality from swarm ADR, e.g. "INTJ架构师"'),
  weight: z.number().int().min(0).max(100).optional().describe('Integer weight (0-100). If unset, auto-computed as equal share at manifest level. All weights must sum to 100.'),
  rubric: z.array(CriterionRubricLevel).optional().describe('1-5 scoring anchors. If absent, judge uses default 1-5 scale.'),
})

export const CriteriaField = z.union([z.string(), CriterionDef])
  .transform(c => typeof c === 'string'
    ? { id: c, label: c, description: '' } satisfies Partial<z.infer<typeof CriterionDef>>
    : c
  )

export function normalizeCriteriaWeights(criteria: z.infer<typeof CriteriaField>[]): z.infer<typeof CriterionDef>[] {
  const result = criteria.map(c => {
    if (typeof c === 'string') return { id: c, label: c, description: '', weight: undefined }
    return { ...c }
  })
  const unset = result.filter(c => c.weight === undefined)
  if (unset.length > 0) {
    const share = Math.floor(100 / result.length)
    const remainder = 100 - share * (result.length - unset.length) - unset.length * share
    let distributed = 0
    for (const c of result) {
      if (c.weight === undefined) {
        c.weight = share
        distributed++
      }
    }
    if (distributed > 0) {
      const last = result.filter(c => c.weight === share).pop()
      if (last) last.weight = share + remainder
    }
  }
  for (const c of result) {
    if (c.weight === undefined) c.weight = 25
  }
  return result as z.infer<typeof CriterionDef>[]
}

export type CriterionDef = z.infer<typeof CriterionDef>
export type CriteriaField = z.infer<typeof CriteriaField>

// ── P1: Arena Manifest (legacy — replaced by ArenaConfig in pr-2/3) ───────

export const ArenaParticipant = z.object({
  id: z.string(),
  name: z.string(),
  player: z.string().optional(),
  deck: z.string(),
  description: z.string().default(''),
  prompt: z.string().optional(),
})

export const ArenaManifest = z.object({
  id: z.string(),
  created_at: z.string(),
  task: z.string(),
  mode: z.enum(['decks', 'players', 'prompts', 'desc-variants', 'matrix']),
  participants: z.array(ArenaParticipant).min(2),
  criteria: z.array(CriteriaField).min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
}).refine(data => {
  const normalized = normalizeCriteriaWeights(data.criteria)
  const sum = normalized.reduce((a, b) => a + (b.weight ?? 0), 0)
  return sum === 100
}, { message: 'Criteria weights (integers 0-100) must sum to 100' })
export type ArenaManifest = z.infer<typeof ArenaManifest>

// ── P1: Arena Run Context ─────────────────────────────────────────────────

export const ArenaRunContext = z.object({
  git_ref: z.string().describe('Git commit hash at time of run'),
  arena_toml_path: z.string().describe('Path to the arena.toml that defined this experiment'),
  judge_model: z.string().describe('Model used for comparative judge, e.g. "claude-sonnet-4-6"'),
  runs_per_side: z.number().int().min(1).describe('Number of replicate runs per participant'),
  started_at: z.string().describe('ISO timestamp when run started'),
  completed_at: z.string().describe('ISO timestamp when run completed'),
})
export type ArenaRunContext = z.infer<typeof ArenaRunContext>

// ── P1: Comparative Report (legacy — superseded by ArenaReport in pr-2/3) ──

export const ScoreCell = z.object({
  participant_id: z.string(),
  criterion: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(1).max(5),
  rationale: z.string().default(''),
})

export const ParetoEntry = z.object({
  participant_id: z.string(),
  scores: z.record(z.number()),
  dominated: z.boolean(),
  dominated_by: z.array(z.string()).default([]),
})

export const ComparativeReport = z.object({
  arena_id: z.string(),
  generated_at: z.string(),
  run_context: ArenaRunContext.optional().describe('Reproducibility metadata. Present when run by arena runner.'),
  score_matrix: z.array(ScoreCell).default([]),
  weighted_totals: z.record(z.number()).default({}),
  pareto: z.array(ParetoEntry).default([]),
  key_findings: z.array(z.string()).default([]),
  recommendations: z.array(z.object({
    audience: z.string(),
    recommendation: z.string(),
  })).default([]),
})
export type ComparativeReport = z.infer<typeof ComparativeReport>

// ── P2: Metrics (budget DAG) ──────────────────────────────────────────────
// Anchored on: ADR-20260504172913972

export const MetricsNode = z.object({
  node: z.string(),
  duration_ms: z.number(),
  status: z.enum(['ok', 'error', 'timeout', 'skipped']),
  token_in: z.number().optional(),
  token_out: z.number().optional(),
})

export const Metrics = z.object({
  scenario: z.string(),
  budget: z.object({
    idle_timeout_ms: z.number(),
    total_timeout_ms: z.number(),
    max_retries: z.number(),
  }),
  dag: z.array(MetricsNode).default([]),
  total_duration_ms: z.number(),
  retry_count: z.number().default(0),
})
export type Metrics = z.infer<typeof Metrics>

// ═════════════════════════════════════════════════════════════════════════════
// 2026-05-14 redesign per ADR-20260514050300:
//   Separate task (考卷) from judge criteria (评分标准).
//   Player agent sees Task. Judge agent sees JudgeSpec + Task.task_context + Evidence.
//   Old AgentScenario/ArenaManifest/ComparativeReport above are kept for consumers
//   until pr-3 cleanup; new pipeline uses the schemas below.
// ═════════════════════════════════════════════════════════════════════════════

// ── New: RubricLevel ──────────────────────────────────────────────────────

export const RubricLevel = z.object({
  score: z.number().int().min(1).max(5).describe('1=poor, 3=acceptable, 5=excellent'),
  label: z.string(),
  description: z.string(),
})
export type RubricLevel = z.infer<typeof RubricLevel>

// ── New: Criterion (replaces CriterionDef) ────────────────────────────────

export const Criterion = z.object({
  id: z.string().min(1).describe('Stable key — referenced in CriterionScore.criterion_id and ParetoEntry.scores'),
  label: z.string().describe('Human-readable name'),
  description: z.string().default('').describe('What this criterion measures; shown to judge'),
  persona: z.string().optional().describe('Judge persona for this criterion, e.g. "senior content editor"'),
  weight: z.number().int().min(0).max(100).default(50),
  rubric: z.array(RubricLevel).optional().describe('1-5 scoring anchors'),
})
export type Criterion = z.infer<typeof Criterion>

// ── New: Task (考卷) — what player agent sees ──────────────────────────────

export const Task = z.object({
  id: z.string().describe('Stable task id, e.g. cortex TASK-id or slug'),
  description: z.string().min(1).describe('Task brief — given to player agent verbatim'),
  given: z.string().default('').describe('Preconditions / environment assumptions'),
  acceptance: z.array(z.string()).default([]).describe('Then bullets the player should satisfy'),
  artifact_paths: z.array(z.string()).default([]).describe('Expected output paths the player must produce'),
  timeout_ms: z.number().int().positive().default(300000),
  task_context: z.string().default('').describe('Background, audience, taste anchors. Shown to JUDGE as read-only reference — NOT used to invoke player. Difference between grader sees question paper vs grader sees exam-day instructions.'),
})
export type Task = z.infer<typeof Task>

// ── New: JudgeSpec (评分标准) — what judge agent sees ──────────────────────

export const JudgeSpec = z.object({
  criteria: z.array(Criterion).min(1),
  judge_player: z.string().default('claude').describe('Player identity for judge — may differ from task player'),
  judge_timeout_ms: z.number().int().positive().default(60000),
  evidence_truncation: z.object({
    stdout_chars: z.number().int().positive().default(8000),
    stderr_chars: z.number().int().positive().default(2000),
    checkpoints_chars: z.number().int().positive().default(2000),
  }).default({}),
})
export type JudgeSpec = z.infer<typeof JudgeSpec>

// ── New: Evidence — agent products + sandbox cwd reference ────────────────

export const Evidence = z.object({
  sandbox_cwd: z.string().describe('Absolute path; judge may read files under here'),
  stdout: z.string(),
  stderr: z.string(),
  checkpoints: z.array(CheckpointEntry).default([]),
  artifact_files: z.array(z.string()).default([]).describe('Relative paths within sandbox_cwd that the player produced'),
})
export type Evidence = z.infer<typeof Evidence>

// ── New: CriterionScore — per-criterion judge output (1-5 + derived binary) ──

export const CriterionScore = z.object({
  criterion_id: z.string(),
  score: z.number().int().min(1).max(5).describe('1-5 rubric score'),
  passed: z.boolean().describe('Derived from score (default threshold >=3; per-criterion threshold in mode_options)'),
  note: z.string().default(''),
  confidence: z.number().int().min(0).max(100).optional(),
})
export type CriterionScore = z.infer<typeof CriterionScore>

// ── New: ParticipantVerdict — per-cell verdict ────────────────────────────

export const ParticipantVerdict = z.object({
  verdict: z.enum(['PASS', 'FAIL', 'ERROR']),
  reason: z.string(),
  confidence: z.number().int().min(0).max(100).optional(),
  criteria: z.array(CriterionScore).default([]),
  raw_output: z.string().default(''),
  error: z.string().nullable().default(null),
})
export type ParticipantVerdict = z.infer<typeof ParticipantVerdict>

// ── New: Participant — first-class (player × deck) ────────────────────────
// Anchored on: ADR-20260424120936541 — player is required (not optional like ArenaParticipant)

export const Participant = z.object({
  id: z.string(),
  name: z.string(),
  player: z.string().describe('Required — first-class axis per ADR-20260424120936541'),
  deck: z.string(),
  control: z.boolean().default(false),
  description: z.string().default(''),
  env: z.record(z.string()).default({}),
})
export type Participant = z.infer<typeof Participant>

// ── New: ArenaMode — evaluation SOP enum, extensible ──────────────────────
// Each mode names a different evaluation orchestration:
//   - independent: per-cell judge subagent → aggregate scores → Pareto
//   - comparative: one judge sees all cells → score matrix → Pareto
//   - independent-then-comparative: both
// Future modes (tiered, tournament, etc.) extend this enum.

export const ArenaMode = z.enum([
  'independent',
  'comparative',
  'independent-then-comparative',
])
export type ArenaMode = z.infer<typeof ArenaMode>

// ── New: ArenaModeOptions — mode-specific SOP options ─────────────────────
// Opaque per-mode configuration. Each mode handler parses what it needs.
// .passthrough() allows future modes to add fields without schema changes.

export const ArenaModeOptions = z.object({
  pass_threshold: z.number().int().min(1).max(5).default(3).describe('independent mode: criterion.score >= threshold => passed'),
  comparative_judge_player: z.string().optional().describe('comparative mode: override JudgeSpec.judge_player'),
}).passthrough().default({})
export type ArenaModeOptions = z.infer<typeof ArenaModeOptions>

// ── New: ArenaConfig — root TOML-facing config ────────────────────────────

export const ArenaConfig = z.object({
  arena_id: z.string().optional().describe('Auto-generated if absent'),
  task: Task,
  judge: JudgeSpec,
  participants: z.array(Participant).min(2).max(5),
  mode: ArenaMode.default('independent-then-comparative'),
  mode_options: ArenaModeOptions,
  runs_per_side: z.number().int().min(1).default(1),
  notes: z.string().default(''),
})
export type ArenaConfig = z.infer<typeof ArenaConfig>

// ── New: PerCellRecord — single (participant × run) outcome ───────────────

export const PerCellRecord = z.object({
  participant_id: z.string(),
  run_index: z.number().int().min(0),
  verdict: ParticipantVerdict,
  evidence_paths: z.object({
    stdout: z.string(),
    stderr: z.string(),
    judge_verdict_json: z.string(),
    artifact_dir: z.string(),
  }),
})
export type PerCellRecord = z.infer<typeof PerCellRecord>

// ── New: ArenaReport — final aggregated output ────────────────────────────

export const ArenaReport = z.object({
  arena_id: z.string(),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  config: ArenaConfig,
  per_cell: z.array(PerCellRecord).default([]),
  aggregated_scores: z.record(z.string(), z.record(z.string(), z.number())).default({}).describe('participant_id → criterion_id → mean score'),
  pareto: z.array(ParetoEntry).default([]),
  comparative_synthesis: z.string().optional().describe('Free-form from comparative judge if mode includes it'),
  status: z.enum(['running', 'completed', 'failed']),
})
export type ArenaReport = z.infer<typeof ArenaReport>
PATCH_EOF

# ── schema.test.ts ────────────────────────────────────────────────────────
cat > packages/lythoskill-test-utils/src/schema.test.ts << 'PATCH_EOF'
import { describe, test, expect } from 'bun:test'
import {
  // Cross-version (kept)
  CheckpointEntry, Player, DeckConfig, Metrics,
  // New (2026-05-14 redesign, ADR-20260514050300)
  RubricLevel, Criterion, Task, JudgeSpec, Evidence, CriterionScore,
  ParticipantVerdict, Participant, ArenaMode, ArenaModeOptions,
  ArenaConfig, PerCellRecord, ArenaReport,
} from './schema'

// ─── Cross-version schemas (unchanged) ────────────────────────────────────

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

describe('Player', () => {
  test('round-trip: minimal player', () => {
    const parsed = Player.parse({ platform: 'claude-code' })
    expect(parsed.platform).toBe('claude-code')
    expect(parsed.concurrent).toBe(1)
  })
})

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

// ─── New schemas (2026-05-14 redesign per ADR-20260514050300) ─────────────
// Mirror style: round-trip + reject invalid + defaults.

describe('RubricLevel', () => {
  test('parses valid rubric level', () => {
    const parsed = RubricLevel.parse({ score: 4, label: '良好', description: 'mostly correct' })
    expect(parsed.score).toBe(4)
  })

  test('rejects score < 1', () => {
    expect(() => RubricLevel.parse({ score: 0, label: 'x', description: 'x' })).toThrow()
  })

  test('rejects score > 5', () => {
    expect(() => RubricLevel.parse({ score: 6, label: 'x', description: 'x' })).toThrow()
  })

  test('rejects non-integer score', () => {
    expect(() => RubricLevel.parse({ score: 3.5, label: 'x', description: 'x' })).toThrow()
  })
})

describe('Criterion', () => {
  test('parses structured criterion with rubric', () => {
    const data = {
      id: 'concrete_analogy',
      label: 'Concrete analogy beyond plugin',
      description: 'judge looks for a vivid, memorable analogy',
      persona: 'senior content editor',
      weight: 30,
      rubric: [
        { score: 5, label: 'Vivid', description: 'Memorable + audience-fit' },
        { score: 3, label: 'Adequate', description: 'Present but generic' },
        { score: 1, label: 'Absent', description: 'No analogy or confusing' },
      ],
    }
    const parsed = Criterion.parse(data)
    expect(parsed.id).toBe('concrete_analogy')
    expect(parsed.weight).toBe(30)
    expect(parsed.rubric).toHaveLength(3)
  })

  test('defaults: description empty, weight 50, no rubric', () => {
    const parsed = Criterion.parse({ id: 'x', label: 'X' })
    expect(parsed.description).toBe('')
    expect(parsed.weight).toBe(50)
    expect(parsed.rubric).toBeUndefined()
    expect(parsed.persona).toBeUndefined()
  })

  test('rejects empty id', () => {
    expect(() => Criterion.parse({ id: '', label: 'X' })).toThrow()
  })

  test('rejects weight out of range', () => {
    expect(() => Criterion.parse({ id: 'x', label: 'X', weight: 101 })).toThrow()
    expect(() => Criterion.parse({ id: 'x', label: 'X', weight: -1 })).toThrow()
  })
})

describe('Task', () => {
  test('round-trip: full task', () => {
    const data = {
      id: 'agent-skills-intro-2026-05-14',
      description: 'Write a 60-minute Agent Skills primer for non-coder content-ops staff',
      given: 'bun is available; working directory empty',
      acceptance: ['Deliver as styled HTML', 'Include comparison table'],
      artifact_paths: ['agent-skills-intro-for-content-ops.html'],
      timeout_ms: 300000,
      task_context: 'audience: non-coder content ops; format: styled HTML; tone: practical',
    }
    const parsed = Task.parse(data)
    expect(parsed.id).toBe('agent-skills-intro-2026-05-14')
    expect(parsed.acceptance).toHaveLength(2)
    expect(parsed.task_context).toContain('non-coder')
  })

  test('defaults: empty given, empty acceptance, no artifact_paths, default timeout', () => {
    const parsed = Task.parse({ id: 't1', description: 'do thing' })
    expect(parsed.given).toBe('')
    expect(parsed.acceptance).toEqual([])
    expect(parsed.artifact_paths).toEqual([])
    expect(parsed.timeout_ms).toBe(300000)
    expect(parsed.task_context).toBe('')
  })

  test('rejects empty description', () => {
    expect(() => Task.parse({ id: 't1', description: '' })).toThrow()
  })

  test('rejects non-positive timeout', () => {
    expect(() => Task.parse({ id: 't1', description: 'x', timeout_ms: 0 })).toThrow()
    expect(() => Task.parse({ id: 't1', description: 'x', timeout_ms: -1 })).toThrow()
  })
})

describe('JudgeSpec', () => {
  test('round-trip: with criteria and overrides', () => {
    const data = {
      criteria: [
        { id: 'a', label: 'A', weight: 50 },
        { id: 'b', label: 'B', weight: 50 },
      ],
      judge_player: 'kimi',
      judge_timeout_ms: 120000,
      evidence_truncation: { stdout_chars: 4000, stderr_chars: 1000, checkpoints_chars: 1000 },
    }
    const parsed = JudgeSpec.parse(data)
    expect(parsed.judge_player).toBe('kimi')
    expect(parsed.judge_timeout_ms).toBe(120000)
    expect(parsed.evidence_truncation.stdout_chars).toBe(4000)
  })

  test('defaults: judge_player=claude, judge_timeout=60s, default truncations', () => {
    const parsed = JudgeSpec.parse({ criteria: [{ id: 'a', label: 'A' }] })
    expect(parsed.judge_player).toBe('claude')
    expect(parsed.judge_timeout_ms).toBe(60000)
    expect(parsed.evidence_truncation.stdout_chars).toBe(8000)
    expect(parsed.evidence_truncation.stderr_chars).toBe(2000)
    expect(parsed.evidence_truncation.checkpoints_chars).toBe(2000)
  })

  test('rejects empty criteria array', () => {
    expect(() => JudgeSpec.parse({ criteria: [] })).toThrow()
  })
})

describe('Evidence', () => {
  test('round-trip: full evidence', () => {
    const data = {
      sandbox_cwd: '/tmp/arena-123/work/bare-kimi',
      stdout: 'agent stdout sample',
      stderr: '',
      checkpoints: [{ step: 'start', tool: 'spawn', args: [], final_state: {} }],
      artifact_files: ['output.html', 'output.md'],
    }
    const parsed = Evidence.parse(data)
    expect(parsed.sandbox_cwd).toContain('arena-123')
    expect(parsed.artifact_files).toHaveLength(2)
    expect(parsed.checkpoints).toHaveLength(1)
  })

  test('defaults: empty checkpoints, empty artifact_files', () => {
    const parsed = Evidence.parse({ sandbox_cwd: '/tmp', stdout: '', stderr: '' })
    expect(parsed.checkpoints).toEqual([])
    expect(parsed.artifact_files).toEqual([])
  })

  test('rejects missing sandbox_cwd', () => {
    expect(() => Evidence.parse({ stdout: '', stderr: '' })).toThrow()
  })
})

describe('CriterionScore', () => {
  test('round-trip: full score entry', () => {
    const parsed = CriterionScore.parse({
      criterion_id: 'concrete_analogy',
      score: 4,
      passed: true,
      note: 'good 活页笔记本 analogy',
      confidence: 85,
    })
    expect(parsed.criterion_id).toBe('concrete_analogy')
    expect(parsed.score).toBe(4)
    expect(parsed.confidence).toBe(85)
  })

  test('defaults: empty note', () => {
    const parsed = CriterionScore.parse({
      criterion_id: 'x',
      score: 3,
      passed: true,
    })
    expect(parsed.note).toBe('')
  })

  test('rejects score 0', () => {
    expect(() => CriterionScore.parse({
      criterion_id: 'x',
      score: 0,
      passed: false,
    })).toThrow()
  })

  test('rejects score 6', () => {
    expect(() => CriterionScore.parse({
      criterion_id: 'x',
      score: 6,
      passed: true,
    })).toThrow()
  })
})

describe('ParticipantVerdict', () => {
  test('round-trip: PASS with per-criterion scores', () => {
    const data = {
      verdict: 'PASS' as const,
      reason: 'Met all criteria',
      confidence: 90,
      criteria: [
        { criterion_id: 'concrete_analogy', score: 5, passed: true, note: '活页笔记本' },
        { criterion_id: 'skill_cases', score: 4, passed: true, note: '5 cases listed' },
      ],
    }
    const parsed = ParticipantVerdict.parse(data)
    expect(parsed.verdict).toBe('PASS')
    expect(parsed.criteria).toHaveLength(2)
    expect(parsed.criteria[0].score).toBe(5)
  })

  test('round-trip: ERROR path', () => {
    const data = {
      verdict: 'ERROR' as const,
      reason: 'Judge failed after 2 attempts',
      error: 'JSON Parse error',
      raw_output: 'API noise',
    }
    const parsed = ParticipantVerdict.parse(data)
    expect(parsed.verdict).toBe('ERROR')
    expect(parsed.error).toBeTruthy()
    expect(parsed.criteria).toEqual([])
  })

  test('rejects invalid verdict value', () => {
    expect(() => ParticipantVerdict.parse({ verdict: 'MAYBE', reason: 'x' })).toThrow()
  })

  test('rejects confidence > 100', () => {
    expect(() => ParticipantVerdict.parse({
      verdict: 'PASS',
      reason: 'x',
      confidence: 150,
    })).toThrow()
  })
})

describe('Participant', () => {
  test('round-trip: minimal', () => {
    const parsed = Participant.parse({
      id: 'bare-kimi',
      name: 'bare-kimi',
      player: 'kimi',
      deck: 'decks/bare.toml',
    })
    expect(parsed.player).toBe('kimi')
    expect(parsed.control).toBe(false)
    expect(parsed.env).toEqual({})
  })

  test('round-trip: with env and control flag', () => {
    const parsed = Participant.parse({
      id: 'deck-combo',
      name: 'deck-combo',
      player: 'kimi',
      deck: 'decks/combo.toml',
      control: false,
      description: 'deep-research × baoyu combo',
      env: { LANG: 'zh_CN.UTF-8' },
    })
    expect(parsed.env.LANG).toBe('zh_CN.UTF-8')
  })

  test('rejects missing player', () => {
    expect(() => Participant.parse({
      id: 'x',
      name: 'x',
      deck: 'x',
    })).toThrow()
  })
})

describe('ArenaMode', () => {
  test('accepts all three modes', () => {
    expect(ArenaMode.parse('independent')).toBe('independent')
    expect(ArenaMode.parse('comparative')).toBe('comparative')
    expect(ArenaMode.parse('independent-then-comparative')).toBe('independent-then-comparative')
  })

  test('rejects unknown mode', () => {
    expect(() => ArenaMode.parse('tier-sort')).toThrow()
  })
})

describe('ArenaModeOptions', () => {
  test('defaults: pass_threshold=3, no comparative override', () => {
    const parsed = ArenaModeOptions.parse({})
    expect(parsed.pass_threshold).toBe(3)
    expect(parsed.comparative_judge_player).toBeUndefined()
  })

  test('round-trip: with overrides', () => {
    const parsed = ArenaModeOptions.parse({
      pass_threshold: 4,
      comparative_judge_player: 'deepseek',
    })
    expect(parsed.pass_threshold).toBe(4)
    expect(parsed.comparative_judge_player).toBe('deepseek')
  })

  test('passthrough: future mode-specific keys allowed', () => {
    const parsed = ArenaModeOptions.parse({
      tier_thresholds: [3, 4],
    } as Record<string, unknown>) as Record<string, unknown>
    expect(parsed.tier_thresholds).toEqual([3, 4])
  })

  test('rejects pass_threshold out of 1-5 range', () => {
    expect(() => ArenaModeOptions.parse({ pass_threshold: 0 })).toThrow()
    expect(() => ArenaModeOptions.parse({ pass_threshold: 6 })).toThrow()
  })
})

describe('ArenaConfig', () => {
  test('round-trip: minimal valid config', () => {
    const data = {
      task: { id: 't1', description: 'write something' },
      judge: { criteria: [{ id: 'a', label: 'A' }] },
      participants: [
        { id: 'p1', name: 'p1', player: 'kimi', deck: 'd1' },
        { id: 'p2', name: 'p2', player: 'kimi', deck: 'd2' },
      ],
    }
    const parsed = ArenaConfig.parse(data)
    expect(parsed.mode).toBe('independent-then-comparative')
    expect(parsed.runs_per_side).toBe(1)
    expect(parsed.participants).toHaveLength(2)
    expect(parsed.mode_options.pass_threshold).toBe(3)
  })

  test('round-trip: with explicit mode and runs', () => {
    const data = {
      task: { id: 't1', description: 'x' },
      judge: { criteria: [{ id: 'a', label: 'A' }] },
      participants: [
        { id: 'p1', name: 'p1', player: 'kimi', deck: 'd1' },
        { id: 'p2', name: 'p2', player: 'claude', deck: 'd2' },
      ],
      mode: 'comparative' as const,
      runs_per_side: 3,
      mode_options: { pass_threshold: 4 },
    }
    const parsed = ArenaConfig.parse(data)
    expect(parsed.mode).toBe('comparative')
    expect(parsed.runs_per_side).toBe(3)
    expect(parsed.mode_options.pass_threshold).toBe(4)
  })

  test('rejects fewer than 2 participants', () => {
    expect(() => ArenaConfig.parse({
      task: { id: 't', description: 'x' },
      judge: { criteria: [{ id: 'a', label: 'A' }] },
      participants: [{ id: 'p1', name: 'p1', player: 'kimi', deck: 'd1' }],
    })).toThrow()
  })

  test('rejects more than 5 participants', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`, name: `p${i}`, player: 'kimi', deck: `d${i}`,
    }))
    expect(() => ArenaConfig.parse({
      task: { id: 't', description: 'x' },
      judge: { criteria: [{ id: 'a', label: 'A' }] },
      participants: six,
    })).toThrow()
  })
})

describe('PerCellRecord', () => {
  test('round-trip with evidence paths', () => {
    const data = {
      participant_id: 'bare-kimi',
      run_index: 0,
      verdict: {
        verdict: 'PASS' as const,
        reason: 'all good',
        criteria: [{ criterion_id: 'a', score: 5, passed: true }],
      },
      evidence_paths: {
        stdout: 'runs/arena-1/runs/bare-kimi/run-1/agent-stdout.txt',
        stderr: 'runs/arena-1/runs/bare-kimi/run-1/agent-stderr.txt',
        judge_verdict_json: 'runs/arena-1/runs/bare-kimi/run-1/judge-verdict.json',
        artifact_dir: 'runs/arena-1/runs/bare-kimi/run-1',
      },
    }
    const parsed = PerCellRecord.parse(data)
    expect(parsed.run_index).toBe(0)
    expect(parsed.verdict.verdict).toBe('PASS')
  })

  test('rejects negative run_index', () => {
    expect(() => PerCellRecord.parse({
      participant_id: 'x',
      run_index: -1,
      verdict: { verdict: 'PASS', reason: 'x' },
      evidence_paths: { stdout: '', stderr: '', judge_verdict_json: '', artifact_dir: '' },
    })).toThrow()
  })
})

describe('ArenaReport', () => {
  test('round-trip: minimal running report', () => {
    const data = {
      arena_id: 'arena-test-001',
      created_at: '2026-05-14T05:00:00Z',
      config: {
        task: { id: 't', description: 'x' },
        judge: { criteria: [{ id: 'a', label: 'A' }] },
        participants: [
          { id: 'p1', name: 'p1', player: 'kimi', deck: 'd1' },
          { id: 'p2', name: 'p2', player: 'kimi', deck: 'd2' },
        ],
      },
      status: 'running' as const,
    }
    const parsed = ArenaReport.parse(data)
    expect(parsed.status).toBe('running')
    expect(parsed.per_cell).toEqual([])
    expect(parsed.pareto).toEqual([])
    expect(parsed.aggregated_scores).toEqual({})
  })

  test('round-trip: completed with pareto', () => {
    const data = {
      arena_id: 'arena-test-002',
      created_at: '2026-05-14T05:00:00Z',
      completed_at: '2026-05-14T05:10:00Z',
      config: {
        task: { id: 't', description: 'x' },
        judge: { criteria: [{ id: 'a', label: 'A' }] },
        participants: [
          { id: 'p1', name: 'p1', player: 'kimi', deck: 'd1' },
          { id: 'p2', name: 'p2', player: 'kimi', deck: 'd2' },
        ],
      },
      per_cell: [
        {
          participant_id: 'p1',
          run_index: 0,
          verdict: { verdict: 'PASS' as const, reason: 'x', criteria: [] },
          evidence_paths: { stdout: 'a', stderr: 'b', judge_verdict_json: 'c', artifact_dir: 'd' },
        },
      ],
      aggregated_scores: { p1: { a: 5 }, p2: { a: 3 } },
      pareto: [
        { participant_id: 'p1', scores: { a: 5 }, dominated: false, dominated_by: [] },
        { participant_id: 'p2', scores: { a: 3 }, dominated: true, dominated_by: ['p1'] },
      ],
      status: 'completed' as const,
    }
    const parsed = ArenaReport.parse(data)
    expect(parsed.pareto[0].dominated).toBe(false)
    expect(parsed.pareto[1].dominated).toBe(true)
    expect(parsed.aggregated_scores.p1.a).toBe(5)
  })

  test('rejects invalid status', () => {
    expect(() => ArenaReport.parse({
      arena_id: 'x',
      created_at: '2026-05-14T05:00:00Z',
      config: {
        task: { id: 't', description: 'x' },
        judge: { criteria: [{ id: 'a', label: 'A' }] },
        participants: [
          { id: 'p1', name: 'p1', player: 'kimi', deck: 'd1' },
          { id: 'p2', name: 'p2', player: 'kimi', deck: 'd2' },
        ],
      },
      status: 'unknown',
    })).toThrow()
  })
})
PATCH_EOF

# ── Self-archive ──────────────────────────────────────────────────────────
cp "$0" "archived-patches/${PATCH_NAME}"
rm "$0"

echo "✅ pr-1 applied:"
echo "   - packages/lythoskill-test-utils/src/schema.ts (additive: 11 new schemas)"
echo "   - packages/lythoskill-test-utils/src/schema.test.ts (rewritten: old schema tests deleted, new mirror tests added)"
echo "   - Backups in archived-patches/ with timestamp ${STAMP}"
echo ""
echo "Verify: bun test packages/lythoskill-test-utils"
echo "Next: pr-2 (agent-bdd + judge consumer migration)"
