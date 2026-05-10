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

## Output format — JSONL append-only

Write EVERY finding IMMEDIATELY to `findings.jsonl` as you discover it. Do NOT wait until the end.

Each line:
```json
{"severity":"P0|P1|P2","phase":"1|2|3|4","file":"path:line","title":"one-line summary","detail":"explanation","fix":"suggestion","ts":"ISO timestamp"}
```

After ALL findings, write a summary to `report.md`.
