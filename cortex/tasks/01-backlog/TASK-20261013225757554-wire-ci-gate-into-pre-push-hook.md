# TASK-20261013225757554: wire ci-gate into pre-push hook

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-13 | Created |

## Background & Goals
ci-gate(scripts/ci-gate.ts,TASK-20261013225251343)目前是"push 前自觉跑"——
行为层 SOP,仍可能跳。本卡把它接进 `.husky/pre-push` 变成机械护栏:
push 之前必跑,红则拒推。plausible slip(忘了跑)用 guard 防,正合
AGENTS.md §2 第 10 条的方向。

## Requirements
- [ ] `.husky/pre-push` 调用 `bun scripts/ci-gate.ts`(或其快速子集:两个 BDD runner + artifacts-sync,unit 已由提交习惯覆盖)
- [ ] 按仓规 QA:qa-sweep deck 跑一轮 + 负测试(构造一个必红状态,证明钩子拒推)
- [ ] push 延迟成本记录进卡(全量 gate ~90s;若太慢,论证子集或 env 跳过开关)

## Technical Approach
改 `.husky/` 属 guard 基础设施,按 AGENTS.md Critical Gotchas:必须用 qa-sweep
deck 做负测试,证明 guard 真能抓住违规。先评估耗时再定全量 vs 子集。

## Acceptance Criteria
- [ ] 负测试:故意制造 BDD fixture 断言失败 → push 被拒并给出可读错误
- [ ] 正路径:干净树 push 不受阻
- [ ] qa-sweep 一轮无 P1 残留

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe.

     ⚠️ A DECISION DOES NOT BELONG IN THIS SECTION. If this card introduces or
     changes an abstraction, a module boundary, a package boundary, a named
     concept, or a closed data set — that is an architectural decision, and it
     must be recorded in an ADR. This section may only REFERENCE that ADR; it
     must never be the only record. A one-line statement of intent gives a
     reviewer nothing to object to: no options to reject, no rejected
     alternative to question. Two same-shape incidents (feed-adapters.ts 2026-05,
     adapter-registry.ts 2026-09) both rode in exactly this section.

     Prepare it first, in full:  bunx @lythos/project-cortex adr "<decision-title>"
     Criteria (hit >= 2 of C1-C6): AGENTS.md § Decision Records -->

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] ⚠️ PLACEHOLDER_CRITERION_1
- [ ] ⚠️ PLACEHOLDER_CRITERION_2

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261013225757554)

- Detail 1
- Detail 2
```

## Notes
