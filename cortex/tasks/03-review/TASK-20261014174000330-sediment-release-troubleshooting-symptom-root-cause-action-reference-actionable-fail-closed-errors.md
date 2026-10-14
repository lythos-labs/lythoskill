# TASK-20261014174000330: sediment release troubleshooting: symptom-root-cause-action reference + actionable fail-closed errors

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-14 | Created |
| in-progress | 2026-10-14 | Started |
| review | 2026-10-14 | Deliverables committed |

## Background & Goals
release/ops 的 failure-mode 排障知识没有沉淀。2026-10-14 发布 v0.20.1 时,verify 步骤 404(实为 npm 副本传播延迟)、dispatch follow-up commit 不落地(根因=已死 pathspec)两个失败模式都靠现场读源码确认原理。owner 指令:把「症状→根因→动作→验证」沉淀成可执行的排障引用,AGENTS.md 至少指向它;让下一个 agent / 外部用户不再「不看源码不敢用」。

## Requirements
- [ ] 新建 `packages/lythoskill-creator/skill/references/release-troubleshooting.md`,按「症状→根因→动作→验证」收录:①verify step 404(传播延迟→rerun 幂等)②dispatch follow-up commit 不落地(0.20.1 已修)③gh run list 抓错 workflow ④bump 不 rebuild skill-only 包 ⑤tag 未触发 release
- [ ] `check-published-manifests.ts` fail-closed 报错改 HATEOAS 风格(告诉人「404 通常是传播延迟,重跑 workflow;>10min 再查 Trusted Publisher」)
- [ ] AGENTS.md §9 + release-auth-workflow.md 指向新文档
- [ ] build --all 让 skills/lythoskill-creator/ 同步新文档

## Technical Approach
纯文档 + 报错文案,不引入新抽象/边界/概念,0/6 C-criteria,无需 ADR。
- 文档放 creator skill 的 references/(随 skills/ 发到外部用户),与 release-auth-workflow.md(快乐路径契约 + 预防性 gotcha)分工:本卡只写 failure-mode 恢复。
- check-published-manifests.ts 的报错从「fails CLOSED」改成「这是可恢复的复制延迟,给你下一步」——guard 仍是 fail-closed,但错误可执行。

## Acceptance Criteria
- [ ] `release-troubleshooting.md` 存在且 ≥5 条,每条都有症状/根因/动作/验证四要素
- [ ] `check-published-manifests.ts` 报错文案含「重跑 workflow」指令
- [ ] AGENTS.md 与 release-auth-workflow.md 各有指向新文档的一行
- [ ] `bun scripts/ci-gate.ts`(或至少 creator + cortex 测试)绿

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261014174000330)

- Detail 1
- Detail 2
```

## Notes
