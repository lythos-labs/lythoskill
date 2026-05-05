# TESTING.md — Lythoskill Test Conventions

> **For agents onboarding to this project**: read this after `AGENTS.md` to understand where tests live and how to write them.

## File Organization

| Test type | Location | Convention | CI? |
|-----------|----------|-----------|-----|
| **Unit** | `src/*.test.ts` (co-located with source) | `bun:test`, `describe`/`it`/`expect` | ✅ |
| **CLI BDD** | `test/runner.ts` + `test/scenarios/` | Custom BDD runner, `*.scenario.ts` | ✅ |
| **Agent BDD** | `test/scenarios/*.agent.md` | LLM-driven, `parseAgentMd` / `runAgentScenario` | ❌ (`skipIf`) |

### Unit tests — co-located in `src/`

```
packages/<name>/src/
├── foo.ts
├── foo.test.ts      ← unit test, next to source
├── bar.ts
└── bar.test.ts
```

- Test files use `*.test.ts` suffix (Bun default discovery).
- Import from `./` (same directory) — short, clean paths.
- Pure functions: test directly. Functions with IO: inject mock via documented IO interface.
- **Never** spy on low-level functions (`execSync`, `child_process`) when the package provides an IO injection interface. Use the documented IO interface.
- Follow the Intent/Plan/Execute pattern: test `buildXPlan` + `executeXPlan(mockIO)`, not the CLI wrapper.

### CLI BDD — `test/` directory

```
packages/<name>/test/
├── runner.ts         ← BDD entry point
├── scenarios/        ← BDD scenario files
└── fixtures/         ← mock data, temp dir helpers
```

- Custom lightweight runner — no Cucumber, no Vitest, no plugin layer.
- Agent-readable: Given/When/Then in plain TypeScript.
- Runner supports `--parallel N`, `--output <dir>`, `--timeout <ms>`.

### Agent BDD — `test/scenarios/*.agent.md`

```
packages/<name>/test/scenarios/
└── my-feature.agent.md
```

- `*.agent.md` format: YAML frontmatter + `## Given` + `## When` + optional `## Judge`.
- Requires LLM — skipped in CI via `skipIf(!process.env.CI)`.
- Validated by `parseAgentMd` from `@lythos/test-utils`.

## Running Tests

```bash
# All tests (unit + BDD)
bun run test:all

# Specific package — unit tests
bun test packages/lythos-deck/src/

# Specific package — BDD tests
bun packages/lythos-deck/test/runner.ts

# Test report — capture to file for traceability
bun scripts/test-report.ts
# → test-results/<date>-<hash>.txt

# Single file
bun test packages/lythos-test-utils/src/sanitize.test.ts
```

## Configuration

```toml
# bunfig.toml (repo root)
[test]
coverage = true
```

All `bun test` commands produce coverage output. Bun's coverage instrumentation has a known issue where exit code may be 1 even with all tests passing. CI handles this with `|| true` on coverage-specific steps.

## Writing Tests

### IO injection (mandatory for functions with side effects)

```typescript
// ❌ Wrong: spy on low-level module
import * as childProcess from 'node:child_process'
spyOn(childProcess, 'execSync').mockImplementation(...)

// ✅ Correct: inject through documented IO interface
executeRefreshPlan(plan, {
  gitPull: () => ({ status: 'up-to-date', message: 'ok' }),
  log: (msg) => logs.push(msg),
  linkDeck: () => { linkCalled = true },
})
```

The IO injection table for each package is documented in `AGENTS.md` → Architecture: Intent / Plan / Execute → The IO injection table.

### Test structure

```typescript
import { describe, it, expect } from 'bun:test'

describe('functionName', () => {
  it('does X when Y', () => {
    const result = functionName(input)
    expect(result).toBe(expected)
  })
})
```

## CI Pipeline

`.github/workflows/test.yml` runs on every push to `main`:

| Job | What | Exit handling |
|-----|------|--------------|
| `test` | All unit tests + BDD runners | `continue-on-error: true` on curator |
| `coverage-deck` | Deck unit tests + lcov | `\|\| true` on coverage step |
| `coverage-test-utils` | Test-utils unit tests + lcov | `\|\| true` on coverage step |

Artifacts: `test-results/` uploaded as `test-report` on every push (via `scripts/test-report.ts`).

## Related

- ADR-20260505221432740 (test file co-location standard)
- [AGENTS.md](./AGENTS.md) → Architecture: Intent / Plan / Execute
- [Bun test docs](https://bun.com/docs/test/discovery)
