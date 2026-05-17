# TASK-20260518030349878: Phase 1 — reproduce.sh contract spec

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |

## 背景与目标
7 个 showcase reproduce.sh 遵循涌现约定，无书面 spec。Phase 2-5 依赖稳定契约。约 100 行 markdown 约定文档。

Coverage 映射不需要声明——**文件位置就是映射**（ADR-20260505221432740 co-location）：`packages/<name>/test/scenarios/` → exercises `<name>`。`showcase/` → cross-cutting。

Refs: ADR-20260518024500631, EPIC-20260518024809887

## 需求详情
- [ ] 标准目录布局: `packages/<name>/test/scenarios/<slug>/` 或 `showcase/<date>-bdd-<slug>/`
- [ ] reproduce.sh 契约: exit code (0=PASS, 1=FAIL, 2=SKIP), IoC 标记 (`<spawn subagent>`, `Agent:`, `=== Step N:`)
- [ ] judge.md schema: criteria 表 (id, criterion, weight, how_to_verify), verdict (PASS/PARTIAL/FAIL)
- [ ] decision-log.jsonl: `{"step","decision","reason","ts"}`
- [ ] judge-verdict.json: `{"verdict","criteria":{...},"notes","judged_at"}`
- [ ] Coverage = co-location: package 目录下的 scenario 自动关联该 package。无需 exercises 字段
- [ ] 产出: `references/reproduce-sh-contract.md`

## 技术方案
读取 7 个 showcase reproduce.sh → 提取共性 → 形式化。两个层面：**结构**（布局 + schema）和**行为**（IoC handoff + exit code 语义）。

## 验收标准
- [ ] 契约文档存在并已提交
- [ ] 7 个现有 showcase 符合契约（或有注明偏差）
- [ ] Co-location 约定明确：package 目录 > showcase 目录的优先级

## 关联文件
- 参考: `showcase/*/reproduce.sh` (7 existing)
- 参考: wiki `shell-stdout-as-agent-prompt-injection.md`
- Epic: EPIC-20260518024809887
