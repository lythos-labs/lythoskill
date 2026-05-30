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
try { await import('@lythos/agent-adapter-codex') } catch { /* package not installed */ }
import { runComparativeJudge } from './comparative-judge'
import { parseArenaToml, buildExecutionPlan, type ArenaToml, type ExecutionPlan } from './arena-toml'
import { resolvePlayer, resolveSides } from './player'
import { aggregateAllStats } from './stats'
import type { SideStats } from './stats'
import { buildCopyPlan } from './preflight'

// ── ArenaIO interface (Intent/Plan/Execute fractal pattern) ───────────────

export interface ArenaIO {
  log?: (msg: string) => void
  mkdir?: (path: string, opts?: { recursive?: boolean }) => void
  writeFile?: (path: string, data: string) => void
  readFile?: (path: string) => string
  readdir?: (path: string) => string[]
  cp?: (src: string, dest: string, opts?: { recursive?: boolean }) => void
  spawn?: (cmd: string[], opts: { cwd: string; env?: Record<string, string> }) => Promise<{ exitCode: number | null; stderr: string }>
  agentSpawn?: (opts: { player: string; cwd: string; brief: string; timeoutMs: number }) => Promise<{ stdout: string; stderr: string; durationMs: number }>
  exists?: (path: string) => boolean
  chdir?: (cwd: string) => void
}

export const defaultArenaIO: ArenaIO = {
  log: (msg: string) => { console.log(msg) },
  mkdir: (path: string, opts?: { recursive?: boolean }) => mkdirSync(path, opts),
  writeFile: (path: string, data: string) => writeFileSync(path, data, 'utf-8'),
  readFile: (path: string) => readFileSync(path, 'utf-8'),
  readdir: (path: string) => readdirSync(path),
  cp: (src: string, dest: string, opts?: { recursive?: boolean }) => cpSync(src, dest, opts),
  spawn: async (cmd: string[], opts: { cwd: string; env?: Record<string, string> }) => {
    const proc = Bun.spawn(cmd, { cwd: opts.cwd, env: opts.env })
    await proc.exited
    const stderr = await new Response(proc.stderr).text()
    return { exitCode: proc.exitCode, stderr }
  },
  agentSpawn: async (opts: { player: string; cwd: string; brief: string; timeoutMs: number }) => {
    const agent = useAgent(opts.player)
    return agent.spawn({ cwd: opts.cwd, brief: opts.brief, timeoutMs: opts.timeoutMs })
  },
  exists: (path: string) => existsSync(path),
  chdir: (cwd: string) => { process.chdir(cwd) },
}

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

function resolveTaskText(toml: ArenaToml, io: Required<Pick<ArenaIO, 'exists' | 'readFile'>>, configDir?: string): string {
  const p = toml.arena.task
  const candidate = configDir ? resolve(configDir, p) : resolve(p)
  if (io.exists(candidate)) return io.readFile(candidate)
  return p
}

function resolveJudgeText(toml: ArenaToml, io: Required<Pick<ArenaIO, 'exists' | 'readFile'>>, configDir?: string): string | null {
  if (toml.arena.judge) {
    const p = toml.arena.judge
    const candidate = configDir ? resolve(configDir, p) : resolve(p)
    if (io.exists(candidate)) return io.readFile(candidate)
    return p
  }
  if (toml.arena.criteria && toml.arena.criteria.length > 0) {
    return toml.arena.criteria.map(c => `- ${c}`).join('\n')
  }
  return null
}

// ── Prompt template (IoC: brief = variable, template = fixed contract) ────

