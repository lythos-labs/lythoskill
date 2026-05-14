#!/bin/bash
# PR: 20260514-105405-arena-consumer-judge-toml
#
# Step 2 — arena consumer adaptation: arena.toml [arena].judge field,
#    parseAgentMd stops extracting ## Judge, runAgentScenario accepts
#    judgeInput override, runner uses arena.judge → JudgeInput.
#
# Apply:  bash pr-20260514-105405-arena-consumer-judge-toml.sh
# Verify: bun test packages/lythoskill-test-utils packages/lythoskill-arena
# Rollback: cp archived-patches/<file>.<stamp>.bak to original location

set -e

PATCH_NAME="$(basename "$0")"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p archived-patches

for f in \
  packages/lythoskill-test-utils/src/agent-bdd.ts \
  packages/lythoskill-test-utils/src/agent-bdd.test.ts \
  packages/lythoskill-arena/src/arena-toml.ts \
  packages/lythoskill-arena/src/arena-toml.test.ts \
  packages/lythoskill-arena/src/runner.ts \
  packages/lythoskill-arena/src/cli.ts
do
  cp "$f" "archived-patches/$(echo $f | tr '/' '_').${STAMP}.bak"
done

# ═══════════════════════════════════════════════════════════════════════════
# agent-bdd.ts — parseAgentMd drops ## Judge; runAgentScenario + judgeInput
# ═══════════════════════════════════════════════════════════════════════════
cat > packages/lythoskill-test-utils/src/agent-bdd.ts << 'PATCH_EOF'
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { homedir } from 'node:os'
import type { AgentAdapter, AgentRunResult, CheckpointEntry } from './agents/types'
import { createSanitizer } from './sanitize'
import { readCheckpoints } from './bdd-runner'
import { runLLMJudge } from './judge'
import { AgentScenario as AgentScenarioSchema, type AgentScenario, type JudgeVerdict, type JudgeInput, type Evidence } from './schema'

// Re-export for backward compat
export type { AgentScenario, JudgeVerdict, JudgeCriterion, JudgeInput, Evidence } from './schema'

// ── Scenario result type ───────────────────────────────────────────────────

export interface AgentScenarioResult {
  scenario: AgentScenario
  agentResult: AgentRunResult
  checkpoints: CheckpointEntry[]
  verdict: JudgeVerdict | null
  artifactDir: string
}

// Detect the monorepo root for sanitization — walk up from this file
const PROJECT_ROOT = (() => {
  let dir = resolve(import.meta.dir, '..', '..', '..')
  if (!existsSync(join(dir, 'package.json'))) {
    dir = resolve(import.meta.dir, '..', '..', '..', '..')
  }
  return dir
})()

// ── Artifact collection (Gap F: recursive, file-only) ─────────────────────

const ARTIFACT_SKIP = new Set([
  '.claude', 'skill-deck.toml', 'skill-deck.lock', 'AGENTS.md',
  'agent-stdout.txt', 'agent-stderr.txt', 'judge-verdict.json', '_checkpoints',
])

function collectArtifacts(dir: string, rootDir: string): string[] {
  const result: string[] = []
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return result }
  for (const e of entries) {
    if (e.startsWith('.') || ARTIFACT_SKIP.has(e)) continue
    const full = join(dir, e)
    let stat
    try { stat = statSync(full) } catch { continue }
    if (stat.isDirectory()) {
      result.push(...collectArtifacts(full, rootDir))
    } else {
      result.push(relative(rootDir, full))
    }
  }
  return result
}

// ── parseAgentMd ───────────────────────────────────────────────────────────
// ## Judge section no longer extracted — judge criteria live in arena.toml
// or are passed as JudgeInput. Markdown is for LLM agents to read, not for
// regex-based structured-data extraction.

export function parseAgentMd(content: string): AgentScenario {
  const lines = content.split('\n')
  if (lines[0].trim() !== '---') {
    throw new Error('Invalid .agent.md: missing frontmatter')
  }
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (endIdx === -1) {
    throw new Error('Invalid .agent.md: frontmatter not closed')
  }

  const fmLines = lines.slice(1, endIdx)
  const body = lines.slice(endIdx + 1).join('\n')

  let name = 'unnamed agent scenario'
  let description = ''
  let timeout = 30000

  for (const line of fmLines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    let value = line.slice(colonIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key === 'name') name = value
    if (key === 'description') description = value
    if (key === 'timeout') timeout = Number(value) || 30000
  }

  // Extract sections — ## Judge is intentionally excluded.
  // Judge criteria live as natural-language text (arena.toml [arena].judge
  // or judge.md), passed via JudgeInput, not regex-parsed from markdown.
  const sectionRegex = /##\s*(Given|When|Then)\s*\n/i
  const sections: Record<string, string> = {}
  let pos = 0
  while (true) {
    const match = body.slice(pos).match(sectionRegex)
    if (!match) break
    const secStart = pos + match.index! + match[0].length
    const nextMatch = body.slice(secStart).match(sectionRegex)
    const secEnd = nextMatch ? secStart + nextMatch.index! : body.length
    sections[match[1].toLowerCase()] = body.slice(secStart, secEnd).trim()
    pos = secStart
  }

  if (!sections.when) {
    throw new Error('Invalid .agent.md: missing ## When')
  }

  // Parse Given — look for deck declaration bullets
  const givenDeck: Record<string, unknown> = {}
  const givenText = sections.given || ''
  const toolMatch = givenText.match(/tool skills?:\s*([^\n]+)/i)
  if (toolMatch) {
    const items = toolMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean)
    givenDeck.tool = {}
    for (const item of items) {
      let alias = item
      let path = `github.com/foo/bar/${item}`
      const parenMatch = item.match(/^([^(]+)\s*\(([^)]+)\)\s*$/)
      if (parenMatch) {
        alias = parenMatch[1].trim()
        path = `${parenMatch[2].trim()}/${alias}`
      }
      givenDeck.tool[alias] = { path }
    }
  }

  // Parse Then bullets
  const thenBullets: string[] = []
  const thenText = sections.then || ''
  for (const line of thenText.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      thenBullets.push(trimmed.slice(2).trim())
    }
  }

  const result = {
    name,
    description,
    timeout,
    given: { deck: givenDeck as Record<string, { path: string }> },
    when: sections.when,
    then: thenBullets,
    judge: '',  // no longer extracted from markdown
  }

  return AgentScenarioSchema.parse(result)
}

// ── runAgentScenario ───────────────────────────────────────────────────────

