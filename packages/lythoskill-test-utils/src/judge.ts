import { zodToJsonSchema } from 'zod-to-json-schema'
import type { AgentAdapter, AgentRunResult, CheckpointEntry } from './agents/types'
import { JudgeVerdict, type AgentScenario } from './schema'

export { JudgeCriterion, JudgeVerdict } from './schema'

/** Build a judge prompt for function-calling (JSON Schema enforced) */
export function buildJudgePrompt(
  scenario: AgentScenario,
  agentResult: AgentRunResult,
  checkpoints: CheckpointEntry[]
): string {
  return `You are a test judge evaluating whether an AI agent correctly executed a task.

## Task Instructions
${scenario.when}

## Evaluation Criteria
${scenario.judge}

## Output Schema
Your response must conform to this Zod schema:
\`\`\`ts
z.object({
  verdict: z.enum(["PASS", "FAIL", "ERROR"]),
  reason: z.string(),
  confidence: z.number().int().min(0).max(100),
  criteria: z.array(z.object({
    name: z.string(),
    passed: z.boolean(),
    note: z.string(),
  })),
})
\`\`\`
CRITICAL: "criteria" is an ARRAY of objects, NOT a nested object keyed by criterion name.
"reason" is a STRING, not an object.
Do NOT add extra top-level fields for individual criterion scores.

## Confidence Guidelines
Self-assess your judgment confidence on a 0-100 scale:
- 90-100: Evidence is unambiguous, all criteria clearly pass/fail
- 70-89: Evidence is clear but some subjectivity in one criterion
- 50-69: Mixed evidence, reasonable people could disagree
- <50: Insufficient evidence, verdict is speculative

## Evidence

### Agent stdout
${agentResult.stdout}

### Agent stderr
${agentResult.stderr}

### Checkpoints
${JSON.stringify(checkpoints, null, 2)}

## Your Job
Evaluate the agent's execution against the Evaluation Criteria above.
Use the submit_verdict tool to return your structured judgment.`
}

const JUDGE_TOOL = {
  name: 'submit_verdict',
  description: 'Submit a structured judgment: PASS, FAIL, or ERROR with criteria evaluation and confidence score',
  input_schema: zodToJsonSchema(JudgeVerdict) as Record<string, unknown>,
}

/** Normalize LLM output before Zod validation. LLMs sometimes output notes/summary instead of reason. */
function normalizeVerdictJson(parsed: Record<string, unknown>): Record<string, unknown> {
  const out = { ...parsed }
  if (!out.reason && out.notes) {
    out.reason = out.notes
    delete out.notes
  }
  if (!out.reason && out.summary) {
    out.reason = out.summary
    delete out.summary
  }
  if (!out.reason) {
    out.reason = JSON.stringify(out)
  }
  // Convert ad-hoc criteria object (e.g. {correctness: "PASS", completeness: true}) → array
  if (out.criteria && typeof out.criteria === 'object' && !Array.isArray(out.criteria)) {
    const obj = out.criteria as Record<string, unknown>
    out.criteria = Object.entries(obj).map(([k, v]) => ({
      name: k,
      passed: v === true || v === 'PASS' || v === 'pass',
      note: typeof v === 'string' ? v : '',
    }))
  }

  // Convert ad-hoc criteria fields into JudgeCriterion[]
  if (!out.criteria || (Array.isArray(out.criteria) && out.criteria.length === 0)) {
    const SKIP_KEYS = new Set(['verdict', 'reason', 'confidence', 'notes', 'summary', 'criteria', 'error', 'raw_output', 'timestamp', 'scores'])
    const criteria = Object.entries(out)
      .filter(([k, v]) => !SKIP_KEYS.has(k) && (typeof v === 'boolean' || typeof v === 'string'))
      .map(([k, v]) => ({
        name: k,
        passed: typeof v === 'boolean' ? v : true,
        note: typeof v === 'string' ? v.slice(0, 200) : (v ? 'PASS' : 'FAIL'),
      }))
    if (criteria.length > 0) out.criteria = criteria
    // Remove extracted criteria fields from top-level to avoid Zod passthrough bloat
    for (const c of criteria) delete out[c.name]
  }
  return out
}

const MAX_RETRIES = 1

/** Run an LLM judge with Zod schema enforcement + single retry */
export async function runLLMJudge(
  scenario: AgentScenario,
  agentResult: AgentRunResult,
  checkpoints: CheckpointEntry[],
  workdir: string,
  judge: AgentAdapter
): Promise<{ verdict: typeof JudgeVerdict._output | null; raw: string; error?: string }> {
  const prompt = buildJudgePrompt(scenario, agentResult, checkpoints)

  // Prefer function-calling if adapter supports it
  let raw = ''
  let lastError: string | undefined

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let parsed: unknown

      if (judge.invokeTool) {
        // Function-calling path: adapter enforces schema at LLM level
        parsed = await judge.invokeTool({
          tool: JUDGE_TOOL,
          prompt,
          cwd: workdir,
          timeoutMs: 60000,
        })
        raw = JSON.stringify(parsed)
      } else {
        // Fallback: prompt + JSON parse + Zod validate
        const judgeResult = await judge.spawn({
          cwd: workdir,
          brief: `${prompt}\n\nUse the submit_verdict tool.`,
          timeoutMs: 60000,
        })
        raw = judgeResult.stdout

        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim()
        parsed = JSON.parse(jsonStr)
      }

      // Normalize LLM output before Zod validation
      const normalized = normalizeVerdictJson(parsed as Record<string, unknown>)
      const verdict = JudgeVerdict.parse(normalized)
      return { verdict, raw, error: undefined }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      // Retry once on parse/validation failure
      if (attempt < MAX_RETRIES) continue
    }
  }

  // All retries exhausted: return ERROR verdict
  return {
    verdict: {
      verdict: 'ERROR' as const,
      reason: `Judge failed after ${MAX_RETRIES + 1} attempt(s): ${lastError}`,
      criteria: [],
      raw_output: raw,
      error: lastError ?? null,
    },
    raw,
    error: lastError,
  }
}
