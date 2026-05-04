import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { runAgentScenario, type AgentScenario } from '@lythos/test-utils/agent-bdd'
import { useAgent } from '@lythos/test-utils/agents'
import { ArenaManifest, Player, type ArenaManifest as ArenaManifestType } from '@lythos/test-utils/schema'
import { runComparativeJudge } from './comparative-judge'

// ── Helpers ───────────────────────────────────────────────────────────────

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]]
  const [first, ...rest] = arrays
  const restProd = cartesian(rest)
  return first.flatMap(a => restProd.map(r => [a, ...r]))
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

// ── Runner ────────────────────────────────────────────────────────────────

export async function runArena(opts: {
  taskPath: string
  playerPaths: string[]
  deckPaths: string[]
  criteria: string[]
  outDir: string
  projectDir?: string
}): Promise<{ manifest: ArenaManifestType; report: unknown; artifactsDir: string }> {
  const { taskPath, playerPaths, deckPaths, criteria, outDir } = opts

  // Load players
  const players = playerPaths.map(p => {
    const content = readFileSync(resolve(p), 'utf-8')
    const parsed = Player.parse(JSON.parse(content))
    return { path: p, ...parsed }
  })

  // Load deck labels from deck paths
  const decks = deckPaths.map(p => ({ path: resolve(p) }))

  // Build (player × deck) variant matrix
  const variants = cartesian([players, decks]).map(([player, deck], i) => ({
    participant_id: `run-${String(i + 1).padStart(2, '0')}`,
    player,
    deck_path: deck.path,
  }))

  // Build arena manifest
  const arenaId = `arena-${stamp()}`
  const artifactsDir = outDir || join(process.cwd(), 'runs', arenaId)

  const manifest = ArenaManifest.parse({
    id: arenaId,
    created_at: new Date().toISOString(),
    task: readFileSync(resolve(taskPath), 'utf-8').slice(0, 200),
    mode: 'decks',
    participants: variants.map(v => ({
      id: v.participant_id,
      name: v.player.path.split('/').pop()?.replace('.toml', '') ?? v.player.platform,
      player: v.player.platform,
      deck: v.deck_path,
      description: `${v.player.platform} × ${v.deck_path.split('/').pop()?.replace('.toml', '')}`,
    })),
    criteria,
    status: 'running',
  })

  mkdirSync(artifactsDir, { recursive: true })
  writeFileSync(join(artifactsDir, 'arena.json'), JSON.stringify(manifest, null, 2) + '\n')

  // Run each variant
  const verdicts: { participantId: string; verdict: unknown }[] = []

  for (const variant of variants) {
    const cellDir = join(artifactsDir, 'runs', variant.participant_id)
    mkdirSync(cellDir, { recursive: true })

    try {
      const result = await runAgentScenario({
        scenarioPath: resolve(taskPath),
        agent: useAgent(variant.player.platform),
        setupWorkdir(_scenario: AgentScenario, workdir: string) {
          mkdirSync(workdir, { recursive: true })
          // Write deck.toml as skill-deck.toml
          const deckContent = readFileSync(variant.deck_path, 'utf-8')
          writeFileSync(join(workdir, 'skill-deck.toml'), deckContent)
        },
        baseDir: artifactsDir,
      })

      verdicts.push({
        participantId: variant.participant_id,
        verdict: result.verdict,
      })
    } catch (e) {
      verdicts.push({
        participantId: variant.participant_id,
        verdict: {
          verdict: 'ERROR' as const,
          reason: `Runner exception: ${e instanceof Error ? e.message : String(e)}`,
        },
      })
    }
  }

  // Run comparative judge
  const judge = useAgent(players[0]?.platform ?? 'claude')
  const report = await runComparativeJudge({
    manifest,
    verdicts,
    judge,
    workdir: artifactsDir,
  })

  // Write report
  writeFileSync(join(artifactsDir, 'report.md'), `# Arena Report: ${manifest.id}

**Task**: ${manifest.task}
**Criteria**: ${manifest.criteria.join(', ')}
**Date**: ${new Date().toISOString()}

## Score Matrix
${renderScoreMatrix(report)}

## Pareto Frontier
${renderPareto(report)}

## Key Findings
${(report.key_findings ?? []).map((f: string) => `- ${f}`).join('\n')}

## Recommendations
${(report.recommendations ?? []).map((r: { audience: string; recommendation: string }) => `- **${r.audience}**: ${r.recommendation}`).join('\n')}
`)

  // Update manifest status
  const finalManifest = ArenaManifest.parse({ ...manifest, status: 'completed' })
  writeFileSync(join(artifactsDir, 'arena.json'), JSON.stringify(finalManifest, null, 2) + '\n')

  return { manifest: finalManifest, report, artifactsDir }
}

// ── Markdown Renderers ────────────────────────────────────────────────────

function renderScoreMatrix(report: unknown & { score_matrix?: { participant_id: string; criterion: string; weight: number; score: number; rationale: string }[] }): string {
  if (!report.score_matrix?.length) return 'No scores available.\n'

  // Build participant × criterion matrix
  const participants = [...new Set(report.score_matrix.map(s => s.participant_id))]
  const criteria = [...new Set(report.score_matrix.map(s => s.criterion))]

  let table = `| Criterion | Weight | ${participants.map(p => `${p}`).join(' | ')} |\n`
  table += `|${'---|'.repeat(2 + participants.length)}\n`

  for (const c of criteria) {
    table += `| ${c} | 25% | ${participants.map(p => {
      const cell = report.score_matrix!.find(s => s.participant_id === p && s.criterion === c)
      return `**${cell?.score ?? '?'}**`
    }).join(' | ')} |\n`
  }

  // Weighted totals
  table += `| **Weighted Total** | 100% | ${participants.map(p => {
    const pScores = report.score_matrix!.filter(s => s.participant_id === p)
    const avg = pScores.length ? pScores.reduce((sum, s) => sum + s.score, 0) / pScores.length : 0
    return `**${avg.toFixed(1)}**`
  }).join(' | ')} |\n`

  return table
}

function renderPareto(report: unknown & { pareto?: { participant_id: string; dominated: boolean; dominated_by: string[] }[] }): string {
  if (!report.pareto?.length) return 'No Pareto analysis.\n'

  return report.pareto.map((p: { participant_id: string; dominated: boolean; dominated_by: string[] }) => {
    if (p.dominated) {
      return `- **${p.participant_id}**: dominated by ${p.dominated_by.join(', ')}`
    }
    return `- **${p.participant_id}**: Pareto-optimal (non-dominated)`
  }).join('\n')
}
