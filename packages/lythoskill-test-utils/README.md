# @lythos/test-utils

![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen) ![CI](https://img.shields.io/badge/CI-78%20unit%20tests-brightgreen) ![Intent/Plan](https://img.shields.io/badge/arch-intent%2Fplan%2Fexecute-8A2BE2) ![LLM Audit](https://img.shields.io/badge/uncovered-LLM%20audited%20%3D%20glue-lightgrey)

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
| `agents` | `@lythos/test-utils/agents` | Re-export of `@lythos/agent-adapter` — `useAgent(name)`, `AgentAdapter` interface |
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

> **Moved to `@lythos/agent-adapter`.** `@lythos/test-utils/agents` is preserved for backward compatibility — it re-exports from the canonical source.

```ts
// Canonical import (recommended)
import { useAgent } from '@lythos/agent-adapter'

// Backward-compatible import
import { useAgent } from '@lythos/test-utils/agents'

const claude = useAgent('claude')     // deprecated: `claude -p` CLI
const kimi = useAgent('kimi')         // recommended: stable headless
const sdk = useAgent('claude-sdk')    // requires `@lythos/agent-adapter-claude-sdk`
```

See [`@lythos/agent-adapter`](https://www.npmjs.com/package/@lythos/agent-adapter) for the plugin architecture and custom adapter registration.

## Test Coverage

| Module | Lines | Funcs | CI | Notes |
|--------|-------|-------|----|-------|
| `schema.ts` | 100% | 100% | ✅ | 23 tests, real fixture round-trip + noise rejection |
| `agent-bdd.ts` | 99% | 100% | ✅ | parseAgentMd + runAgentScenario with mock adapter |
| `agents/index.ts` | 100% | 100% | ✅ | useAgent factory |
| `sanitize.ts` | 100% | 100% | ✅ | Path replacement + secret redaction + restore round-trip |
| `bdd-runner.ts` | 90% | 88% | ✅ | slugifyWorkdirName, assertOutput (8 tests), injectable spawn |
| `agents/claude.ts` | 88% | 75% | ✅ | buildClaudeCommand DSL (7 tests), buildToolPrompt, extractJson |
| `judge.ts` | 90% | 100% | ✅ | Function-calling + Zod enforcement, retry, ERROR verdict |
| **Overall** | **94%** | **91%** | | **78 unit tests** |

All uncovered lines are Bun.spawn glue — type-guarded by TypeScript, correctness enforced by Agent BDD integration.

**Coverage methodology**: Pure logic tested with unit tests (CI). Agent BDD (requires `claude` CLI + LLM inference) uses `test.skipIf(!hasClaude)` and is excluded from CI via `.agent.test.ts` naming convention. No coverage gate — numbers are honest, not inflated.

## License

MIT
