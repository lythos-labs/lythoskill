# @lythos/test-utils

Shared test infrastructure for the lythoskill ecosystem. Provides Agent BDD orchestration, Zod schema enforcement, function-calling judge, CLI BDD helpers, and sanitization — all built on the **intent/plan/execute** separation pattern.

## Install

```bash
bun add @lythos/test-utils
```

## Modules

| Module | Import | Purpose |
|--------|--------|---------|
| `agent-bdd` | `@lythos/test-utils/agent-bdd` | `parseAgentMd`, `runAgentScenario` |
| `judge` | `@lythos/test-utils/judge` | `buildJudgePrompt`, `runLLMJudge` (function-calling + Zod) |
| `schema` | `@lythos/test-utils/schema` | 9 Zod schemas: `JudgeVerdict`, `CheckpointEntry`, `AgentScenario`, `ArenaManifest`, `ComparativeReport`, `Player`, `DeckConfig`, `Metrics` |
| `agents` | `@lythos/test-utils/agents` | `useAgent(name)`, `AgentAdapter` interface, Claude adapter |
| `bdd-runner` | `@lythos/test-utils/bdd-runner` | `runClaudeAgent`, `readCheckpoints`, `runCli`, `assertOutput`, `setupWorkdir` |
| `sanitize` | `@lythos/test-utils/sanitize` | `createSanitizer` — replace absolute paths + redact secrets for portable artifacts |

## Quick Start

### Agent BDD

Test that an AI agent correctly executes a task. Uses `.agent.md` scenario files:

```ts
import { runAgentScenario, parseAgentMd } from '@lythos/test-utils/agent-bdd'
import { useAgent } from '@lythos/test-utils/agents'

const result = await runAgentScenario({
  scenarioPath: './test/my-scenario.agent.md',
  agent: useAgent('claude'),
  setupWorkdir(scenario, workdir) {
    // your project-specific setup
  },
})

console.log(result.verdict) // { verdict: 'PASS' | 'FAIL' | 'ERROR', confidence: 85, ... }
```

### CLI BDD

Test CLI commands without agent involvement:

```ts
import { runCli, assertOutput, setupWorkdir } from '@lythos/test-utils/bdd-runner'

const cwd = setupWorkdir('/tmp', 'my-test')
const result = runCli(cwd, ['my-cli', 'subcommand', '--flag'])
const errors = assertOutput(result, {
  exitCode: 0,
  stdoutContains: ['expected output'],
  stderrContains: [],
})
expect(errors).toEqual([])
```

### Judge with function-calling + Zod enforcement

```ts
import { runLLMJudge, buildJudgePrompt } from '@lythos/test-utils/judge'
import { useAgent } from '@lythos/test-utils/agents'

const result = await runLLMJudge(scenario, agentResult, checkpoints, workdir, useAgent('claude'))
// result.verdict is Zod-validated. Failures return { verdict: 'ERROR', error: '<Zod issues>' }
// Includes confidence: 0-100 self-assessment
```

### Zod schemas (distilled from frozen artifacts)

```ts
import { JudgeVerdict, CheckpointEntry, ArenaManifest, ComparativeReport } from '@lythos/test-utils/schema'

// Runtime validation + TypeScript type inference
const verdict = JudgeVerdict.parse(untrustedData)
// verdict: { verdict: 'PASS'|'FAIL'|'ERROR', confidence?: number, criteria: [...], ... }

const manifest = ArenaManifest.parse(arenaJson)
// manifest: { participants: [...], criteria: [...], mode: 'decks'|... }
```

### Sanitization

```ts
import { createSanitizer } from '@lythos/test-utils/sanitize'

const sanitizer = createSanitizer({
  projectRoot: '/path/to/project',
  homeDir: '/home/user',
  workDir: '/tmp/run-123',
})

const portable = sanitizer.sanitize(agentOutput)
// /path/to/project/src → $PROJECT_ROOT/src
// /home/user/.config → $HOME/.config
// gh_xxx → <GH_TOKEN_REDACTED>
```

## Architecture: Intent / Plan / Execute

All modules follow the same separation:

```
intent (DSL)  →  plan (pure data)  →  execute (IO)
.agent.md      →  AgentScenario    →  runAgentScenario
arena.toml     →  ArenaToml        →  runArenaFromToml
deck config    →  RefreshPlan      →  executeRefreshPlan
```

- **Intent**: declarative input (TOML, markdown, Zod schema)
- **Plan**: pure function generates a data structure — unit-testable, dry-run printable
- **Execute**: IO layer with injectable adapters (`AgentAdapter.spawn`, `gitPull`, `delete`, `log`)

## Agent Adapters

```ts
import { useAgent } from '@lythos/test-utils/agents'

const claude = useAgent('claude')     // spawns `claude -p`
// Future: useAgent('kimi'), useAgent('cursor'), useAgent('gemini')

// AgentAdapter interface:
interface AgentAdapter {
  name: string
  spawn(opts: { cwd, brief, timeoutMs, idleTimeoutMs?, env? }): Promise<AgentRunResult>
  invokeTool?(opts: { tool, prompt, cwd, timeoutMs }): Promise<unknown>
}
```

## Test Coverage

| Module | Lines | Funcs | CI | Notes |
|--------|-------|-------|----|-------|
| `schema.ts` | 100% | 100% | ✅ | 23 tests, real fixture round-trip + noise rejection |
| `judge.ts` | 90% | 100% | ✅ | Function-calling + Zod enforcement, retry, ERROR verdict |
| `agent-bdd.ts` | 99% | 100% | ✅ | parseAgentMd + runAgentScenario with mock adapter |
| `agents/index.ts` | 100% | 100% | ✅ | useAgent factory |
| `sanitize.ts` | 90% | 71% | ✅ | Path replacement + secret redaction (19 tests) |
| `bdd-runner.ts` | 45% | 67% | ✅ | Unit tests (readCheckpoints); Agent BDD tracer excluded |
| `agents/claude.ts` | 42% | 40% | ⚠️ | spawn requires `claude` CLI; invokeTool tested via mock |

**Coverage methodology**: Pure logic tested with unit tests (CI). Agent BDD (requires `claude` CLI + LLM inference) uses `test.skipIf(!hasClaude)` and is excluded from CI via `.agent.test.ts` naming convention. No coverage gate — numbers are honest, not inflated.

## License

MIT
