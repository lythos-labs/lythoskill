# QA Audit Combo — cold-pool package

## Skills loaded
- `security-advisor`: 安全漏洞审计 (diff-scope, delegates to CLI tools)
- `codeql`: CodeQL 静态分析 (CLI-first, SARIF output)
- `semgrep`: Semgrep 模式扫描 (CLI-first, subagent parallel)
- `differential-review`: 变更审查 (git diff → blast radius)
- `agentic-actions-auditor`: CI/CD workflow 审计
- `code-maturity`: 代码成熟度 9 维度评估
- `entry-point-analyzer`: (skip — Solidity only)

## Target
`packages/lythoskill-cold-pool/src/` — the cold-pool package.

## Combo workflow

Phase 1 (parallel): semgrep + security-advisor
  - semgrep scans for known vulnerability patterns
  - security-advisor reviews the diff for logic flaws

Phase 2: code-maturity assessor
  - 9-dimension maturity assessment of cold-pool codebase

Phase 3: differential-review
  - Review recent git changes for regressions

Phase 4: agentic-actions-auditor
  - Audit .github/workflows/ for AI agent CI/CD risks

Phase 5: task + fix
  - For each finding: create a cortex task (bunx @lythos/project-cortex task "...")
  - Small-scope fixes: extract util / normalize interface → fix site-by-site with type checker
  - Large-scope restructures: invoke lythoskill-red-green-release heredoc (declarative target state)
  - sed -i is never the answer — survey with grep/sed (read-only), fix with proper tools
  - Each task commit references the finding via Closes: TASK-xxx trailer

Phase 6: verify
  - Re-run qa-sweep on changed files — confirm findings are resolved
  - Self-review the fix commits — was the abstraction the right one, or did it just move the problem?
  - If new patterns emerged from the fix, they become new tasks → back to Phase 5

## Output format — JSONL append-only

Write EVERY finding IMMEDIATELY to `findings.jsonl` as you discover it. Do NOT wait until the end.

Each line:
```json
{"severity":"P0|P1|P2","phase":"1|2|3|4","file":"path:line","title":"one-line summary","detail":"explanation","fix":"suggestion","ts":"ISO timestamp"}
```

After ALL findings, write a summary to `report.md`.

After Phase 5, append resolved status to each finding and reference the fix commit.
