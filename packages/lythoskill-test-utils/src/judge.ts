import type { AgentAdapter, AgentRunResult, CheckpointEntry } from './agents/types'
import type { AgentScenario, JudgeCriterion, JudgeVerdict } from './agent-bdd'

/** Build a structured LLM judge prompt from scenario + agent execution evidence */
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

## Evidence

### Agent stdout
${agentResult.stdout}

### Agent stderr
${agentResult.stderr}

### Checkpoints
${JSON.stringify(checkpoints, null, 2)}

## Your Job
Evaluate the agent's execution against the Evaluation Criteria above.
Return ONLY a JSON object with this exact shape:
{
  "verdict": "PASS" | "FAIL",
  "reason": "One sentence summary of your decision",
  "criteria": [
    {"name": "criterion 1 description", "passed": true, "note": "optional detail"},
    ...
  ]
}

No markdown fences, no commentary outside JSON.`
}

/** Run an LLM judge against agent execution artifacts */
export async function runLLMJudge(
  scenario: AgentScenario,
  agentResult: AgentRunResult,
  checkpoints: CheckpointEntry[],
  workdir: string,
  judge: AgentAdapter
): Promise<{ verdict: JudgeVerdict | null; raw: string; error?: string }> {
  const prompt = buildJudgePrompt(scenario, agentResult, checkpoints)

  const judgeResult = await judge.spawn({
    cwd: workdir,
    brief: prompt,
    timeoutMs: 60000,
  })

  const raw = judgeResult.stdout
  let verdict: JudgeVerdict | null = null
  let error: string | undefined

  try {
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim()
    verdict = JSON.parse(jsonStr) as JudgeVerdict
    if (!verdict.verdict || !['PASS', 'FAIL'].includes(verdict.verdict)) {
      error = `Invalid verdict value: ${JSON.stringify(verdict.verdict)}`
      verdict = null
    }
  } catch (e) {
    error = `Failed to parse judge output as JSON: ${e instanceof Error ? e.message : String(e)}`
  }

  return { verdict, raw, error }
}
