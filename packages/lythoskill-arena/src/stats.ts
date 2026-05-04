import type { JudgeVerdict } from '@lythos/test-utils/schema'

// ── Statistical aggregation for runs_per_side ─────────────────────────────
// All pure functions. Input: N verdicts from N runs. Output: aggregated stats.

export interface CriterionStats {
  name: string
  mean: number
  variance: number
  min: number
  max: number
  count: number                     // number of runs that reported this criterion
}

export interface SideStats {
  sideName: string
  runs: number
  passRate: number                  // PASS / total
  failRate: number
  errorRate: number
  meanConfidence: number | null     // null if no verdict had confidence
  confidenceVariance: number | null
  criteria: CriterionStats[]
  scoreByCriterion: Record<string, { mean: number; variance: number }>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function variance(values: number[], m?: number): number {
  if (values.length < 2) return 0
  const avg = m ?? mean(values)
  return values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1)
}

// ── Aggregator ────────────────────────────────────────────────────────────

export function aggregateSideStats(sideName: string, verdicts: JudgeVerdict[]): SideStats {
  const runs = verdicts.length
  const passCount = verdicts.filter(v => v.verdict === 'PASS').length
  const failCount = verdicts.filter(v => v.verdict === 'FAIL').length
  const errorCount = verdicts.filter(v => v.verdict === 'ERROR').length

  // Confidence
  const confidences = verdicts.map(v => v.confidence).filter((c): c is number => c != null)
  const meanConf = confidences.length > 0 ? mean(confidences) : null
  const confVar = confidences.length > 1 ? variance(confidences, meanConf!) : null

  // Per-criterion stats from verdict.criteria
  const criterionMap = new Map<string, { passed: boolean; note?: string }[]>()
  for (const v of verdicts) {
    for (const c of v.criteria ?? []) {
      if (!criterionMap.has(c.name)) criterionMap.set(c.name, [])
      criterionMap.get(c.name)!.push({ passed: c.passed, note: c.note })
    }
  }

  const criteria: CriterionStats[] = []
  for (const [name, values] of criterionMap) {
    const passRate = values.filter(v => v.passed).length / values.length
    criteria.push({
      name,
      mean: passRate,               // for criteria, "mean" = pass rate across runs
      variance: passRate * (1 - passRate), // Bernoulli variance
      min: 0,
      max: 1,
      count: values.length,
    })
  }

  // Per-criterion scores (1-5) from verdict.scores
  const scoreMap = new Map<string, number[]>()
  for (const v of verdicts) {
    if (v.scores) {
      for (const [criterion, score] of Object.entries(v.scores)) {
        if (!scoreMap.has(criterion)) scoreMap.set(criterion, [])
        scoreMap.get(criterion)!.push(score)
      }
    }
  }

  const scoreByCriterion: Record<string, { mean: number; variance: number }> = {}
  for (const [criterion, scores] of scoreMap) {
    const m = mean(scores)
    scoreByCriterion[criterion] = {
      mean: m,
      variance: scores.length > 1 ? variance(scores, m) : 0,
    }
  }

  return {
    sideName,
    runs,
    passRate: runs > 0 ? passCount / runs : 0,
    failRate: runs > 0 ? failCount / runs : 0,
    errorRate: runs > 0 ? errorCount / runs : 0,
    meanConfidence: meanConf,
    confidenceVariance: confVar,
    criteria,
    scoreByCriterion,
  }
}

/** Aggregate stats for all sides from a map of sideName → verdicts[] */
export function aggregateAllStats(
  verdictsBySide: Map<string, JudgeVerdict[]>
): SideStats[] {
  const stats: SideStats[] = []
  for (const [sideName, verdicts] of verdictsBySide) {
    stats.push(aggregateSideStats(sideName, verdicts))
  }
  return stats
}