export async function runAgentScenario(opts: {
  scenarioPath?: string
  scenario?: AgentScenario
  agent: AgentAdapter
  setupWorkdir: (scenario: AgentScenario, workdir: string) => void | Promise<void>
  judgeAgent?: AgentAdapter
  /** Optional override — when provided, used directly instead of building from scenario.judge */
  judgeInput?: JudgeInput
  baseDir?: string
  timeoutMs?: number
  idleTimeoutMs?: number
}): Promise<AgentScenarioResult> {
  const {
    scenarioPath,
    scenario: prebuilt,
    agent,
    setupWorkdir,
    judgeAgent,
    judgeInput: externalJudgeInput,
    baseDir,
    timeoutMs,
    idleTimeoutMs,
  } = opts

  if (!prebuilt && !scenarioPath) {
    throw new Error('runAgentScenario: scenario or scenarioPath is required')
  }

  const scenario = prebuilt ?? parseAgentMd(readFileSync(scenarioPath!, 'utf-8'))

  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

  const artifactDir = join(
    baseDir ?? join(PROJECT_ROOT, 'runs', 'agent-bdd'),
    stamp,
    scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  )

  mkdirSync(artifactDir, { recursive: true })

  // Deck-specific workdir setup (writes skill-deck.toml, etc.)
  await setupWorkdir(scenario, artifactDir)

  const agentResult = await agent.spawn({
    cwd: artifactDir,
    brief: scenario.when,
    timeoutMs: timeoutMs ?? scenario.timeout,
    idleTimeoutMs,
  })

  // Sanitize and persist agent output
  const sanitizer = createSanitizer({
    projectRoot: PROJECT_ROOT,
    homeDir: homedir(),
    workDir: artifactDir,
  })

  writeFileSync(join(artifactDir, 'agent-stdout.txt'), sanitizer.sanitize(agentResult.stdout), 'utf-8')
  writeFileSync(join(artifactDir, 'agent-stderr.txt'), sanitizer.sanitize(agentResult.stderr), 'utf-8')

  const checkpoints = readCheckpoints(artifactDir)

  // Collect agent-produced files recursively
  const artifactFiles = collectArtifacts(artifactDir, artifactDir)

  // Determine judge input: external override takes priority,
  // then legacy scenario.judge, otherwise skip judging entirely.
  let verdict: JudgeVerdict | null = null
  const effectiveJudgeInput = externalJudgeInput ?? (scenario.judge ? { criteria: scenario.judge, task_context: scenario.description } as JudgeInput : null)

  if (effectiveJudgeInput) {
    const judge = judgeAgent ?? agent
    const evidence: Evidence = {
      sandbox_cwd: artifactDir,
      stdout: agentResult.stdout,
      stderr: agentResult.stderr,
      artifact_files: artifactFiles,
    }
    const judgeResult = await runLLMJudge(effectiveJudgeInput, evidence, checkpoints, judge)

    writeFileSync(
      join(artifactDir, 'judge-verdict.json'),
      JSON.stringify(
        {
          verdict: judgeResult.verdict?.verdict ?? null,
          reason: judgeResult.verdict?.reason ?? null,
          criteria: judgeResult.verdict?.criteria ?? null,
          raw_output: judgeResult.raw,
          error: judgeResult.error ?? null,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    )

    verdict = judgeResult.verdict
  } else {
    writeFileSync(
      join(artifactDir, 'judge-verdict.json'),
      JSON.stringify(
        {
          verdict: null,
          reason: 'No judge criteria provided — arena.toml [arena].judge or scenario.judge both absent',
          error: null,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    )
  }

  return {
    scenario,
    agentResult,
    checkpoints,
    verdict,
    artifactDir,
  }
}
PATCH_EOF

# ═══════════════════════════════════════════════════════════════════════════
# arena-toml.ts — add [arena].judge field, make criteria optional
# ═══════════════════════════════════════════════════════════════════════════
cat > packages/lythoskill-arena/src/arena-toml.ts << 'PATCH_EOF'
import { z } from 'zod'
import type { ArenaManifest } from '@lythos/test-utils/schema'

// ── arena.toml Zod schema (declarative input, k8s-manifest style) ──────────
// Anchored on: ADR-20260502110308316

export const SideEnv = z.object({
  container: z.string().optional(),
  pre_run: z.array(z.string()).default([]),
  working_dir: z.string().optional(),
  env_vars: z.record(z.string()).default({}),
})
export type SideEnv = z.infer<typeof SideEnv>

export const Side = z.object({
  name: z.string(),
  player: z.string(),              // reference to player config (useAgent resolves)
  deck: z.string(),                // path to deck.toml
  control: z.boolean().default(false),
  env: SideEnv.default({}),
})
export type Side = z.infer<typeof Side>

export const ArenaToml = z.object({
  arena: z.object({
    task: z.string(),              // task description or path to TASK.agent.md
    // judge: path to judge.md file (preferred) or inline natural-language criteria text.
    // When present, readFileSync + pass as JudgeInput.criteria directly — no parsing.
    // If absent, fall back to criteria string[] (legacy, each string becomes a bullet).
    judge: z.string().optional().describe('Path to judge.md (natural-language criteria for the judge LLM) or inline criteria text. No parsing — passed directly as JudgeInput.criteria.'),
    criteria: z.array(z.string()).optional().describe('Legacy string criteria. Each becomes a bullet in generated judge prompt. Use judge for full natural-language criteria.'),
    runs_per_side: z.number().int().positive().default(1),
    max_participants: z.number().int().min(2).max(5).default(5),
    model: z.string().optional(),  // e.g. "claude-sonnet-4-6"
    endpoint: z.string().optional(), // e.g. "api.anthropic.com"
    notes: z.string().optional(),  // freeform reproducibility notes
  }).refine(
    data => !!(data.judge || (data.criteria && data.criteria.length > 0)),
    { message: 'At least one of arena.judge or arena.criteria must be provided' }
  ),
  side: z.array(Side).min(2).max(5),
})
export type ArenaToml = z.infer<typeof ArenaToml>

// ── Parser ─────────────────────────────────────────────────────────────────

export function parseArenaToml(content: string): ArenaToml {
  const parsed = parseToml(content)
  return ArenaToml.parse(parsed)
}

// ── Plan generation (pure function, dry-run visible) ───────────────────────

export interface ExecutionCell {
  side: string                     // side name
  player: string                   // player reference
  deck: string                     // deck path
  run: number                      // 1-indexed run number
  control: boolean
}

export interface ExecutionPlan {
  task: string
  judge: string | null             // resolved judge text (from judge.md or inline)
  cells: ExecutionCell[]
  total_runs: number
}

export function buildExecutionPlan(toml: ArenaToml): ExecutionPlan {
  const cells: ExecutionCell[] = []
  for (const side of toml.side) {
    for (let run = 1; run <= toml.arena.runs_per_side; run++) {
      cells.push({
        side: side.name,
        player: side.player,
        deck: side.deck,
        run,
        control: side.control,
      })
    }
  }
  return {
    task: toml.arena.task,
    judge: toml.arena.judge ?? null,
    cells,
    total_runs: cells.length,
  }
}

// ── Minimal TOML parser (handles the arena.toml subset without external dep) ──

function parseToml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let currentTable: Record<string, unknown> = result
  let currentTableKey = ''
  const arrayTables: Map<string, Record<string, unknown>[]> = new Map()

  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0].trim()
    if (!line) continue

    // [[array]]
    const arrayMatch = line.match(/^\[\[(.+?)\]\]$/)
    if (arrayMatch) {
      const key = arrayMatch[1] // e.g. "side"
      if (!arrayTables.has(key)) arrayTables.set(key, [])
      currentTable = {}
      arrayTables.get(key)!.push(currentTable)
      currentTableKey = key
      continue
    }

    // [section]
    const sectionMatch = line.match(/^\[(.+?)\]$/)
    if (sectionMatch) {
      const key = sectionMatch[1]
      if (key.includes('.')) {
        const [parent, child] = key.split('.')
        const parentArr = arrayTables.get(parent)
        if (parentArr && parentArr.length > 0) {
          currentTable = {}
          parentArr[parentArr.length - 1][child] = currentTable
        }
      } else {
        result[key] = {}
        currentTable = result[key] as Record<string, unknown>
      }
      currentTableKey = ''
      continue
    }

    // key = value
    const eqIdx = line.indexOf('=')
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim()
      let value = line.slice(eqIdx + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      // Array value: ["a", "b"]
      if (value.startsWith('[') && value.endsWith(']')) {
        const inner = value.slice(1, -1).trim()
        if (!inner) {
          currentTable[key] = []
        } else {
          const arr = inner.split(',').map(s => {
            const t = s.trim()
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
              return t.slice(1, -1)
            }
            return t
          })
          currentTable[key] = arr
        }
      } else if (value === 'true') {
        currentTable[key] = true
      } else if (value === 'false') {
        currentTable[key] = false
      } else if (/^-?\d+(\.\d+)?$/.test(value)) {
        currentTable[key] = Number(value)
      } else {
        currentTable[key] = value
      }
    }
  }

  for (const [key, arr] of arrayTables) {
    result[key] = arr
  }

  return result
}
PATCH_EOF

