import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { useAgent } from '@lythos/test-utils/agents'
import { createSanitizer } from '@lythos/test-utils/sanitize'
import { runLLMJudge } from '@lythos/test-utils/judge'
import { readCheckpoints } from '@lythos/test-utils/bdd-runner'
import { ArenaManifest, Player, type JudgeInput, type Evidence, type JudgeVerdict } from '@lythos/test-utils/schema'
import type { ArenaManifest as ArenaManifestType } from '@lythos/test-utils/schema'
try { await import('@lythos/agent-adapter-claude-sdk') } catch { /* package not installed */ }
try { await import('@lythos/agent-adapter-deepseek-serve') } catch { /* package not installed */ }
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

export interface ArenaResult {
  manifest: ArenaManifestType
  report: unknown
  stats: SideStats[]
  artifactsDir: string
}

// ── Task + judge text resolution (no parsing — natural language) ──────────

function resolveTaskText(toml: ArenaToml, configDir?: string): string {
  const p = toml.arena.task
  const candidate = configDir ? resolve(configDir, p) : resolve(p)
  if (existsSync(candidate)) return readFileSync(candidate, 'utf-8')
  return p
}

function resolveJudgeText(toml: ArenaToml, configDir?: string): string | null {
  if (toml.arena.judge) {
    const p = toml.arena.judge
    const candidate = configDir ? resolve(configDir, p) : resolve(p)
    if (existsSync(candidate)) return readFileSync(candidate, 'utf-8')
    return p
  }
  if (toml.arena.criteria && toml.arena.criteria.length > 0) {
    return toml.arena.criteria.map(c => `- ${c}`).join('\n')
  }
  return null
}

// ── Plan formatting ───────────────────────────────────────────────────────

export function formatPlanOutput(plan: ExecutionPlan): string[] {
  const lines: string[] = []
  const sideCount = new Set(plan.cells.map(c => c.side)).size
  lines.push(`\n📋 Dry-run: ${plan.total_runs} cells across ${sideCount} sides × ${plan.cells.length / Math.max(1, sideCount)} runs`)
  for (const cell of plan.cells) {
    lines.push(`   ${cell.side}/run-${cell.run}: ${cell.player} × ${cell.deck}${cell.control ? ' [control]' : ''}`)
  }
  return lines
}

// ── Main ──────────────────────────────────────────────────────────────────

