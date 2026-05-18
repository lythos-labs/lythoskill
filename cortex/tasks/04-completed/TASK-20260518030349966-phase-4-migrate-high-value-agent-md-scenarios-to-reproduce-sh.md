# TASK-20260518030349966: Phase 4 — migrate high-value .agent.md to reproduce.sh

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| in-progress | 2026-05-18 | Started |
| review | 2026-05-18 | Deliverables committed |
| completed | 2026-05-18 | Done |

## 背景与目标
现有 `.agent.md` scenarios（10 个，分布在 deck/arena/curator/test-utils 的 `test/scenarios/`）按需迁移到 reproduce.sh。不强制全量——迁移 Judge 分离或自执行性收益明显的场景。

Co-location 保留：迁移后的 reproduce.sh 放在同一 `packages/<name>/test/scenarios/<slug>/` 目录，与现有 .agent.md 并存。

Refs: ADR-20260518024500631, showcase demo

## 需求详情
- [ ] 盘点现有 10 个 .agent.md scenarios
- [ ] 优先迁移含 `## Judge` section 的场景（judge 分离收益最大）
- [ ] 迁移 3-5 个场景到 reproduce.sh 格式
- [ ] 每个迁移场景: reproduce.sh + judge.md + README.md
- [ ] 零知识 subagent 验证每个迁移
- [ ] 剩余 .agent.md 保留原样

## 技术方案
按 demo 模式：shell scaffold → IoC handoff → judge.md → archive。放在 `packages/<name>/test/scenarios/<slug>/` 而非 showcase/（co-location）。

## 验收标准
- [ ] 3+ scenarios 已迁移并验证
- [ ] 每个迁移有 reproduce.sh + judge.md + README.md
- [ ] 零知识 subagent 可复现每个
- [ ] 现有 .agent.md + parseAgentMd 仍正常

## 关联文件
- 参考: `packages/*/test/scenarios/*.agent.md` (10 files)
- 参考: `showcase/2026-05-18-bdd-reproduce-sh-smoke-test/`
- Epic: EPIC-20260518024809887
