import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runAgentScenario, type AgentScenario } from '@lythos/test-utils/agent-bdd'
import { useAgent } from '@lythos/test-utils/agents'
import { ArenaManifest, Player } from '@lythos/test-utils/schema'
import type { ArenaManifest as ArenaManifestType, JudgeVerdict } from '@lythos/test-utils/schema'
import { runComparativeJudge } from './comparative-judge'
import { parseArenaToml, buildExecutionPlan, type ArenaToml, type ExecutionPlan } from './arena-toml'
import { resolvePlayer, resolveSides } from './player'
import { aggregateAllStats } from './stats'
import type { SideStats } from './stats'

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

export async function runArenaFromToml(opts: {
  toml: ArenaToml
  taskPath: string
  outDir?: string
  dryRun?: boolean
  log?: (msg: string) => void
  configDir?: string    // for resolving relative paths
}): Promise<ArenaResult | { plan: ReturnType<typeof buildExecutionPlan> }> {
  const { toml, taskPath, outDir, dryRun, log, configDir } = opts

  // Resolve relative paths against config dir (anti-footgun: cwd may differ)
  const resolvePath = (p: string) => {
    if (p.startsWith('/')) return p
    if (configDir) return resolve(configDir, p)
    return resolve(p)
  }
  const taskAbs = resolvePath(taskPath)
  const resolvedToml: ArenaToml = {
    ...toml,
    side: toml.side.map(s => ({ ...s, deck: resolvePath(s.deck) })),
  }

  const plan = buildExecutionPlan(resolvedToml)

  // dry-run: return plan without executing
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
  const manifest = ArenaManifest.parse({
    id: arenaId,
    created_at: new Date().toISOString(),
    task: readFileSync(taskAbs, 'utf-8').slice(0, 200),
    mode: 'decks',
    participants: [...new Map(resolved.map(r => [r.side.name, r])).values()].map(r => ({
      id: r.side.name,
      name: r.side.name,
      player: r.platform,
      deck: r.side.deck,
      description: `${r.playerName} × ${r.side.deck}`,
    })),
    criteria: resolvedToml.arena.criteria,
    status: 'running',
  })

  mkdirSync(artifactsDir, { recursive: true })
  writeFileSync(join(artifactsDir, 'arena.json'), JSON.stringify(manifest, null, 2) + '\n')

  // Execute plan: per-cell agent run
  const verdictsBySide = new Map<string, JudgeVerdict[]>()

  for (const cell of plan.cells) {
    const cellDir = join(artifactsDir, 'runs', cell.side, `run-${cell.run}`)
    mkdirSync(cellDir, { recursive: true })

    try {
      const agent = useAgent(resolvePlayer(cell.player))
      const result = await runAgentScenario({
        scenarioPath: taskAbs,
        agent,
        async setupWorkdir(_scenario: AgentScenario, workdir: string) {
          mkdirSync(workdir, { recursive: true })
          const deckContent = readFileSync(cell.deck, 'utf-8')
          writeFileSync(join(workdir, 'skill-deck.toml'), deckContent)

          // Link skills into .claude/skills/ so claude -p can discover them
          const deckCli = resolve(import.meta.dir, '..', '..', 'lythoskill-deck', 'src', 'cli.ts')
          const linkProc = Bun.spawn(['bun', 'run', deckCli, 'link'], {
            cwd: workdir,
            env: { ...process.env, HOME: process.env.HOME },
          })
          await linkProc.exited
          log?.(`[arena] deck link for ${cell.side}: exit ${linkProc.exitCode}`)
        },
        // Isolated CWD: /tmp/arena-<id>/<side>/ — no parent .claude/skills/ to walk up into
        baseDir: join(tmpdir(), `arena-${arenaId}`, cell.side),
      })

      const v = (result.verdict ?? {
        verdict: 'ERROR' as const,
        reason: 'No verdict returned',
        criteria: [],
      }) as JudgeVerdict

      // Persist per-cell verdict + agent output for auditability
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
    // Use the first run's verdict for comparative judge (or aggregate into one)
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

  // Convert CLI flags to ArenaToml internally
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
