# ADR-20260512002131099: Pre-push semgrep + CI CodeQL split for automated QA gates

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-11 | Created |
| accepted | 2026-05-11 | Accepted |

## 背景

2026-05-11 qa-sweep audit (EPIC-20260511235648324) validated the arena single + qa-sweep deck
workflow: a subagent with 7 security skills scanned 5 core packages and produced 35 actionable
findings. However, the subagent did not invoke the 2 CLI-based skills (codeql, semgrep) — it
relied entirely on LLM code reading.

This raised the question: can we mechanize the mechanical part, so LLM bandwidth is reserved
for the cross-file, business-logic analysis that static tools can't do?

Benchmark data (2026-05-11, M-series Mac, lythoskill monorepo ~293 TypeScript files):

| Tool | Ruleset | Time | Findings |
|------|---------|------|----------|
| semgrep | `p/security-audit` | 5.5s | 0 |
| semgrep | `p/secrets` | 3.2s | 0 |
| semgrep | `p/typescript` | 7.9s | 0 |
| codeql | `security-and-quality` | N/A (CI only) | — |

CodeQL already runs on every push to main via `.github/workflows/codeql.yml`. Installing
and maintaining it locally adds overhead with no marginal gain — the CI run is the gate.

## 决策驱动

- **Pre-push must be fast** — if it takes >15s, agents and humans will skip it
- **CI is the deep gate** — CodeQL already runs there, no need to duplicate locally
- **LLM bandwidth is scarce in CI** — arena subagents cost tokens and time, reserve for what static tools can't do
- **Semgrep catches the mechanical patterns** — empty catch, swallowed errors, insecure defaults — that our qa-sweep audit found by hand

## 选项

### 方案A: Both tools in pre-push (semgrep + codeql local)

**优点**: full coverage before push

**缺点**: codeql install is heavy (~500MB), database creation + analysis is 30-120s, CI
already runs it redundantly. Agents won't maintain codeql installs across sessions.

### 方案B: semgrep pre-push + codeql in CI (split)

**优点**:
- Pre-push: ~10s, zero config, catches pattern-level issues before push
- CI: CodeQL already runs, catches data-flow and taint issues
- LLM (arena + qa-sweep): reserved for cross-file analysis, periodic manual runs
- No local tool maintenance beyond `brew install semgrep`

**缺点**:
- CodeQL findings discovered post-push, not pre-push
- Two places to check results (local semgrep output + CI CodeQL tab)

## 决策

**选择**: 方案B — semgrep pre-push + CodeQL in CI

**原因**:

1. **Fast feedback on the mechanical stuff** — semgrep catches the patterns our audit
   found (empty catch, swallowed errors) in 5-10 seconds. These are the things that
   shouldn't even reach CI.

2. **No duplication** — CodeQL is already in CI. Running it locally too is maintenance
   burden with no additional safety.

3. **Layered defense**:
   ```
   pre-commit: adr-check + test gate + guard-script warning
   pre-push:    semgrep (pattern scan, ~10s)
   CI push:    unit tests + CLI BDD + codeql (deep analysis)
   periodic:   arena single + qa-sweep (LLM cross-file analysis)
   ```

4. **Reserve LLM for what tools can't do** — after mechanizing the mechanical checks,
   arena qa-sweep runs become more valuable because they focus on business logic,
   cross-file invariants, and design-level issues that static tools miss.

## 影响

- 正面:
  - Pre-push catches pattern-level issues before CI, reducing red CI runs
  - LLM bandwidth reserved for high-value analysis
  - Clear separation: tools do patterns, LLM does reasoning

- 负面:
  - Requires `semgrep` on PATH for local development (one-time `brew install semgrep`)
  - CodeQL findings surface post-push (mitigated: CI runs in <2min, gh notification)

- 后续:
  - Add `.husky/pre-push` with `semgrep --config=p/security-audit --config=p/secrets --metrics=off --quiet packages/`
  - Document `brew install semgrep` in AGENTS.md setup section
  - Add `scripts/qa-preflight.ts` for optional manual deep scan
  - CodeQL workflow already exists in `.github/workflows/` — no change needed

## 相关

- 关联 Epic: EPIC-20260511235648324 (qa-sweep empty catch hardening)
- 关联 ADR: ADR-20260424113917838 (red-green-release heredoc — same "mechanize the mechanical" philosophy)
- 参考: `playground/qa-sweep-2026-05-11/` — 35 findings from arena single + qa-sweep
- 参考: qa-sweep skill analysis — 2/7 skills are CLI-based (codeql, semgrep), 5/7 LLM-based