/** Pure prompt builder — no IO. Execution: arena subagent spawn (cli.ts singleRun / vsRun). */
export function buildArenaPrompt(opts: {
  brief: string
  cwd: string
  deckPath: string
  outputDir?: string
  preflightReport?: string
}): string {
  const out = opts.outputDir ?? opts.cwd
  const lines = [
    'You are running an arena evaluation cell.',
    '',
    `CWD: ${opts.cwd}`,
    `Deck: ${opts.deckPath}`,
    `Produce output to: ${out}/`,
    '',
    'MANDATORY — write decision-log.jsonl to the output directory.',
    'Each line is one JSON object with: t (seconds elapsed),',
    'phase (setup/content/design/output), decision (what you chose),',
    'reason (why). This is your decision trail — the only way the',
    'orchestrator can understand your reasoning chain.',
    '',
    'Example:',
    '{"t":0,"phase":"setup","decision":"selected Golden Hour palette","reason":"warm tones match baking theme"}',
    '{"t":12,"phase":"content","decision":"6 science topics","reason":"requires chemistry depth"}',
    '',
    'ROBUSTNESS — If any command or script fails, read the error output, fix the issue, and retry.',
    'Do not stop on the first error. Ensure all required output files exist before finishing.',
    '',
    'TOOLS — Use the skills already linked in your working set (check with `ls .claude/skills/` or your configured path).',
    'They are available and tested. Only write alternative scripts if the linked skills explicitly',
    'cannot handle the task.',
  ]
  if (opts.preflightReport) {
    lines.push('', 'Preflight:', opts.preflightReport)
  }
  lines.push('', 'TASK:', opts.brief)
  return lines.join('\n')
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
  io?: ArenaIO
}): Promise<ArenaResult | { plan: ReturnType<typeof buildExecutionPlan> }> {
  const { toml, taskPath, outDir, dryRun, log, configDir } = opts
  const io: ArenaIO = {
    ...defaultArenaIO,
    ...opts.io,
    log: log ?? opts.io?.log ?? defaultArenaIO.log,
  }

  const resolvePath = (p: string) => {
    if (p.startsWith('/')) return p
    if (configDir) return resolve(configDir, p)
    return resolve(p)
  }

  const ioWithDefaults = {
    exists: io.exists!,
    readFile: io.readFile!,
    writeFile: io.writeFile!,
    mkdir: io.mkdir!,
    readdir: io.readdir!,
    cp: io.cp!,
    spawn: io.spawn!,
    agentSpawn: io.agentSpawn!,
    chdir: io.chdir!,
  }

  const taskText = resolveTaskText(toml, ioWithDefaults, configDir)
  const resolvedToml: ArenaToml = {
    ...toml,
    side: toml.side.map(s => ({ ...s, deck: resolvePath(s.deck) })),
  }

  const plan = buildExecutionPlan(resolvedToml)

  if (dryRun) {
    for (const line of formatPlanOutput(plan)) io.log?.(line)
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

  ioWithDefaults.mkdir(artifactsDir, { recursive: true })
  ioWithDefaults.writeFile(join(artifactsDir, 'arena.json'), JSON.stringify(manifest, null, 2) + '\n')

  const judgeText = resolveJudgeText(resolvedToml, ioWithDefaults, configDir)
  const judgeInput: JudgeInput | undefined = judgeText
    ? { criteria: judgeText, task_context: taskText.slice(0, 500) }
    : undefined

  // ── Per-cell: agent.spawn via IO injection ─────────────────────────────
  const verdictsBySide = new Map<string, JudgeVerdict[]>()

  for (const cell of plan.cells) {
    const cellDir = join(artifactsDir, 'runs', cell.side, `run-${cell.run}`)
    ioWithDefaults.mkdir(cellDir, { recursive: true })

    const workDir = join(artifactsDir, 'work', cell.side)
    ioWithDefaults.mkdir(workDir, { recursive: true })
    const originalCwd = process.cwd()

    try {
      // Setup: deck + AGENTS.md + link
      ioWithDefaults.writeFile(join(workDir, 'skill-deck.toml'), ioWithDefaults.readFile(cell.deck))
      ioWithDefaults.writeFile(join(workDir, 'AGENTS.md'), [
        '# Arena Test Environment',
        `**Side**: ${cell.side}`, `**Player**: ${cell.player}`, `**Run**: ${cell.run}`,
        '## How This Works',
        '- Isolated arena test directory. Skills in skill-deck.toml, linked via deck link.',
        '- Complete the task using available skills. Output to this directory.',
        '- MANDATORY: write decision-log.jsonl (see prompt for schema).',
      ].join('\n'))
      const linkProc = await ioWithDefaults.spawn(
        ['bunx', '@lythos/skill-deck', 'link'],
        { cwd: workDir, env: { ...process.env, HOME: process.env.HOME! } },
      )
      io.log?.(`[arena] deck link for ${cell.side}: exit ${linkProc.exitCode}`)

      ioWithDefaults.chdir(workDir)

      // Agent spawn via IO injection
      const fullPrompt = buildArenaPrompt({
        brief: taskText,
        cwd: workDir,
        deckPath: cell.deck,
        outputDir: workDir,
      })
      const agentResult = await ioWithDefaults.agentSpawn({
        player: resolvePlayer(cell.player),
        cwd: workDir,
        brief: fullPrompt,
        timeoutMs: 300000,
      })

      ioWithDefaults.chdir(originalCwd)

      // Persist agent output
      const sanitizer = createSanitizer({ projectRoot: process.cwd(), homeDir: homedir(), workDir })
      ioWithDefaults.writeFile(join(cellDir, 'agent-stdout.txt'), sanitizer.sanitize(agentResult.stdout))
      if (agentResult.stderr) ioWithDefaults.writeFile(join(cellDir, 'agent-stderr.txt'), sanitizer.sanitize(agentResult.stderr))

      // Copy artifacts
      const skipSet = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock', 'AGENTS.md'])
      try {
        const entries = ioWithDefaults.readdir(workDir)
        const copyPlan = buildCopyPlan(workDir, cellDir, entries, skipSet)
        for (const { src, dest, name } of copyPlan) {
          try { ioWithDefaults.cp(src, dest, { recursive: true }) } catch (e) {
            io.log?.(`⚠️ Failed to copy agent output: ${name} — ${e instanceof Error ? e.message : e}`)
          }
        }
      } catch (e) {
        io.log?.(`⚠️ Failed to read agent workdir for copy: ${e instanceof Error ? e.message : e}`)
      }

      // Evidence
      const checkpoints = readCheckpoints(workDir)
      let artifactFiles: string[] = []
      try {
        for (const e of ioWithDefaults.readdir(workDir)) {
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

      ioWithDefaults.writeFile(join(cellDir, 'judge-verdict.json'), JSON.stringify({
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
      ioWithDefaults.writeFile(join(cellDir, 'judge-verdict.json'), JSON.stringify(errVerdict, null, 2) + '\n')
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
  writeReport(artifactsDir, manifest, report, stats, ioWithDefaults)

  const finalManifest = ArenaManifest.parse({ ...manifest, status: 'completed' })
  ioWithDefaults.writeFile(join(artifactsDir, 'arena.json'), JSON.stringify(finalManifest, null, 2) + '\n')

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

function writeReport(dir: string, manifest: ArenaManifestType, report: any, stats: SideStats[], io: Required<Pick<ArenaIO, 'writeFile'>>): void {
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
  io.writeFile(join(dir, 'report.md'), lines.join('\n') + '\n')
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
