# ADR-20260504200632939: Structured judge schema — Zod-first with function-calling enforcement

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-04 | Created |

## 背景

Current Agent BDD judge pipeline is **prompt natural-language → LLM returns string → best-effort JSON.parse**:

1. `buildJudgePrompt` describes expected JSON shape in English prose
2. `runLLMJudge` calls `claude -p`, regex-extracts JSON from stdout
3. Hand-rolls `if (!verdict.verdict || !['PASS', 'FAIL'].includes(...))` check

Two problems surfaced in production:

- **Noise flows directly into raw_output**: a real run at `runs/agent-bdd/20260504-172449/.../judge-verdict.json` captured `"API Error: The server had an error while processing your request\n"` — non-JSON noise with no schema defense, only discoverable by manually reading raw_output
- **Multiple I/O boundaries lack schemas**: `parseAgentMd` frontmatter, `_checkpoints/*.jsonl` agent self-reported fields, `arena.json` manifest — all zero runtime validation

## 决策驱动

- **Zod**: runtime validation + TypeScript type inference + `zod-to-json-schema` for JSON Schema interop. Single source of truth for types and validation.
- **Function-calling over prompt-then-parse**: LLM returns structured JSON → Zod validates → retry 1× on failure → if both fail, return `verdict: "ERROR"` with raw + zod issues. No more silent null.
- **Schema distilled from frozen artifacts**: every schema anchored on real outputs (`runs/agent-bdd/`, `playground/arena-bdd-research/arena.json`), no invention.
- **Judge confidence self-assessment**: add `confidence: 0-100` field — judge evaluates its own judgment quality, providing signal for arena multi-round statistical aggregation.

## 选项

### Option A: keep prompt + JSON.parse + hand-rolled validation (status quo)

**Pros**: zero new deps, no code changes

**Cons**:
- Noise uncontrollable: "API Error" string flows directly into raw_output, no schema defense
- Validation scattered: `runLLMJudge` hand-rolls verdict check, `parseAgentMd` has no validation
- New consumers (arena) must re-implement identical defensive logic

### Option B: io-ts / typebox / handwritten JSON Schema

**io-ts**: functional style, worse DX, smaller ecosystem
**typebox**: JSON Schema friendly but needs extra tooling for type inference, weaker DX
**handwritten JSON Schema**: no TypeScript types, maintain two definitions

All rejected: DX worse than Zod, zero additional benefit.

### Option C: Zod + function-calling (selected)

**Pros**:
- Zod schema = TS type + runtime validator, single source of truth
- `zod-to-json-schema` converts to LLM tool definition
- Validation failure → `verdict: "ERROR"` + Zod issues, structured observability
- `AgentAdapter.invokeTool` optional method: Claude adapter implements it, others fall back to prompt + Zod
- Does not break T1 interface: `useAgent('claude')` unchanged

**Cons**:
- New `zod` + `zod-to-json-schema` dependencies (~12KB gzipped)
- Judge prompt changes from "return JSON" to "call submit_verdict tool" — test assertions need updating

## 决策

**Choice**: Option C

## 影响

- Positive:
  - All I/O boundaries (judge-verdict.json, checkpoints JSONL, arena.json, parseAgentMd) have runtime validation
  - Parse failures no longer silently return null — they return `verdict: "ERROR"` with full Zod issues and raw_output
  - `AgentAdapter.invokeTool` provides structured judge interface for arena multi-round execution
- Negative:
  - `zod` is a new dependency
  - Deck import paths for `JudgeVerdict` shift from `agent-bdd.ts` to `schema.ts` (re-export kept for backward compat)
- Follow-up:
  - T3: migrate deck/test/runner.ts `runAgentScenario` to unified runner
  - T4: arena consumes `JudgeVerdict` + `ComparativeReport` schemas
  - P2: `Metrics` schema (budget DAG) implemented alongside ADR-20260504172913972

## 相关

- Related ADR: ADR-20260424120936541 (Player schema) — `Player` Zod schema anchored on its draft
- Related ADR: ADR-20260504172913972 (Budget governance) — `Metrics` Zod schema anchored on its draft
- Related Task: TASK-20260504183637828 (T2 implementation)
- Related Task: TASK-20260504183646317 (T3 — deck migration consuming these schemas)