# ═══════════════════════════════════════════════════════════════════════════
# runner.ts — remove ## Judge hardcoding, assemble JudgeInput from arena
# ═══════════════════════════════════════════════════════════════════════════
cat > packages/lythoskill-arena/src/runner.ts << 'PATCH_EOF'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runAgentScenario, type AgentScenario } from '@lythos/test-utils/agent-bdd'
import { useAgent } from '@lythos/test-utils/agents'
try { await import('@lythos/agent-adapter-claude-sdk') } catch { /* package not installed */ }
try { await import('@lythos/agent-adapter-deepseek-serve') } catch { /* package not installed */ }
import { ArenaManifest, Player, type JudgeInput } from '@lythos/test-utils/schema'
import type { ArenaManifest as ArenaManifestType, JudgeVerdict } from '@lythos/test-utils/schema'
import { runComparativeJudge } from './comparative-judge'
import { parseArenaToml, buildExecutionPlan, type ArenaToml, type ExecutionPlan } from './arena-toml'
import { resolvePlayer, resolveSides } from './player'
import { aggregateAllStats } from './stats'
import type { SideStats } from './stats'
import { buildCopyPlan } from './preflight'

// ── Helpers ───────────────────────────────────────────────────────────────

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
}

// ── Declarative runner (arena.toml → execute) ─────────────────────────────

export interface ArenaResult {
  manifest: ArenaManifestType
  report: unknown
  stats: SideStats[]
  artifactsDir: string
}

/** Format an execution plan as readable CLI output (pure). */
export function formatPlanOutput(plan: ExecutionPlan): string[] {
  const lines: string[] = []
  const sideCount = new Set(plan.cells.map(c => c.side)).size
  lines.push(`\n📋 Dry-run: ${plan.total_runs} cells across ${sideCount} sides × ${plan.cells.length / Math.max(1, sideCount)} runs`)
  for (const cell of plan.cells) {
    lines.push(`   ${cell.side}/run-${cell.run}: ${cell.player} × ${cell.deck}${cell.control ? ' [control]' : ''}`)
  }
  return lines
}

/** Resolve judge text from arena.toml: file path → read; inline → pass through; absent → null */
function resolveJudgeText(toml: ArenaToml, configDir?: string): string | null {
  if (toml.arena.judge) {
    const p = toml.arena.judge
    // Try as a file path first
    const candidate = configDir ? resolve(configDir, p) : resolve(p)
    if (existsSync(candidate)) return readFileSync(candidate, 'utf-8')
    // Not a file — treat as inline criteria text
    return p
  }
  if (toml.arena.criteria && toml.arena.criteria.length > 0) {
    // Legacy string[]: each becomes a bullet
    return toml.arena.criteria.map(c => `- ${c}`).join('\n')
  }
  return null
}

export async function runArenaFromToml(opts: {
  toml: ArenaToml
  taskPath: string
  outDir?: string
  dryRun?: boolean
  log?: (msg: string) => void
  configDir?: string    // for resolving relative paths
}): Promise<ArenaResult | { plan: ReturnType<typeof buildExecutionPlan> }> {
  const { toml, taskPath, outDir, dryRun, log, configDir } = opts

  const resolvePath = (p: string) => {
    if (p.startsWith('/')) return p
    if (configDir) return resolve(configDir, p)
    return resolve(p)
  }

  const { path: taskAbs } = (() => {
    const candidate = resolvePath(taskPath)
    if (existsSync(candidate)) return { path: candidate }
    // Inline text — write a temp file without ## Judge hardcoding.
    // Judge text is assembled separately from arena.toml via resolveJudgeText.
    const tmp = join(tmpdir(), `arena-task-${stamp()}.agent.md`)
    writeFileSync(tmp, `---
name: arena task
description: ${taskPath.slice(0, 80)}
timeout: 120000
---

## Given
- Working directory with an empty project
- bun is available

## When
${taskPath}

## Then
- Complete the task above
- Write a summary to output.md
`)
    return { path: tmp, cleanup: () => { try { rmSync(tmp) } catch {} } }
  })()

  const resolvedToml: ArenaToml = {
    ...toml,
    side: toml.side.map(s => ({ ...s, deck: resolvePath(s.deck) })),
  }

  const plan = buildExecutionPlan(resolvedToml)

  // dry-run: return plan without executing (pure data, no side effects)
  if (dryRun) {
    for (const line of formatPlanOutput(plan)) {
      log?.(line)
    }
    return { plan }
  }

  const arenaId = `arena-${stamp()}`
  const artifactsDir = outDir || join(process.cwd(), 'runs', arenaId)
  const resolved = resolveSides(resolvedToml)

  // Build manifest
  const taskContent = existsSync(taskAbs)
    ? readFileSync(taskAbs, 'utf-8').slice(0, 200)
    : taskPath
  const manifest = ArenaManifest.parse({
    id: arenaId,
    created_at: new Date().toISOString(),
    task: taskContent,
    mode: 'decks',
    participants: [...new Map(resolved.map(r => [r.side.name, r])).values()].map(r => ({
      id: r.side.name,
      name: r.side.name,
      player: r.platform,
      deck: r.side.deck,
      description: `${r.playerName} × ${r.side.deck}`,
    })),
    criteria: resolvedToml.arena.criteria ?? [resolvedToml.arena.judge ?? 'completeness'],
    status: 'running',
  })

  mkdirSync(artifactsDir, { recursive: true })
  writeFileSync(join(artifactsDir, 'arena.json'), JSON.stringify(manifest, null, 2) + '\n')

  // Build JudgeInput from arena.toml — natural-language judge text, no parsing
  const judgeText = resolveJudgeText(resolvedToml, configDir)
  const judgeInput: JudgeInput | undefined = judgeText ? {
    criteria: judgeText,
    task_context: plan.task, // task description as context for judge
  } : undefined

  // Execute plan: per-cell agent run
  const verdictsBySide = new Map<string, JudgeVerdict[]>()

  for (const cell of plan.cells) {
    const cellDir = join(artifactsDir, 'runs', cell.side, `run-${cell.run}`)
    mkdirSync(cellDir, { recursive: true })

    const workDir = join(artifactsDir, 'work', cell.side)
    mkdirSync(workDir, { recursive: true })
    const originalCwd = process.cwd()

    try {
      process.chdir(workDir)

      const agent = useAgent(resolvePlayer(cell.player))
      const result = await runAgentScenario({
        scenarioPath: taskAbs,
        agent,
        async setupWorkdir(scenario: AgentScenario, workdir: string) {
          mkdirSync(workdir, { recursive: true })
          const deckContent = readFileSync(cell.deck, 'utf-8')
          writeFileSync(join(workdir, 'skill-deck.toml'), deckContent)

          writeFileSync(join(workdir, 'AGENTS.md'), [
            '# Arena Test Environment',
            '',
            `**Side**: ${cell.side}`,
            `**Player**: ${cell.player}`,
            `**Run**: ${cell.run}`,
            '',
            '## Task',
            '',
            scenario.description ?? '(no task description)',
            '',
            '## How This Works',
            '',
            '- This is an isolated arena test directory. No parent `.claude/skills/` exists.',
            '- Skills are configured in `skill-deck.toml` and symlinked by `deck link`.',
            '- Complete the task above using the available skills.',
            '- Output your work to this directory (or `output/` if specified).',
            '',
            '## Expected Output',
            '',
            'After completing the task, write a brief summary of what you did.',
          ].join('\n'))

          const linkProc = Bun.spawn(
            ['bunx', '@lythos/skill-deck', 'link'],
            { cwd: workdir, env: { ...process.env, HOME: process.env.HOME! } },
          )
          await linkProc.exited
          log?.(`[arena] deck link for ${cell.side}: exit ${linkProc.exitCode}`)
        },
        baseDir: workDir,
        judgeInput,  // ← assembled from arena.toml (resolveJudgeText)
      })

      process.chdir(originalCwd)

      const v = (result.verdict ?? {
        verdict: 'ERROR' as const,
        reason: 'No verdict returned',
        criteria: [],
      }) as JudgeVerdict

      writeFileSync(join(cellDir, 'agent-stdout.txt'), result.agentResult.stdout, 'utf-8')
      if (result.agentResult.stderr) {
        writeFileSync(join(cellDir, 'agent-stderr.txt'), result.agentResult.stderr, 'utf-8')
      }

      const skipSet = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock', 'AGENTS.md'])
      try {
        const entries = readdirSync(workDir)
        const plan = buildCopyPlan(workDir, cellDir, entries, skipSet)
        for (const { src, dest, name } of plan) {
          try {
            cpSync(src, dest, { recursive: true })
          } catch (e) {
            log?.(`⚠️ Failed to copy agent output: ${name} — ${e instanceof Error ? e.message : e}`)
          }
        }
      } catch (e) {
        log?.(`⚠️ Failed to read agent workdir for copy: ${e instanceof Error ? e.message : e}`)
      }

      writeFileSync(join(cellDir, 'judge-verdict.json'), JSON.stringify({
        ...v,
        agent_stdout: result.agentResult.stdout.slice(0, 5000),
        agent_stderr: result.agentResult.stderr.slice(0, 1000),
        duration_ms: result.agentResult.durationMs,
      }, null, 2) + '\n')

      if (!verdictsBySide.has(cell.side)) verdictsBySide.set(cell.side, [])
      verdictsBySide.get(cell.side)!.push(v)
    } catch (e) {
      const errVerdict: JudgeVerdict = {
        verdict: 'ERROR' as const,
        reason: `Runner exception: ${e instanceof Error ? e.message : String(e)}`,
        criteria: [],
      }
      writeFileSync(join(cellDir, 'judge-verdict.json'), JSON.stringify(errVerdict, null, 2) + '\n')
      if (!verdictsBySide.has(cell.side)) verdictsBySide.set(cell.side, [])
      verdictsBySide.get(cell.side)!.push(errVerdict)
    }
  }

  // Aggregate stats
  const stats = aggregateAllStats(verdictsBySide)

  // Comparative judge
  const flatVerdicts: { participantId: string; verdict: unknown }[] = []
  for (const [side, verdicts] of verdictsBySide) {
    if (verdicts.length > 0) {
      flatVerdicts.push({ participantId: side, verdict: verdicts[0] })
    }
  }

  const judge = useAgent(resolved[0]?.platform ?? 'claude')
  const report = await runComparativeJudge({
    manifest,
    verdicts: flatVerdicts,
    judge,
    workdir: artifactsDir,
  })

  // Write report
  writeReport(artifactsDir, manifest, report, stats)

  // Update manifest
  const finalManifest = ArenaManifest.parse({ ...manifest, status: 'completed' })
  writeFileSync(join(artifactsDir, 'arena.json'), JSON.stringify(finalManifest, null, 2) + '\n')

  return { manifest: finalManifest, report, stats, artifactsDir }
}

