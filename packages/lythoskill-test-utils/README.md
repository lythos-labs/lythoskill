# @lythos/test-utils

![npm](https://img.shields.io/npm/v/@lythos/test-utils)
![CI](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml/badge.svg)
![License](https://img.shields.io/npm/l/@lythos/test-utils)

> Shared testing utilities for the lythoskill ecosystem. BDD runner substrate, skill fixtures, and path sanitizers.

## Why

As the lythoskill monorepo grows, tests across packages repeat the same scaffolding: spinning up mock skill directories, sanitizing paths in snapshots, and orchestrating agent BDD scenarios. `@lythos/test-utils` centralizes that infrastructure so every package tests against the same substrate.

## Install

```bash
bun add -d @lythos/test-utils
```

## Exports

### `@lythos/test-utils/bdd-runner`

Agent BDD substrate for running sub-agents and collecting checkpoint artifacts.

```typescript
import { runClaudeAgent, readCheckpoints, setupWorkdir } from '@lythos/test-utils/bdd-runner'

const cwd = setupWorkdir('/tmp', 'my-scenario')
const result = await runClaudeAgent({ cwd, brief: 'Write a hello world file', timeoutMs: 30000 })
console.log(result.code, result.checkpoints)
```

> **Note**: `runClaudeAgent` requires the `claude` CLI in PATH and performs live LLM inference. It is intended for local/agent BDD runs, not for CI.

### `@lythos/test-utils/skill-fixtures`

Programmatically create mock skill directories and cold pools for tests.

```typescript
import { createSkillDir, createColdPool } from '@lythos/test-utils/skill-fixtures'

const pool = createColdPool('/tmp/pool', {
  'my-skill': {
    frontmatter: { name: 'my-skill', version: '1.0.0' },
    body: '# My Skill\n\nUsage info here.'
  }
})
```

## License

MIT
