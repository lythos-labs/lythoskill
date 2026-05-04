// Agent BDD: NOT for CI — requires `claude` CLI and LLM inference
// This file is intentionally excluded from CI test suites.
// Run locally with: bun test packages/lythoskill-test-utils/test/bdd-runner.agent.test.ts
import { describe, test, expect } from 'bun:test'
import { runClaudeAgent, setupWorkdir } from '../src/bdd-runner'

const hasClaude = !!Bun.which('claude')

describe('runClaudeAgent', () => {
  test.skipIf(!hasClaude)(
    'tracer bullet: brief returns ok and writes at least one checkpoint',
    async () => {
      const cwd = setupWorkdir('/tmp', 'runClaudeAgent-tracer')

      const brief = `Please write a checkpoint file to _checkpoints/test.jsonl containing this exact single-line JSON object and nothing else in that file:
{"step":"test","tool":"echo","args":["ok"],"timestamp":"2026-05-04T00:00:00Z"}
Then reply with exactly the word "ok".`

      const result = await runClaudeAgent({ cwd, brief, timeoutMs: 60000 })

      expect(result.code).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('ok')
      expect(result.checkpoints.length).toBeGreaterThanOrEqual(1)
    },
    35000
  )
})