// ── Backward compat: CLI-flag style runner ─────────────────────────────────

export async function runArena(opts: {
  taskPath: string
  playerPaths: string[]
  deckPaths: string[]
  criteria: string[]
  outDir: string
}): Promise<{ manifest: ArenaManifestType; report: unknown; artifactsDir: string }> {
  const { taskPath, playerPaths, deckPaths, criteria, outDir } = opts

  const toml: ArenaToml = {
    arena: {
      task: readFileSync(resolve(taskPath), 'utf-8').slice(0, 200),
      criteria,
      runs_per_side: 1,
      max_participants: Math.min(playerPaths.length, deckPaths.length),
    },
    side: playerPaths.flatMap((playerPath, pi) =>
      deckPaths.map((deckPath, di) => ({
        name: `run-${String(pi * deckPaths.length + di + 1).padStart(2, '0')}`,
        player: Player.parse(JSON.parse(readFileSync(resolve(playerPath), 'utf-8'))).platform,
        deck: deckPath,
      }))
    ),
  }

  const result = await runArenaFromToml({ toml, taskPath, outDir })
  const { manifest, report, artifactsDir } = result as ArenaResult
  return { manifest, report, artifactsDir }
}

// ── Report renderer ────────────────────────────────────────────────────────

function writeReport(dir: string, manifest: ArenaManifestType, report: unknown & { score_matrix?: { participant_id: string; criterion: string; weight: number; score: number; rationale: string }[]; pareto?: { participant_id: string; dominated: boolean; dominated_by: string[] }[]; key_findings?: string[]; recommendations?: { audience: string; recommendation: string }[] }, stats: SideStats[]): void {
  const lines: string[] = [
    `# Arena Report: ${manifest.id}`,
    '',
    `**Task**: ${manifest.task}`,
    `**Criteria**: ${manifest.criteria.map(c => typeof c === 'string' ? c : c.label).join(', ')}`,
    `**Date**: ${new Date().toISOString()}`,
    '',
    '## Score Matrix',
    '',
    renderScoreMatrix(report),
    '',
    '## Per-Side Statistics',
    '',
    renderStatsTable(stats),
    '',
    '## Pareto Frontier',
    '',
    renderPareto(report),
    '',
    '## Key Findings',
    '',
    ...(report.key_findings ?? []).map((f: string) => `- ${f}`),
    '',
    '## Recommendations',
    '',
    ...(report.recommendations ?? []).map((r: { audience: string; recommendation: string }) => `- **${r.audience}**: ${r.recommendation}`),
  ]

  writeFileSync(join(dir, 'report.md'), lines.join('\n') + '\n')
}

function renderStatsTable(stats: SideStats[]): string {
  if (stats.length === 0) return 'No statistics available.\n'

  let table = `| Side | Runs | Pass Rate | Mean Confidence | Criteria |\n`
  table += `|------|------|-----------|-----------------|----------|\n`

  for (const s of stats) {
    const confStr = s.meanConfidence != null ? `${s.meanConfidence.toFixed(0)}%` : '-'
    const criteriaStr = s.criteria.map(c => `${c.name}: ${(c.mean * 100).toFixed(0)}%`).join(', ')
    table += `| ${s.sideName} | ${s.runs} | ${(s.passRate * 100).toFixed(0)}% | ${confStr} | ${criteriaStr} |\n`
  }

  return table
}

function renderScoreMatrix(report: unknown & { score_matrix?: { participant_id: string; criterion: string; weight: number; score: number; rationale: string }[] }): string {
  if (!report.score_matrix?.length) return 'No scores available.\n'

  const participants = [...new Set(report.score_matrix.map(s => s.participant_id))]
  const criteria = [...new Set(report.score_matrix.map(s => s.criterion))]

  let table = `| Criterion | Weight | ${participants.join(' | ')} |\n`
  table += `|${'---|'.repeat(2 + participants.length)}\n`

  for (const c of criteria) {
    table += `| ${c} | 25% | ${participants.map(p => {
      const cell = report.score_matrix!.find(s => s.participant_id === p && s.criterion === c)
      return `**${cell?.score ?? '?'}**`
    }).join(' | ')} |\n`
  }

  table += `| **Weighted Total** | 100% | ${participants.map(p => {
    const pScores = report.score_matrix!.filter(s => s.participant_id === p)
    const avg = pScores.length ? pScores.reduce((sum, s) => sum + s.score, 0) / pScores.length : 0
    return `**${avg.toFixed(1)}**`
  }).join(' | ')} |\n`

  return table
}

function renderPareto(report: unknown & { pareto?: { participant_id: string; dominated: boolean; dominated_by: string[] }[] }): string {
  if (!report.pareto?.length) return 'No Pareto analysis.\n'
  return report.pareto.map(p =>
    p.dominated
      ? `- **${p.participant_id}**: dominated by ${p.dominated_by.join(', ')}`
      : `- **${p.participant_id}**: Pareto-optimal (non-dominated)`
  ).join('\n')
}
PATCH_EOF

