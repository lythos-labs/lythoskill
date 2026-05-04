import { z } from 'zod'

// ── P0: Judge Verdict ─────────────────────────────────────────────────────
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
  criteria: z.array(JudgeCriterion).default([]),
  raw_output: z.string().default(''),
  error: z.string().nullable().default(null),
  timestamp: z.string().datetime().optional(),
  scores: z.record(z.number().min(1).max(5)).optional(),
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
  combo: z.record(SkillEntry).optional(),
  transient: z.record(z.object({
    path: z.string().optional(),
    skills: z.array(z.string()).optional(),
    expires: z.string().optional(),
  })).optional(),
})
export type DeckConfig = z.infer<typeof DeckConfig>

// ── P0: Agent Scenario ────────────────────────────────────────────────────
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

// ── P1: Arena Manifest ────────────────────────────────────────────────────
// Anchored on: playground/arena-bdd-research/arena.json

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
  criteria: z.array(z.string()).min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
})
export type ArenaManifest = z.infer<typeof ArenaManifest>

// ── P1: Comparative Report ────────────────────────────────────────────────
// Anchored on: playground/arena-bdd-research/report.md (semantic structure)

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
