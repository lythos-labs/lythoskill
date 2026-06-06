---
category: reference
domain: arena-operations
since: 2024-05
status: accepted
summary: |
  Arena runtime behavior: timeout mapping per task type, agent CWD quirks,
  judge prompt design, vs/single mode alignment, HATEOAS error patterns.
  Agent-facing errors must include phase + findings + suggestedFixes.
---

# Arena Runtime Behavior

> Reference section — used when debugging arena internals (monthly at most). For everyday arena usage, see the Deck Governance section in AGENTS.md.

## Arena Modes

| Mode | What it does | Use case |
|------|-------------|----------|
| **single** | One skill/deck, one task, one agent run | Quick skill test, single-deck validation |
| **vs** | Two skills/decks run against the same task, outputs compared by a judge agent | A/B comparison, cross-model validation |
| **scaffold** | Legacy: only produces directory structure | Avoid — use `single` instead |

## Timeout Mapping

Different task types need different timeouts. 120s is not universal.

| Task Type | Recommended Timeout | Reason |
|-----------|---------------------|--------|
| Simple coding (single file, clear spec) | 60–120s | Deterministic, agent executes directly |
| Writing + research (needs web search) | 180–300s | Search, reading,构思占大量时间 |
| Writing + research + HTML rendering | 300s+ | Extra tool calls + rendering overhead |
| Multi-step skill pipeline | 300s+ | Each skill adds layer overhead |

**Rule**: `arena.toml` `timeout` field must be set by task type, not default 120s. Arena single uses `--brief "prompt"` (inline) or `--task <scenario.md>`.

## Agent CWD Behavior

**kimi CLI uses shell CWD, not Bun.spawn `cwd` parameter.**

```
Bun.spawn({ cwd: '/tmp/arena-*/' })  ← invalid for kimi
kimi --print --afk                   ← agent Shell tool uses process.cwd()
```

**Consequence**: agent files land in arena launch CWD, not `/tmp/`.

**Fix**: serial runs use `process.chdir(workDir)` before agent start. Each side has independent persistent workdir (`artifactsDir/work/<side>/`).

## vs / single Mode Alignment

| Dimension | single | vs |
|-----------|--------|-----|
| Artifacts | agent-stdout + stderr + judge-verdict + file copy | same (since fix) |
| Artifact dir | `agent-output-<timestamp>/` or `--out` | `runs/<arena-id>/runs/<side>/run-N/` |
| Workdir | `runs/<stamp>/<scenario>/` | `artifactsDir/work/<side>/` |
| Copy logic | `buildCopyPlan` — copies workdir to cellDir, skip `.claude/` + `skill-deck.toml` | must reuse single mode logic |
| Task format | `--brief "prompt"` or `--task <scenario>` with `judge.md` | `arena.toml` declarative config |

## Judge Prompt Design

**Task scenarios define criteria only — verdict format is injected by arena runtime.**

Judge criteria live in `judge.md` (separate from task prompt — prevents self-appeal). Arena injects the JSON verdict schema at runtime.

✅ Good (criteria only in `judge.md`):
```markdown
- concrete_analogy: Uses a relatable analogy beyond "plugin"
- skill_cases: Lists 3-5 real open-source skills with what/who/scenarios
```

**Role boundary**: judge agent must know it's evaluator not executor:
```
You are a TEST JUDGE — not the task executor.
Your ONLY job is to evaluate whether another AI agent correctly completed a task.
```

## Agent-Friendly Error Design (HATEOAS)

Per ADR-20260507014124191. Errors are structured data for agents, not human-readable strings.

```typescript
interface ValidationReport {
  status: 'valid' | 'invalid' | 'ambiguous'
  locator: string
  phase: 'syntax' | 'repo-existence' | 'path-existence' | 'skill-md-existence'
  findings: { parseError?, repoExists?, detectedPaths?: string[] }
  suggestedFixes: Array<{ action, confidence, message, newLocator? }>
}
```

**Rule**: CLI error paths must include `phase` + `findings` + `suggestedFixes`. Pure strings only in `--format=text` human mode.