# ═══════════════════════════════════════════════════════════════════════════
# cli.ts — singleRun: drop hardcoded judge from --brief inline scenario
# ═══════════════════════════════════════════════════════════════════════════
cat > packages/lythoskill-arena/src/cli.ts << 'CLI_PATCH_EOF'
import { writeFileSync, readFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { ZodError } from 'zod'
import { formatPlanOutput, type ArenaResult } from './runner'
import { parseArenaToml, buildExecutionPlan } from './arena-toml'
import { buildCopyPlan, parseDeckSkills } from './preflight'
import { checkSkillExistence, formatSkillWarnings, resolveColdPoolDir } from './preflight'

// ─── fetchWithProxy (infra dependency, no package boundary) ─────────────────

async function fetchWithProxy(url: string, init?: RequestInit): Promise<Response> {
  const { LYTHOS_SOCKS_PROXY } = process.env
  if (!LYTHOS_SOCKS_PROXY) return fetch(url, init)
  const [host, portStr] = LYTHOS_SOCKS_PROXY.split(':')
  const port = parseInt(portStr || '1086', 10)
  if (!host) return fetch(url, init)
  try {
    const net = await import('node:net')
    const tls = await import('node:tls')
    const u = new URL(url)
    const isHttps = u.protocol === 'https:'
    const targetHost = u.hostname
    const targetPort = parseInt(u.port || (isHttps ? '443' : '80'), 10)
    const socket = await new Promise<import('node:net').Socket>((resolve, reject) => {
      const s = net.connect({ host, port }, () => resolve(s))
      s.on('error', reject)
    })
    try {
      if (isHttps) {
        await new Promise<void>((res, rej) => {
          socket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n\r\n`)
          socket.once('data', (d: Buffer) => {
            const status = d.toString().split(' ')[1]
            if (status === '200') res()
            else rej(new Error(`SOCKS CONNECT rejected: ${status}`))
          })
        })
      }
      const agent = isHttps
        ? new tls.TLSSocket(socket, { isServer: false, servername: targetHost })
        : socket
      await new Promise<void>((res) => agent.once('secureConnect', res).once('connect', res))
      const method = init?.method ?? 'GET'
      const headers = init?.headers ? new Headers(init.headers) : new Headers()
      headers.set('Host', targetHost)
      const req = `${method} ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n`
      let headerBlock = req
      for (const [k, v] of headers) headerBlock += `${k}: ${v}\r\n`
      headerBlock += '\r\n'
      agent.write(headerBlock)

      let body = init?.body
      if (body && init?.duplex !== 'half') {
        if (typeof body === 'string') agent.write(body)
        else agent.write(Buffer.from(await (body as Blob).arrayBuffer()))
      }
      agent.end()

      const chunks: Buffer[] = []
      for await (const chunk of agent) chunks.push(chunk as Buffer)
      const raw = Buffer.concat(chunks).toString()
      const headEnd = raw.indexOf('\r\n\r\n')
      const status = parseInt(raw.split(' ')[1] || '200', 10)
      return new Response(raw.slice(headEnd + 4), { status })
    } finally { socket.destroy() }
  } catch (e) { throw e }
}

// ── Link validation ────────────────────────────────────────────────────────
// "no skills found to symlink" is a warning, not an error — a deck may
// legitimately have only innate/innate-only cards.

function validateLinkResult(exitCode: number | null, stderr: string): { ok: boolean; error?: string } {
  if (exitCode === 0) return { ok: true }
  if (stderr.includes('Cannot find module')) {
    return { ok: false, error: `deck link failed: @lythos/skill-deck not installed or not found. Run: bun install` }
  }
  if (stderr.includes('no skills found to symlink')) return { ok: true }
  return { ok: false, error: `deck link exited with code ${exitCode}: ${stderr.slice(0, 200)}` }
}

// ═══════════════════════════════════════════════════════════════════════════
export async function main(args: string[] = process.argv.slice(2)) {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`lythoskill-arena — skill evaluation CLI

Usage:
  lythoskill-arena single|vs|viz <options>

Commands:
  single   Test one deck against a task (--deck + --brief or --task)
  vs       Compare decks via arena.toml (declarative, Pareto-optimal)
  viz      Visualize a completed arena run (HTML + chart)

Examples:
  lythoskill-arena single --brief "find and research" --deck ./decks/scout.toml
  lythoskill-arena single --brief "find and research" --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml
  lythoskill-arena vs --config arena.toml --dry-run
  lythoskill-arena vs --config arena.toml
  lythoskill-arena viz runs/arena-20260504
`)
    process.exit(0)
  }
  return cli(args)
}

function cli(args: string[]) {
  const cmd = args[0]
  const rest = args.slice(1)

  if (cmd === 'vs' || cmd === 'compare') return vsRun(rest)
  if (cmd === 'single' || cmd === 'run') return singleRun(rest)
  if (cmd === 'viz') return vizRun(rest)

  console.error(`Unknown command: ${cmd}`)
  process.exit(1)
}

// ── single: single-player deck test (exec shortcut) ──────────────────────

async function singleRun(args: string[]) {
  const opts: Record<string, string | undefined> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task' || args[i] === '-t') opts.task = args[++i]
    else if (args[i] === '--brief' || args[i] === '-b') opts.brief = args[++i]
    else if (args[i] === '--deck' || args[i] === '-d') opts.deck = args[++i]
    else if (args[i] === '--player' || args[i] === '-p') opts.player = args[++i]
    else if (args[i] === '--out' || args[i] === '-o') opts.out = args[++i]
    else if (args[i] === '--timeout') opts.timeout = args[++i]
  }

  if (!opts.deck) {
    console.error(`❌ --deck <path|url> is required.
   --deck accepts local paths and http/https URLs (auto-fetched).

   Example (no local file needed — URL is auto-fetched):
     lythoskill-arena single \\
       --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml \\
       --brief "your task"

   Or with a local deck file you already have:
     lythoskill-arena single --deck ./examples/decks/scout.toml --brief "your task"`)
    process.exit(1)
  }
  if (!opts.task && (!opts.brief || !opts.brief.trim())) {
    console.error(`❌ --task <path> or --brief "<text>" is required.
   --task reads a .agent.md scenario file; --brief takes inline text.

   Example (no local file needed — URL is auto-fetched):
     lythoskill-arena single \\
       --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml \\
       --brief "your task"

   Or with a local deck file:
     lythoskill-arena single --deck ./examples/decks/scout.toml --brief "your task"`)
    process.exit(1)
  }

  let resolvedTaskPath: string | undefined
  if (opts.task) {
    resolvedTaskPath = resolve(opts.task)
    if (!existsSync(resolvedTaskPath)) {
      console.error(`❌ Task file not found: ${resolvedTaskPath}
   Use --brief for inline tasks, or point --task to an existing .agent.md file.
   Format: name + description + Given/When/Then sections.

   Example (URL):  lythoskill-arena single --brief "your task" --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml
   Or (local):     lythoskill-arena single --brief "your task" --deck ./examples/decks/scout.toml`)
      process.exit(1)
    }
    const raw = readFileSync(resolvedTaskPath, 'utf-8')
    if (!raw.startsWith('---')) {
      console.error(`❌ Invalid .agent.md: missing frontmatter (must start with "---")
   Correct format:
   ---
   name: my-scenario
   description: what this tests
   timeout: 120000
   ---
   ## Given
   ...
   ## When
   ...
   ## Then
   ...`)
      process.exit(1)
    }
    if (!raw.includes('## When')) {
      console.error(`❌ Invalid .agent.md: missing "## When" section.
   The ## When section defines what the agent should do.
   See template: playground/arena-one-shot/TASK-arena.agent.md`)
      process.exit(1)
    }
  }

  const { existsSync: deckExists, writeFileSync: deckWrite } = await import('node:fs')
  let deckPath: string
  if (opts.deck.startsWith('http://') || opts.deck.startsWith('https://')) {
    let url = opts.deck
    try {
      const u = new URL(url)
      if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
        url = `https://raw.githubusercontent.com${u.pathname.replace('/blob/', '/')}`
      }
    } catch (e: any) {
      if (e.code !== 'ERR_INVALID_URL') console.debug(`deck URL parse skipped (not a URL): ${url}`)
    }
    const { mirrorUrls, isLikelyGitHubBlock } = await import('../../lythoskill-cold-pool/src/mirror.js')
    const dest = resolve(process.cwd(), 'arena-deck.toml')
    console.log(`📥 Fetching arena deck: ${url}`)
    let res: Response | undefined
    let allFailed = true

    try { res = await fetchWithProxy(url, { signal: AbortSignal.timeout(30_000) }); if (res.ok) allFailed = false } catch {}

    if (!res?.ok) {
      for (const mirrorUrl of mirrorUrls(url)) {
        try {
          console.log(`   ↳ trying mirror: ${mirrorUrl}`)
          const r = await fetchWithProxy(mirrorUrl, { signal: AbortSignal.timeout(30_000) })
          if (r.ok) { res = r; allFailed = false; break }
        } catch {}
      }
    }

    if (!res?.ok) {
      const errorDetail = res ? `HTTP ${res.status}` : 'unreachable'
      console.error(`❌ Cannot reach ${url} (${errorDetail})`)
      if (allFailed) console.error('   Set LYTHOSKILL_GH_MIRROR to use a custom mirror.')
      console.error('   Or download manually and reference the local file.')
      process.exit(1)
    }

    deckWrite(dest, await res.text())
    console.log(`   → saved to ${dest}`)
    deckPath = dest
  } else {
    deckPath = resolve(opts.deck)
    if (!deckExists(deckPath)) { console.error(`❌ Deck file not found: ${deckPath}
   Make sure the path is correct, or use a URL:
     --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml
   (URLs are auto-fetched — no local file needed)`); process.exit(1) }
  }

  const { useAgent } = await import('@lythos/test-utils/agents')
  try { await import('@lythos/agent-adapter-claude-sdk') } catch { /* package not installed */ }
  try { await import('@lythos/agent-adapter-deepseek-serve') } catch { /* package not installed */ }
  try { await import('@lythos/agent-adapter-codex') } catch { /* package not installed */ }
  const { runAgentScenario } = await import('@lythos/test-utils/agent-bdd')
  const { resolvePlayer } = await import('./player')

  const player = resolvePlayer(opts.player ?? 'kimi')
  const agent = useAgent(player)
  const outDir = opts.out ? resolve(opts.out) : join(process.cwd(), `agent-output-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`)
  mkdirSync(outDir, { recursive: true })

  // Resolve task: --brief builds scenario directly, --task uses pre-validated path.
  // Neither path hardcodes judge criteria — single-run is agent execution only.
  // Judge is skipped unless a future `--judge <path>` flag is added.
  const scenarioOpt: Record<string, unknown> = {}
  if (resolvedTaskPath) {
    scenarioOpt.scenarioPath = resolvedTaskPath
  } else {
    scenarioOpt.scenario = {
      name: 'ad-hoc task',
      description: opts.brief!.slice(0, 80),
      timeout: Number(opts.timeout ?? 120000),
      given: { deck: {} },
      when: opts.brief!,
      then: ['Write your output to output.md', 'The output should be complete and well-structured'],
      judge: '',  // no hardcoded judge — criteria come from arena.toml, not inline
    }
  }

  console.log(`🤖 agent-run: ${player} × ${deckPath}`)
  if (opts.task) console.log(`📋 task: ${resolve(opts.task!)}`)
  else console.log(`📋 brief: ${opts.brief!.slice(0, 60)}...`)

  let agentWorkdir = ''
  const result = await runAgentScenario({
    ...scenarioOpt,
    agent,
    async setupWorkdir(_scenario, workdir) {
      agentWorkdir = workdir
      mkdirSync(workdir, { recursive: true })
      writeFileSync(join(workdir, 'skill-deck.toml'), readFileSync(deckPath, 'utf-8'))

      const deckRaw = readFileSync(join(workdir, 'skill-deck.toml'), 'utf-8')
      let deckParsed: Record<string, any> = {}
      try { deckParsed = Bun.TOML.parse(deckRaw) as Record<string, any> } catch {}
      const hasSkills = parseDeckSkills(deckParsed).length > 0

      if (hasSkills) {
        const { existsSync: es2 } = await import('node:fs')
        const localDeckCli = join(import.meta.dir, '..', '..', 'lythoskill-deck', 'src', 'cli.ts')
        const linkCmd = es2(localDeckCli)
          ? ['bun', localDeckCli, 'link']
          : ['bunx', '@lythos/skill-deck', 'link']
        const linkProc = Bun.spawn(linkCmd,
          { cwd: workdir, env: { ...process.env, HOME: process.env.HOME! } },
        )
        await linkProc.exited
        const linkStderr = await new Response(linkProc.stderr).text()
        const linkResult = validateLinkResult(linkProc.exitCode, linkStderr)
        if (!linkResult.ok) {
          console.error(`❌ ${linkResult.error}`)
          process.exit(1)
        }
      } else {
        console.log('ℹ️  No skills declared in deck — skipping link')
      }

      const { existsSync: es } = await import('node:fs')
      const { homedir: hd } = await import('node:os')
      try {
        const coldPoolDefault = join(hd(), '.agents', 'skill-repos')
        const coldPoolDir = resolveColdPoolDir(
          deckParsed?.deck?.cold_pool,
          hd(),
          coldPoolDefault
        )
        const skills = parseDeckSkills(deckParsed)
        const checks = checkSkillExistence(skills, coldPoolDir, es)
        for (const warning of formatSkillWarnings(checks)) {
          console.warn(`⚠️  ${warning}`)
        }
      } catch (e) {
        console.warn('⚠️  Could not check skill existence:', e instanceof Error ? e.message : e)
      }
    },
  })

  // ── Copy agent output to outDir ──────────────────────────────────
  writeFileSync(join(outDir, 'agent-stdout.txt'), result.agentResult.stdout, 'utf-8')
  if (result.agentResult.stderr) writeFileSync(join(outDir, 'agent-stderr.txt'), result.agentResult.stderr, 'utf-8')
  if (result.verdict) writeFileSync(join(outDir, 'judge-verdict.json'), JSON.stringify(result.verdict, null, 2) + '\n', 'utf-8')

  if (agentWorkdir) {
    const { cpSync, readdirSync, existsSync: es2 } = await import('node:fs')
    if (!es2(agentWorkdir)) {
      console.warn(`⚠️  Agent workdir vanished before copy: ${agentWorkdir}`)
    } else {
      const skipSet = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock'])
      try {
        const entries = readdirSync(agentWorkdir)
        const plan = buildCopyPlan(agentWorkdir, outDir, entries, skipSet)
        for (const { src, dest, name } of plan) {
          try {
            cpSync(src, dest, { recursive: true })
          } catch (e) {
            console.warn(`⚠️  Failed to copy agent output: ${name} — ${e instanceof Error ? e.message : e}`)
          }
        }
      } catch (e) {
        console.warn(`⚠️  Failed to copy agent output: ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n✅ Agent run complete → ${outDir}`)
  console.log(`   deck: ${deckPath}`)
  console.log(`   player: ${player}`)
  if (result.verdict) console.log(`   verdict: ${result.verdict.verdict}`)
}

// ── vs: arena.toml-driven comparison ──────────────────────────────────────

async function vsRun(args: string[]) {
  // Native TOML parser is simpler than adding smol-toml dependency
  const opts: Record<string, string | undefined> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' || args[i] === '-c') opts.config = args[++i]
    else if (args[i] === '--out' || args[i] === '-o') opts.out = args[++i]
    else if (args[i] === '--dry-run') opts.dryRun = 'true'
    else if (args[i] === '--player' || args[i] === '-p') opts.player = args[++i]
  }

  if (!opts.config) {
    console.error('❌ arena.toml path required: lythoskill-arena vs --config arena.toml')
    process.exit(1)
  }

  const configPath = resolve(opts.config)
  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`)
    process.exit(1)
  }

  const toml = parseArenaToml(readFileSync(configPath, 'utf-8'))

  if (opts.player) {
    // Override all sides' player for --player flag
    for (const side of toml.side) {
      ;(side as Record<string, unknown>).player = opts.player
    }
  }

  const taskPath = toml.arena.task
  const isDryRun = opts.dryRun === 'true'

  if (isDryRun) {
    console.log(`🔍 Scanning arena.toml: ${configPath}`)
  } else {
    console.log(`🏟  Arena VS: ${configPath}`)
    console.log(`   sides: ${toml.side.length}`)
    console.log(`   runs per side: ${toml.arena.runs_per_side}`)
  }

  const { runArenaFromToml } = await import('./runner')
  const result = await runArenaFromToml({
    toml,
    taskPath,
    outDir: opts.out ? resolve(opts.out) : undefined,
    dryRun: isDryRun,
    log: console.log,
    configDir: resolve(configPath, '..'),
  })

  if ('plan' in result) {
    if (!isDryRun) console.log('📋 Execution plan (dry-run):')
    for (const line of formatPlanOutput(result.plan)) console.log(line)
  } else if ('manifest' in result) {
    const r = result
    console.log(`\n📊 Arena complete: ${r.manifest.id}`)
    console.log(`   report: ${r.artifactsDir}/report.md`)
    console.log(`   participants: ${r.manifest.participants.map(p => p.name).join(', ')}`)
  }
}

// ── viz: generate HTML report from arena.json ─────────────────────────────

async function vizRun(args: string[]) {
  const runsDir = args.find(a => !a.startsWith('-'))
  if (!runsDir) { console.error('❌ runs/<arena-id> path required: lythoskill-arena viz runs/arena-20260504'); process.exit(1) }

  const arenaJsonPath = resolve(runsDir, 'arena.json')
  if (!existsSync(arenaJsonPath)) { console.error(`❌ arena.json not found in: ${runsDir}`); process.exit(1) }

  console.log(`📈 Arena HTML report not yet implemented. See report.md in ${runsDir}/`)
}

// ── Entry point ────────────────────────────────────────────────────────────
if (import.meta.main) {
  main().catch(err => {
    if (err instanceof ZodError) {
      console.error('❌ Schema validation failed:')
      for (const issue of err.issues) {
        console.error(`   - ${issue.path.join('.')}: ${issue.message}`)
      }
    } else {
      console.error('❌', err instanceof Error ? err.message : err)
    }
    process.exit(1)
  })
}
CLI_PATCH_EOF

# ═══════════════════════════════════════════════════════════════════════════
# arena-toml.test.ts — add judge field test, update criteria-required test
# ═══════════════════════════════════════════════════════════════════════════
cat > packages/lythoskill-arena/src/arena-toml.test.ts << 'PATCH_EOF'
import { describe, test, expect } from 'bun:test'
import { parseArenaToml, buildExecutionPlan, ArenaToml } from './arena-toml'
import { formatPlanOutput } from './runner'

const minimalToml = `
[arena]
task = "Test task"
criteria = ["a", "b"]

[[side]]
name = "runner-a"
player = "claude-code"
deck = "./decks/a.toml"

[[side]]
name = "runner-b"
player = "claude-code"
deck = "./decks/b.toml"
`

const judgeToml = `
[arena]
task = "Test task"
judge = "Evaluate completeness and correctness. Return JSON."

[[side]]
name = "runner-a"
player = "claude-code"
deck = "./decks/a.toml"

[[side]]
name = "runner-b"
player = "claude-code"
deck = "./decks/b.toml"
`

const fullToml = `
[arena]
task = "Generate auth flow diagram"
criteria = ["syntax", "context", "logic", "token"]
runs_per_side = 3

[[side]]
name = "minimal"
player = "standard-coder"
deck = "./decks/minimal.toml"

[[side]]
name = "rich"
player = "expert-architect"
deck = "./decks/rich.toml"

[[side]]
name = "baseline"
player = "standard-coder"
deck = "./decks/baseline.toml"
control = true

[side.env]
container = "node:20-alpine"
pre_run = ["npm ci", "npm run build"]
working_dir = "/workspace"
`

describe('parseArenaToml', () => {
  test('parses minimal two-side arena with criteria', () => {
    const result = parseArenaToml(minimalToml)
    expect(result.arena.task).toBe('Test task')
    expect(result.arena.criteria).toEqual(['a', 'b'])
    expect(result.arena.runs_per_side).toBe(1)
    expect(result.side).toHaveLength(2)
    expect(result.side[0].name).toBe('runner-a')
    expect(result.side[0].player).toBe('claude-code')
    expect(result.side[0].deck).toBe('./decks/a.toml')
    expect(result.side[0].control).toBe(false)
  })

  test('parses arena with judge field (preferred over criteria)', () => {
    const result = parseArenaToml(judgeToml)
    expect(result.arena.judge).toContain('Evaluate completeness')
    expect(result.arena.criteria).toBeUndefined()
    expect(result.side).toHaveLength(2)
  })

  test('parses full arena with runs_per_side and control', () => {
    const result = parseArenaToml(fullToml)
    expect(result.arena.runs_per_side).toBe(3)
    expect(result.side).toHaveLength(3)
    expect(result.side[2].name).toBe('baseline')
    expect(result.side[2].control).toBe(true)
  })

  test('parses side env block', () => {
    const result = parseArenaToml(fullToml)
    const env = result.side[2].env
    expect(env.container).toBe('node:20-alpine')
    expect(env.pre_run).toEqual(['npm ci', 'npm run build'])
    expect(env.working_dir).toBe('/workspace')
    expect(env.env_vars).toEqual({})
  })

  test('rejects fewer than 2 sides', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = ["a"]\n\n[[side]]\nname = "only"\nplayer = "c"\ndeck = "x.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  test('rejects neither judge nor criteria provided', () => {
    const bad = `[arena]\ntask = "x"\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  test('accepts judge without criteria (either is sufficient)', () => {
    const toml = `[arena]\ntask = "x"\njudge = "Evaluate this."\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(toml)).not.toThrow()
  })

  test('rejects empty criteria and no judge', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = []\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  test('rejects non-object input', () => {
    expect(() => ArenaToml.parse('not valid')).toThrow()
  })

  test('rejects missing arena section', () => {
    expect(() => parseArenaToml('[[side]]\nname = "a"')).toThrow()
  })

  test('rejects runs_per_side = 0', () => {
    const bad = `[arena]\ntask = "x"\ncriteria = ["a"]\nruns_per_side = 0\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    expect(() => parseArenaToml(bad)).toThrow()
  })

  test('parses integer and boolean values correctly', () => {
    const toml = `[arena]\ntask = "x"\ncriteria = ["a"]\nruns_per_side = 2\nmax_participants = 5\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    const result = parseArenaToml(toml)
    expect(result.arena.runs_per_side).toBe(2)
    expect(result.arena.max_participants).toBe(5)
  })

  test('comments are stripped', () => {
    const toml = `[arena]\n# this is a comment\ntask = "x"\ncriteria = ["a"]\n\n[[side]]\nname = "a"\nplayer = "c"\ndeck = "a.toml"\n\n[[side]]\nname = "b"\nplayer = "c"\ndeck = "b.toml"`
    const result = parseArenaToml(toml)
    expect(result.arena.task).toBe('x')
  })
})

describe('buildExecutionPlan', () => {
  test('generates plan: 2 sides × 1 run = 2 cells', () => {
    const toml = parseArenaToml(minimalToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.task).toBe('Test task')
    expect(plan.judge).toBeNull()
    expect(plan.cells).toHaveLength(2)
    expect(plan.total_runs).toBe(2)
  })

  test('generates plan with judge field populated', () => {
    const toml = parseArenaToml(judgeToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.judge).toContain('Evaluate completeness')
  })

  test('generates plan: 3 sides × 3 runs = 9 cells', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.cells).toHaveLength(9)
    expect(plan.total_runs).toBe(9)
  })

  test('control flag preserved in plan cells', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    const baselineCells = plan.cells.filter(c => c.side === 'baseline')
    expect(baselineCells).toHaveLength(3)
    expect(baselineCells.every(c => c.control)).toBe(true)
  })

  test('dry-run: plan is pure data, no side effects', () => {
    const toml = parseArenaToml(fullToml)
    const plan = buildExecutionPlan(toml)
    expect(plan.total_runs).toBeGreaterThan(0)
    expect(plan.cells.every(c => typeof c.side === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.player === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.deck === 'string')).toBe(true)
    expect(plan.cells.every(c => typeof c.run === 'number')).toBe(true)
  })
})
PATCH_EOF

# ═══════════════════════════════════════════════════════════════════════════
# agent-bdd.test.ts — ## Judge section no longer parsed
# ═══════════════════════════════════════════════════════════════════════════
cat > packages/lythoskill-test-utils/src/agent-bdd.test.ts << 'PATCH_EOF'
import { describe, test, expect } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAgentMd, runAgentScenario } from './agent-bdd'
import type { AgentAdapter } from './agents/types'
import type { JudgeInput } from './schema'

