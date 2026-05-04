import { zodToJsonSchema } from 'zod-to-json-schema'
import { ComparativeReport, ScoreCell, ParetoEntry } from '@lythos/test-utils/schema'
import type { AgentAdapter } from '@lythos/test-utils/agents'
import type { ArenaManifest } from '@lythos/test-utils/schema'

// ── Pareto Frontier (deterministic algorithm) ──────────────────────────────

export interface ScoreVector {
  participant_id: string
  scores: Record<string, number>
  dominated: boolean
  dominated_by: string[]
}

/**
 * Compute Pareto frontier from score vectors.
 * Participant A dominates B if A >= B in all criteria AND A > B in at least one.
 * This is deterministic — never delegated to LLM.
 */
export function computePareto(vectors: { participant_id: string; scores: Record<string, number> }[]): ParetoEntry[] {
  const result: ParetoEntry[] = vectors.map(v => ({
    participant_id: v.participant_id,
    scores: { ...v.scores },
    dominated: false,
    dominated_by: [] as string[],
  }))

  // Union of all criteria across all participants
  const allCriteria = [...new Set(vectors.flatMap(v => Object.keys(v.scores)))]

  if (allCriteria.length === 0) return result

  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue
      const a = vectors[i].scores
      const b = vectors[j].scores

      const allGe = allCriteria.every(k => (a[k] ?? 0) >= (b[k] ?? 0))
      const anyGt = allCriteria.some(k => (a[k] ?? 0) > (b[k] ?? 0))

      if (allGe && anyGt) {
        // i dominates j
        result[j].dominated = true
        if (!result[j].dominated_by.includes(result[i].participant_id)) {
          result[j].dominated_by.push(result[i].participant_id)
        }
      }
    }
  }

  return result
}

// ── Comparative Judge Prompt ──────────────────────────────────────────────

function buildComparativePrompt(opts: {
  manifest: ArenaManifest
  verdicts: { participantId: string; verdict: unknown }[]
}): string {
  const criteriaDesc = opts.manifest.criteria.join(', ')
  const participants = opts.manifest.participants
    .map(p => `- ${p.id}: ${p.name} (${p.description || 'no description'})`)
    .join('\n')

  return `You are a comparative judge evaluating ${opts.manifest.participants.length} participants against shared criteria.

## Task
${opts.manifest.task}

## Participants
${participants}

## Criteria
${criteriaDesc}

## Your Job
For each participant, score them 1-5 on each criterion. Provide a brief rationale.
Score meanings: 1=poor, 3=acceptable, 5=excellent.

Use the submit_scores tool to return your structured evaluation.`
}

const SCORE_TOOL = {
  name: 'submit_scores',
  description: 'Submit per-participant scores for each criterion with rationales',
  input_schema: zodToJsonSchema(ComparativeReport.pick({ score_matrix: true, key_findings: true, recommendations: true })) as Record<string, unknown>,
}

function toScoreMatrix(
  manifest: ArenaManifest,
  scores: { participant_id: string; criterion: string; weight: number; score: number; rationale: string }[]
): typeof ScoreCell._output[] {
  return scores.map(s => ScoreCell.parse(s))
}

// ── Comparative Judge ─────────────────────────────────────────────────────

export async function runComparativeJudge(opts: {
  manifest: ArenaManifest
  verdicts: { participantId: string; verdict: unknown }[]
  judge: AgentAdapter
  workdir: string
}): Promise<typeof ComparativeReport._output> {
  const { manifest, verdicts, judge, workdir } = opts

  const prompt = buildComparativePrompt({ manifest, verdicts })

  let raw = ''
  let parsed: unknown
  let lastError: string | undefined

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      if (judge.invokeTool) {
        parsed = await judge.invokeTool({
          tool: SCORE_TOOL,
          prompt,
          cwd: workdir,
          timeoutMs: 120000,
        })
        raw = JSON.stringify(parsed)
      } else {
        const result = await judge.spawn({ cwd: workdir, brief: prompt, timeoutMs: 120000 })
        raw = result.stdout
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim()
        parsed = JSON.parse(jsonStr)
      }

      // Validate LLM output through Zod
      const llmResult = ComparativeReport.pick({
        score_matrix: true,
        key_findings: true,
        recommendations: true,
      }).parse(parsed)

      // Success — proceed to Pareto computation
      const scoreMatrix = toScoreMatrix(manifest, llmResult.score_matrix)
      const participantScores = manifest.participants.map(p => {
        const pScores: Record<string, number> = {}
        for (const cell of scoreMatrix) {
          if (cell.participant_id === p.id) pScores[cell.criterion] = cell.score
        }
        return { participant_id: p.id, scores: pScores }
      })
      const pareto = computePareto(participantScores)
      const weightedTotals: Record<string, number> = {}
      for (const p of manifest.participants) {
        const pCells = scoreMatrix.filter(c => c.participant_id === p.id)
        weightedTotals[p.id] = pCells.reduce((sum, c) => sum + c.score * c.weight, 0) / (pCells.length || 1)
      }

      return ComparativeReport.parse({
        arena_id: manifest.id,
        generated_at: new Date().toISOString(),
        score_matrix: scoreMatrix,
        weighted_totals: weightedTotals,
        pareto,
        key_findings: llmResult.key_findings ?? [],
        recommendations: llmResult.recommendations ?? [],
      })
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      if (attempt < 2) continue // retry
    }
  }

  // All retries exhausted: return fallback report
  const empty: typeof ComparativeReport._output = {
    arena_id: manifest.id,
    generated_at: new Date().toISOString(),
    score_matrix: [],
    weighted_totals: {},
    pareto: [],
    key_findings: [`Comparative judge failed after 3 attempts: ${lastError}`],
    recommendations: [],
  }
  return empty
}
