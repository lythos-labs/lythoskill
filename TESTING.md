# TESTING.md — Lythoskill Test Conventions

> **For agents onboarding to this project**: read this after `AGENTS.md` to understand where tests live and how to write them.

## File Organization

| Test type | Location | Convention | CI? |
|-----------|----------|-----------|-----|
| **Unit** | `src/*.test.ts` (co-located with source) | `bun:test`, `describe`/`it`/`expect` | ✅ |
| **Plan-mode** | `src/*.test.ts` (same file as unit) | Build plan → verify command shape → compare to reference. No IO. | ✅ |
| **CLI BDD** | `test/runner.ts` + `test/scenarios/` | Custom BDD runner, `*.scenario.ts` | ✅ |
| **Agent BDD** | `test/scenarios/*-bdd/reproduce.sh` | Shell scaffold + IoC handoff + judge.md. LLM-required, selective. | ❌ |

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

### Plan-mode — command verification (integration without IO)

```
packages/<name>/src/
├── refresh-plan.ts
└── refresh-plan.test.ts  ← plan-mode tests alongside unit tests
```

- Tests the plan/command, NOT the execution side effect.
- Pattern: `buildXPlan(input)` → verify plan shape matches expected commands.
- Verifies "if we executed, we would do the right thing."
- No IO, no mocks needed — plan functions are pure.
- Runs in CI (same `bun test` pass as unit tests).
- Examples: `buildRefreshPlan` → verify gitRoot correct. `buildReconcilePlan` → verify missing/behind/extra classification.

### Agent BDD — `test/scenarios/*-bdd/reproduce.sh`

```
packages/<name>/test/scenarios/<slug>-bdd/
├── reproduce.sh          # shell scaffold + IoC handoff
├── judge.md              # criteria (task agent never sees)
├── decision-log.jsonl    # agent reasoning trace
└── judge-verdict.json    # structured verdict
```

- Shell handles deterministic setup (Steps 1-2), agent handles reasoning (Step 3 via IoC handoff), shell handles teardown (Steps 4-5).
- Requires LLM — not run in CI. Selective: only rerun when related code changes (change-impact probe).
- Judge criteria separated from task prompt (ADR-20260518024500631, ADR-20260514050300).
- Co-located with package: `packages/<name>/test/scenarios/` → exercises `<name>`.
- Legacy `*.agent.md` format still supported via parseAgentMd (coexist, not replaced).

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

### Plan-mode test pattern

```typescript
// ✅ Plan-mode: verify command correctness, no IO
import { buildRefreshPlan } from './refresh-plan'

test('plan-mode: git skill maps to correct gitRoot', () => {
  const plan = buildRefreshPlan(deckToml, { coldPool: '/pool' })
  const gitTarget = plan.targets.find(t => t.type === 'git')
  expect(gitTarget!.gitRoot).toBe('/pool/github.com/foo/bar')
})

test('plan-mode: localhost skill has no gitRoot', () => {
  const plan = buildRefreshPlan(deckToml, { coldPool: '/pool' })
  const local = plan.targets.find(t => t.alias === 'skill-b')
  expect(local!.type).toBe('localhost')
  expect(local!.gitRoot).toBeUndefined()
})
```

Plan-mode tests verify that given specific inputs, the plan produces the correct commands/actions. They never execute side effects (git clone, symlink, rm). This makes them CI-safe and fast.

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