describe('parseAgentMd', () => {
  test('parses frontmatter fields (name, description, timeout)', () => {
    const content = `---
name: "Test scenario"
description: A sample scenario
timeout: 120000
---

## When
Do something useful.
`
    const result = parseAgentMd(content)
    expect(result.name).toBe('Test scenario')
    expect(result.description).toBe('A sample scenario')
    expect(result.timeout).toBe(120000)
    expect(result.when).toBe('Do something useful.')
  })

  test('defaults for missing frontmatter fields', () => {
    const content = `---
---

## When
Just do it.
`
    const result = parseAgentMd(content)
    expect(result.name).toBe('unnamed agent scenario')
    expect(result.description).toBe('')
    expect(result.timeout).toBe(30000)
  })

  test('throws on missing frontmatter', () => {
    expect(() => parseAgentMd('# Not frontmatter\n\n## When\n')).toThrow('Invalid .agent.md: missing frontmatter')
  })

  test('throws on unclosed frontmatter', () => {
    expect(() => parseAgentMd('---\nname: test\n## When\n')).toThrow('Invalid .agent.md: frontmatter not closed')
  })

  test('throws on missing ## When section', () => {
    const content = `---
name: test
---

## Given
Some setup
`
    expect(() => parseAgentMd(content)).toThrow('Invalid .agent.md: missing ## When')
  })

  test('## Judge section is IGNORED (no longer regex-extracted)', () => {
    const content = `---
name: Judged scenario
---

## Given
- tool skills: skill-a, skill-b

## When
Run a command.

## Then
- Result should be correct

## Judge
Verify the output is correct.
`
    const result = parseAgentMd(content)
    // judge is always empty — criteria live in arena.toml [arena].judge, not markdown
    expect(result.judge).toBe('')
    expect(result.then).toEqual(['Result should be correct'])
  })

  test('empty judge (always — ## Judge not parsed)', () => {
    const content = `---
name: No judge
---

## When
Just run it.
`
    const result = parseAgentMd(content)
    expect(result.judge).toBe('')
    expect(result.then).toEqual([])
  })

  test('parses tool skills from ## Given with alias (localhost) syntax', () => {
    const content = `---
name: Localhost test
---

## Given
- tool skills: my-skill (localhost), other-skill

## When
Do stuff.
`
    const result = parseAgentMd(content)
    expect(result.given.deck.tool).toBeDefined()
    const tool = result.given.deck.tool!
    expect(Object.keys(tool)).toHaveLength(2)
    expect(tool['my-skill']).toEqual({ path: 'localhost/my-skill' })
    expect(tool['other-skill']).toEqual({ path: 'github.com/foo/bar/other-skill' })
  })

  test('parses tool skills from ## Given without alias', () => {
    const content = `---
name: Simple test
---

## Given
- tool skills: skill-a, skill-b, skill-c

## When
Execute.
`
    const result = parseAgentMd(content)
    const tool = result.given.deck.tool!
    expect(Object.keys(tool)).toHaveLength(3)
    expect(tool['skill-a']).toEqual({ path: 'github.com/foo/bar/skill-a' })
  })
})