export async function runArenaFromToml(opts: {
  toml: ArenaToml
  taskPath: string
  outDir?: string
  dryRun?: boolean
  log?: (msg: string) => void
  configDir?: string
}): Promise<ArenaResult | { plan: ReturnType<typeof buildExecutionPlan> }> {
  const { toml, taskPath, outDir, dryRun, log, configDir } = opts

  const resolvePath = (p: string) => {
    if (p.startsWith('/')) return p
    if (configDir) return resolve(configDir, p)
    return resolve(p)
  }

  const taskText = resolveTaskText(toml, configDir)
  const resolvedToml: ArenaToml = {
    ...toml,
    side: toml.side.map(s => ({ ...s, deck: resolvePath(s.deck) })),
  }

  const plan = buildExecutionPlan(resolvedToml)

  if (dryRun) {
    for (const line of formatPlanOutput(plan)) log?.(line)
    return { plan }
  }

  const arenaId = `arena-${stamp()}`
  const artifactsDir = outDir || join(process.cwd(), 'runs', arenaId)
  const resolved = resolveSides(resolvedToml)

  const manifest = ArenaManifest.parse({
    id: arenaId,
    created_at: new Date().toISOString(),
    task: taskText.slice(0, 200),
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

  const judgeText = resolveJudgeText(resolvedToml, configDir)
  const judgeInput: JudgeInput | undefined = judgeText
    ? { criteria: judgeText, task_context: taskText.slice(0, 500) }
    : undefined

  // ── Per-cell: agent.spawn directly, no AgentScenario/parseAgentMd ────
  const verdictsBySide = new Map<string, JudgeVerdict[]>()

  for (const cell of plan.cells) {
    const cellDir = join(artifactsDir, 'runs', cell.side, `run-${cell.run}`)
    mkdirSync(cellDir, { recursive: true })

    const workDir = join(artifactsDir, 'work', cell.side)
    mkdirSync(workDir, { recursive: true })
    const originalCwd = process.cwd()

    try {
      // Setup: deck + AGENTS.md + link
      writeFileSync(join(workDir, 'skill-deck.toml'), readFileSync(cell.deck, 'utf-8'))
      writeFileSync(join(workDir, 'AGENTS.md'), [
        '# Arena Test Environment',
        `**Side**: ${cell.side}`, `**Player**: ${cell.player}`, `**Run**: ${cell.run}`,
        '## Task', '', taskText,
        '## How This Works',
        '- Isolated arena test directory. Skills in skill-deck.toml, linked via deck link.',
        '- Complete the task using available skills. Output to this directory.',
      ].join('\n'))
      const linkProc = Bun.spawn(
        ['bunx', '@lythos/skill-deck', 'link'],
        { cwd: workDir, env: { ...process.env, HOME: process.env.HOME! } },
      )
      await linkProc.exited
      log?.(`[arena] deck link for ${cell.side}: exit ${linkProc.exitCode}`)

      process.chdir(workDir)

      // Direct agent.spawn (no parseAgentMd, no AgentScenario)
      const agent = useAgent(resolvePlayer(cell.player))
      const agentResult = await agent.spawn({
        cwd: workDir,
        brief: taskText,
        timeoutMs: 300000,
      })

      process.chdir(originalCwd)

      // Persist agent output
      const sanitizer = createSanitizer({ projectRoot: process.cwd(), homeDir: homedir(), workDir })
      writeFileSync(join(cellDir, 'agent-stdout.txt'), sanitizer.sanitize(agentResult.stdout), 'utf-8')
      if (agentResult.stderr) writeFileSync(join(cellDir, 'agent-stderr.txt'), sanitizer.sanitize(agentResult.stderr), 'utf-8')

      // Copy artifacts
      const skipSet = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock', 'AGENTS.md'])
      try {
        const entries = readdirSync(workDir)
        const copyPlan = buildCopyPlan(workDir, cellDir, entries, skipSet)
        for (const { src, dest, name } of copyPlan) {
          try { cpSync(src, dest, { recursive: true }) } catch (e) {
            log?.(`⚠️ Failed to copy agent output: ${name} — ${e instanceof Error ? e.message : e}`)
          }
        }
      } catch (e) {
        log?.(`⚠️ Failed to read agent workdir for copy: ${e instanceof Error ? e.message : e}`)
      }

      // Evidence
      const checkpoints = readCheckpoints(workDir)
      let artifactFiles: string[] = []
      try {
        for (const e of readdirSync(workDir)) {
          if (!e.startsWith('.') && !skipSet.has(e) && e !== 'agent-stdout.txt' && e !== 'agent-stderr.txt' && e !== 'judge-verdict.json' && e !== '_checkpoints') {
            artifactFiles.push(e)
          }
        }
      } catch {}

      // Per-cell judge — runLLMJudge as toolbox function, no intermediate pipeline
      let v: JudgeVerdict
      if (judgeInput) {
        const evidence: Evidence = {
          sandbox_cwd: workDir,
          stdout: agentResult.stdout,
          stderr: agentResult.stderr,
          artifact_files: artifactFiles,
        }
        const judgeAgent = useAgent(resolvePlayer(resolved[0]?.platform ?? 'claude'))
        const judgeResult = await runLLMJudge(judgeInput, evidence, checkpoints, judgeAgent)
        v = judgeResult.verdict ?? { verdict: 'ERROR' as const, reason: 'No verdict returned', criteria: [] }
      } else {
        v = { verdict: 'ERROR' as const, reason: 'No judge criteria provided', criteria: [] }
      }

      writeFileSync(join(cellDir, 'judge-verdict.json'), JSON.stringify({
        ...v,
        agent_stdout: agentResult.stdout.slice(0, 5000),
        agent_stderr: agentResult.stderr.slice(0, 1000),
        duration_ms: agentResult.durationMs,
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

  // Aggregate + comparative
  const stats = aggregateAllStats(verdictsBySide)
  const flatVerdicts: { participantId: string; verdict: unknown }[] = []
  for (const [side, verdicts] of verdictsBySide) {
    if (verdicts.length > 0) flatVerdicts.push({ participantId: side, verdict: verdicts[0] })
  }
  const judge = useAgent(resolved[0]?.platform ?? 'claude')
  const report = await runComparativeJudge({ manifest, verdicts: flatVerdicts, judge, workdir: artifactsDir })
  writeReport(artifactsDir, manifest, report, stats)

  const finalManifest = ArenaManifest.parse({ ...manifest, status: 'completed' })
  writeFileSync(join(artifactsDir, 'arena.json'), JSON.stringify(finalManifest, null, 2) + '\n')

  return { manifest: finalManifest, report, stats, artifactsDir }
}

// ── Backward compat ──────────────────────────────────────────────────────

export async function runArena(opts: {
  taskPath: string; playerPaths: string[]; deckPaths: string[]; criteria: string[]; outDir: string
}): Promise<{ manifest: ArenaManifestType; report: unknown; artifactsDir: string }> {
  const { taskPath, playerPaths, deckPaths, criteria, outDir } = opts
  const toml: ArenaToml = {
    arena: { task: readFileSync(resolve(taskPath), 'utf-8').slice(0, 200), criteria, runs_per_side: 1, max_participants: Math.min(playerPaths.length, deckPaths.length) } as any,
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

// ── Report ────────────────────────────────────────────────────────────────

function writeReport(dir: string, manifest: ArenaManifestType, report: any, stats: SideStats[]): void {
  const lines: string[] = [
    `# Arena Report: ${manifest.id}`, '',
    `**Task**: ${manifest.task}`,
    `**Criteria**: ${manifest.criteria.map((c: any) => typeof c === 'string' ? c : c.label).join(', ')}`,
    `**Date**: ${new Date().toISOString()}`, '',
    '## Score Matrix', '', renderScoreMatrix(report), '',
    '## Per-Side Statistics', '', renderStatsTable(stats), '',
    '## Pareto Frontier', '', renderPareto(report), '',
    '## Key Findings', '', ...(report.key_findings ?? []).map((f: string) => `- ${f}`), '',
    '## Recommendations', '', ...(report.recommendations ?? []).map((r: any) => `- **${r.audience}**: ${r.recommendation}`),
  ]
  writeFileSync(join(dir, 'report.md'), lines.join('\n') + '\n')
}

function renderStatsTable(stats: SideStats[]): string {
  if (stats.length === 0) return 'No statistics available.\n'
  let table = `| Side | Runs | Pass Rate | Mean Confidence | Criteria |\n|------|------|-----------|-----------------|----------|\n`
  for (const s of stats) {
    const confStr = s.meanConfidence != null ? `${s.meanConfidence.toFixed(0)}%` : '-'
    const criteriaStr = s.criteria.map(c => `${c.name}: ${(c.mean * 100).toFixed(0)}%`).join(', ')
    table += `| ${s.sideName} | ${s.runs} | ${(s.passRate * 100).toFixed(0)}% | ${confStr} | ${criteriaStr} |\n`
  }
  return table
}

function renderScoreMatrix(report: any): string {
  if (!report.score_matrix?.length) return 'No scores available.\n'
  const participants = [...new Set(report.score_matrix.map((s: any) => s.participant_id))]
  const criteria = [...new Set(report.score_matrix.map((s: any) => s.criterion))]
  let table = `| Criterion | Weight | ${participants.join(' | ')} |\n|${'---|'.repeat(2 + participants.length)}\n`
  for (const c of criteria) {
    table += `| ${c} | 25% | ${participants.map((p: any) => {
      const cell = report.score_matrix!.find((s: any) => s.participant_id === p && s.criterion === c)
      return `**${cell?.score ?? '?'}**`
    }).join(' | ')} |\n`
  }
  table += `| **Weighted Total** | 100% | ${participants.map((p: any) => {
    const pScores = report.score_matrix!.filter((s: any) => s.participant_id === p)
    const avg = pScores.length ? pScores.reduce((sum: number, s: any) => sum + s.score, 0) / pScores.length : 0
    return `**${avg.toFixed(1)}**`
  }).join(' | ')} |\n`
  return table
}

function renderPareto(report: any): string {
  if (!report.pareto?.length) return 'No Pareto analysis.\n'
  return report.pareto.map((p: any) =>
    p.dominated
      ? `- **${p.participant_id}**: dominated by ${p.dominated_by.join(', ')}`
      : `- **${p.participant_id}**: Pareto-optimal (non-dominated)`
  ).join('\n')
}