describe('runAgentScenario', () => {
  const mockAdapter: AgentAdapter = {
    name: 'mock',
    async spawn() {
      return {
        stdout: 'task completed',
        stderr: '',
        code: 0,
        durationMs: 5,
        checkpoints: [],
      }
    },
  }

  test('runs scenario end-to-end with mock agent, no judge (no scenario.judge)', async () => {
    const baseDir = join('/tmp', 'agent-bdd-test-' + Date.now())
    const agentMdPath = join(baseDir, 'test.agent.md')
    mkdirSync(baseDir, { recursive: true })
    writeFileSync(agentMdPath, `---
name: Mock Scenario
timeout: 5000
---

## When
Please say "task completed".
`)

    const setupCalled = { called: false }

    const result = await runAgentScenario({
      scenarioPath: agentMdPath,
      agent: mockAdapter,
      setupWorkdir(_scenario, workdir) {
        setupCalled.called = true
        mkdirSync(workdir, { recursive: true })
      },
      baseDir,
    })

    expect(result.scenario.name).toBe('Mock Scenario')
    expect(result.agentResult.stdout).toBe('task completed')
    expect(result.agentResult.code).toBe(0)
    expect(result.checkpoints).toEqual([])
    expect(result.verdict).toBeNull() // no judge criteria provided
    expect(setupCalled.called).toBe(true)

    expect(existsSync(join(result.artifactDir, 'agent-stdout.txt'))).toBe(true)
    expect(existsSync(join(result.artifactDir, 'agent-stderr.txt'))).toBe(true)
    expect(existsSync(join(result.artifactDir, 'judge-verdict.json'))).toBe(true)

    const judgeVerdict = JSON.parse(readFileSync(join(result.artifactDir, 'judge-verdict.json'), 'utf-8'))
    expect(judgeVerdict.verdict).toBeNull()
    expect(judgeVerdict.reason).toContain('both absent')

    rmSync(baseDir, { recursive: true, force: true })
  })

  test('runs scenario with judgeInput override (external, from arena.toml)', async () => {
    const baseDir = join('/tmp', 'agent-bdd-judge-override-' + Date.now())
    const agentMdPath = join(baseDir, 'judge-test.agent.md')
    mkdirSync(baseDir, { recursive: true })
    writeFileSync(agentMdPath, `---
name: Judged Scenario
description: Context for judge only — NOT task instructions
---

## When
Run the task.

## Then
- Output correct
`)

    const judgeInput: JudgeInput = {
      criteria: 'External criteria from arena.toml [arena].judge or judge.md',
      task_context: 'Context from arena.toml task field',
    }

    const judgeAdapter: AgentAdapter = {
      name: 'mock-judge',
      async spawn(opts: { brief: string }) {
        if (opts.brief.includes('Run the task.')) {
          return {
            stdout: JSON.stringify({ verdict: 'ERROR' as const, reason: 'BUG: judge saw task instructions', criteria: [] }),
            stderr: '',
            code: 0,
            durationMs: 3,
            checkpoints: [],
          }
        }
        if (!opts.brief.includes('External criteria from arena.toml')) {
          return {
            stdout: JSON.stringify({ verdict: 'ERROR' as const, reason: 'BUG: judge missing external criteria', criteria: [] }),
            stderr: '',
            code: 0,
            durationMs: 3,
            checkpoints: [],
          }
        }
        return {
          stdout: JSON.stringify({ verdict: 'PASS' as const, reason: 'External criteria evaluated.', criteria: [{ name: 'check', passed: true }] }),
          stderr: '',
          code: 0,
          durationMs: 3,
          checkpoints: [],
        }
      },
    }

    const result = await runAgentScenario({
      scenarioPath: agentMdPath,
      agent: mockAdapter,
      setupWorkdir(_s, wd) { mkdirSync(wd, { recursive: true }) },
      judgeAgent: judgeAdapter,
      judgeInput,
      baseDir,
    })

    expect(result.verdict).not.toBeNull()
    expect(result.verdict!.verdict).toBe('PASS')

    rmSync(baseDir, { recursive: true, force: true })
  })
})
PATCH_EOF

# ── Self-archive ──────────────────────────────────────────────────────────
cp "$0" "archived-patches/${PATCH_NAME}"
rm "$0"

echo "✅ pr-2 applied — arena consumer adaptation:"
echo "   arena-toml.ts: + arena.judge field (path or inline, no parsing)"
echo "   arena-toml.ts: criteria optional when judge is present"
echo "   agent-bdd.ts: parseAgentMd stops extracting ## Judge"
echo "   agent-bdd.ts: runAgentScenario + judgeInput override param"
echo "   runner.ts: resolveOrCreateTask drops hardcoded ## Judge"
echo "   runner.ts: resolveJudgeText assembles JudgeInput from arena.toml"
echo "   cli.ts: singleRun inline scenario drops hardcoded judge"
echo ""
echo "Verify: bun test packages/lythoskill-test-utils packages/lythoskill-arena"
